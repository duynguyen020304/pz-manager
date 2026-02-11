import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-change-this';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!ADMIN_PASSWORD_HASH) {
    console.error('ADMIN_PASSWORD_HASH not set');
    return false;
  }
  
  return verifyPassword(password, ADMIN_PASSWORD_HASH);
}

export function createSession(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `${timestamp}-${random}`;
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/'
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('session')?.value || null;
}

export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const session = request.cookies.get('session')?.value;
  return !!session;
}

export async function requireAuth(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}
