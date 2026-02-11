import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword, createSession, setSessionCookie, clearSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }
    
    const isValid = await verifyAdminPassword(password);
    
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }
    
    const sessionId = createSession();
    await setSessionCookie(sessionId);
    
    return NextResponse.json({
      success: true,
      data: { message: 'Login successful' }
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
