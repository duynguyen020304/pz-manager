import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // Redirect authenticated users away from login page
  if (pathname === '/' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Allow public routes
  if (pathname === '/' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Check authentication for all other routes
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
