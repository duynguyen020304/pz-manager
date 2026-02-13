import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie, getSessionWithUser, deleteSession } from '@/lib/auth';

export async function GET(_request: NextRequest) {  // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    const token = await getSessionCookie();
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const session = await getSessionWithUser(token);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: session.user.id,
          username: session.user.username,
          email: session.user.email,
          role: session.user.role,
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Failed to get current session:', error);
    const message = error instanceof Error ? error.message : 'Failed to get session';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest) {  // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    const token = await getSessionCookie();
    
    if (token) {
      await deleteSession(token);
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    console.error('Failed to logout:', error);
    const message = error instanceof Error ? error.message : 'Failed to logout';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
