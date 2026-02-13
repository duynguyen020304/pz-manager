import { NextRequest, NextResponse } from 'next/server';
import { login, setSessionCookie, clearSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Require username
    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    // Get client info for audit logging
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Database authentication
    const result = await login(username, password, ipAddress, userAgent);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    // Set session cookie
    if (result.sessionToken) {
      await setSessionCookie(result.sessionToken);
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Login successful',
        user: result.user ? {
          id: result.user.id,
          username: result.user.username,
          role: result.user.role?.name
        } : null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      data: { message: 'Logout successful' }
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
