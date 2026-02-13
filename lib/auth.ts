import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { query, queryOne } from './db';
import { verifyPassword, getUserByUsernameWithRole, updateLastLogin } from './user-manager';
import type { UserWithRole, Session } from '@/types';

const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_DURATION = 60 * 60 * 24; // 24 hours in seconds

// ============================================
// PASSWORD HASHING
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<Session> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

  const row = await queryOne<{
    id: string;
    user_id: number;
    token: string;
    expires_at: Date;
    created_at: Date;
    ip_address: string | null;
    user_agent: string | null;
  }>(
    `INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, token, expiresAt, ipAddress || null, userAgent || null]
  );

  if (!row) {
    throw new Error('Failed to create session');
  }

  // Update last login timestamp
  await updateLastLogin(userId);

  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
  };
}

/**
 * Generate a secure session token
 */
function generateSessionToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  const secret = SESSION_SECRET || 'default-secret';
  
  // Create a simple hash of the components
  const data = `${timestamp}-${random}-${secret}`;
  return Buffer.from(data).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Get session by token
 */
export async function getSessionByToken(token: string): Promise<Session | null> {
  const row = await queryOne<{
    id: string;
    user_id: number;
    token: string;
    expires_at: Date;
    created_at: Date;
    ip_address: string | null;
    user_agent: string | null;
  }>(
    `SELECT * FROM sessions 
     WHERE token = $1 AND expires_at > NOW()`,
    [token]
  );

  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
  };
}

/**
 * Get session with user details
 */
export async function getSessionWithUser(
  token: string
): Promise<(Session & { user: UserWithRole }) | null> {
  const session = await getSessionByToken(token);
  if (!session) return null;

  const user = await getUserByUsernameWithRole(session.userId.toString());
  if (!user || !user.isActive) return null;

  return { ...session, user };
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  await query('DELETE FROM sessions WHERE token = $1', [token]);
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: number): Promise<void> {
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await query<{ cleanup_expired_sessions: number }>('SELECT cleanup_expired_sessions()');
  return result[0]?.cleanup_expired_sessions || 0;
}

// ============================================
// COOKIE MANAGEMENT
// ============================================

export async function setSessionCookie(sessionToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DURATION,
    path: '/'
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('session')?.value || null;
}

// ============================================
// AUTHENTICATION CHECKS
// ============================================

/**
 * Check if request is authenticated
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('session')?.value;
  if (!token) return false;

  const session = await getSessionByToken(token);
  return session !== null;
}

/**
 * Get current user from request
 */
export async function getCurrentUser(
  request: NextRequest
): Promise<UserWithRole | null> {
  const token = request.cookies.get('session')?.value;
  if (!token) return null;

  const sessionWithUser = await getSessionWithUser(token);
  return sessionWithUser?.user || null;
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<UserWithRole> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Check if user has permission
 */
export async function checkPermission(
  user: UserWithRole,
  resource: string,
  action: string
): Promise<boolean> {
  // Superadmin has all permissions
  if (user.role?.name === 'superadmin' || user.roleId === 1) {
    return true;
  }

  if (!user.role) return false;

  const permissions = user.role.permissions;
  
  // Check wildcard resource permission
  if (permissions['*']) {
    const wildcardActions = permissions['*'];
    if (wildcardActions.includes('*') || wildcardActions.includes(action)) {
      return true;
    }
  }

  // Check specific resource permission
  const actions = permissions[resource];
  if (!actions) return false;

  return actions.includes(action);
}

// ============================================
// LOGIN / LOGOUT
// ============================================

export interface LoginResult {
  success: boolean;
  user?: UserWithRole;
  sessionToken?: string;
  error?: string;
}

/**
 * Authenticate user with username and password
 */
export async function login(
  username: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResult> {
  // Find user
  const user = await getUserByUsernameWithRole(username);
  if (!user) {
    return { success: false, error: 'Invalid username or password' };
  }

  // Check if user is active
  if (!user.isActive) {
    return { success: false, error: 'Account is disabled' };
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password_hash || '');
  if (!isValid) {
    return { success: false, error: 'Invalid username or password' };
  }

  // Create session
  const session = await createSession(user.id, ipAddress, userAgent);

  return {
    success: true,
    user,
    sessionToken: session.token,
  };
}

/**
 * Logout user
 */
export async function logout(token?: string): Promise<void> {
  if (token) {
    await deleteSession(token);
  }
  await clearSessionCookie();
}
