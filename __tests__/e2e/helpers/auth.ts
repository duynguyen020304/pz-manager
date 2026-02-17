import { vi } from 'vitest';
import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { createSession, setSessionCookie, getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import type { UserWithRole } from '@/types';

export interface TestUser {
  id: string;
  username: string;
  password: string;
  email: string;
  roleId: number;
  isActive: boolean;
}

// Create a test user in the database
export async function createTestUser(userData: Partial<TestUser> = {}): Promise<TestUser & { password_hash: string }> {
  const defaultUser: TestUser = {
    username: `testuser_${Date.now()}`,
    password: 'testpassword123',
    email: `test_${Date.now()}@example.com`,
    roleId: 4, // viewer role by default
    isActive: true,
    ...userData
  };

  const passwordHash = await bcrypt.hash(defaultUser.password, 10);
  
  const result = await queryOne<{ id: string }>(`
    INSERT INTO users (username, email, password_hash, role_id, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [defaultUser.username, defaultUser.email, passwordHash, defaultUser.roleId, defaultUser.isActive]);

  if (!result) {
    throw new Error('Failed to create test user');
  }

  return {
    ...defaultUser,
    id: result.id,
    password_hash: passwordHash
  };
}

// Create a session for a user and return the token
export async function createTestSession(userId: string): Promise<string> {
  const row = await queryOne<{ token: string }>(`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES ($1, $2, NOW() + INTERVAL '24 hours')
    RETURNING token
  `, [userId, `test-token-${Date.now()}-${Math.random().toString(36).substring(2)}`]);

  if (!row) {
    throw new Error('Failed to create test session');
  }

  return row.token;
}

// Create authenticated request with session cookie
export async function createAuthenticatedRequest(
  url: string,
  options: RequestInit = {},
  role: 'superadmin' | 'admin' | 'operator' | 'viewer' = 'admin'
): Promise<NextRequest> {
  // Map role names to role IDs
  const roleMap = {
    superadmin: 1,
    admin: 2,
    operator: 3,
    viewer: 4
  };

  // Create test user with specified role
  const user = await createTestUser({
    username: `test_${role}_${Date.now()}`,
    roleId: roleMap[role]
  });

  // Create session
  const sessionToken = await createTestSession(user.id);

  // Create request with session cookie
  const request = new NextRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      Cookie: `session=${sessionToken}`
    }
  });

  return request;
}

// Mock authenticated request for direct handler testing
export function mockAuthenticatedRequest(
  url: string,
  options: RequestInit = {},
  sessionToken: string = 'test-token'
): NextRequest {
  return new NextRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      Cookie: `session=${sessionToken}`
    }
  });
}

// Get user with role for permission testing
export async function getTestUserWithRole(username: string): Promise<UserWithRole | null> {
  return await queryOne<UserWithRole>(`
    SELECT 
      u.id,
      u.username,
      u.email,
      u.password_hash,
      u.is_active,
      u.created_at,
      u.updated_at,
      u.last_login,
      u.role_id,
      json_build_object(
        'id', r.id,
        'name', r.name,
        'permissions', r.permissions,
        'isSystem', r.is_system,
        'createdAt', r.created_at,
        'updatedAt', r.updated_at
      ) as role
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.username = $1
  `, [username]);
}

// Create users for each role type
export async function createUsersForAllRoles(): Promise<Record<string, TestUser & { sessionToken: string }>> {
  const users: Record<string, TestUser & { sessionToken: string }> = {};

  // Superadmin (role_id: 1)
  const superadmin = await createTestUser({
    username: `superadmin_${Date.now()}`,
    password: 'superadmin123',
    email: 'superadmin@test.com',
    roleId: 1
  });
  users.superadmin = { ...superadmin, sessionToken: await createTestSession(superadmin.id) };

  // Admin (role_id: 2)
  const admin = await createTestUser({
    username: `admin_${Date.now()}`,
    password: 'admin123',
    email: 'admin@test.com',
    roleId: 2
  });
  users.admin = { ...admin, sessionToken: await createTestSession(admin.id) };

  // Operator (role_id: 3)
  const operator = await createTestUser({
    username: `operator_${Date.now()}`,
    password: 'operator123',
    email: 'operator@test.com',
    roleId: 3
  });
  users.operator = { ...operator, sessionToken: await createTestSession(operator.id) };

  // Viewer (role_id: 4)
  const viewer = await createTestUser({
    username: `viewer_${Date.now()}`,
    password: 'viewer123',
    email: 'viewer@test.com',
    roleId: 4
  });
  users.viewer = { ...viewer, sessionToken: await createTestSession(viewer.id) };

  return users;
}

// Cleanup test users
export async function cleanupTestUsers(): Promise<void> {
  // First delete sessions
  await query(`
    DELETE FROM sessions 
    WHERE user_id IN (
      SELECT id FROM users WHERE username LIKE 'test_%' OR username LIKE 'superadmin_%' OR username LIKE 'admin_%' OR username LIKE 'operator_%' OR username LIKE 'viewer_%'
    )
  `);

  // Then delete users
  await query(`
    DELETE FROM users 
    WHERE username LIKE 'test_%' OR username LIKE 'superadmin_%' OR username LIKE 'admin_%' OR username LIKE 'operator_%' OR username LIKE 'viewer_%'
  `);
}
