import { APIRequestContext, APIResponse } from '@playwright/test';
import { query, queryOne } from '@/lib/db';
import bcrypt from 'bcryptjs';

export interface TestUser {
  id: string;
  username: string;
  password: string;
  email: string;
  roleId: number;
  isActive: boolean;
  sessionToken?: string;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
  const defaultUser: TestUser = {
    username: `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}`,
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
    id: result.id
  };
}

/**
 * Create a session for a user and return the token
 */
export async function createTestSession(userId: string): Promise<string> {
  const row = await queryOne<{ token: string }>(`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES ($1, $2, NOW() + INTERVAL '24 hours')
    RETURNING token
  `, [userId, `test-token-${Date.now()}-${Math.random().toString(36).substring(7)}`]);

  if (!row) {
    throw new Error('Failed to create test session');
  }

  return row.token;
}

/**
 * Create users for all role types
 */
export async function createUsersForAllRoles(): Promise<Record<string, TestUser & { sessionToken: string }>> {
  const users: Record<string, TestUser & { sessionToken: string }> = {};

  const roleIds: Record<string, number> = {
    superadmin: 1,
    admin: 2,
    operator: 3,
    viewer: 4
  };

  for (const [roleName, roleId] of Object.entries(roleIds)) {
    const user = await createTestUser({
      username: `test_${roleName}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      password: `${roleName}123`,
      email: `${roleName}_${Date.now()}@test.com`,
      roleId
    });

    const sessionToken = await createTestSession(user.id);
    users[roleName] = { ...user, sessionToken };
  }

  return users as Record<string, TestUser & { sessionToken: string }>;
}

/**
 * Login and return session cookie
 */
export async function login(request: APIRequestContext, username: string, password: string): Promise<string> {
  const response = await request.post('/api/auth', {
    data: { username, password }
  });

  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()}`);
  }

  const data = await response.json();
  return data.data?.sessionToken || data.sessionToken;
}

/**
 * Create authenticated request context with session cookie
 */
export async function createAuthenticatedRequest(
  request: APIRequestContext,
  sessionToken: string
): Promise<void> {
  // Set the session cookie for subsequent requests
  await request.post('/api/auth', {
    headers: {
      Cookie: `session=${sessionToken}`
    }
  });
}

/**
 * Cleanup test users
 */
export async function cleanupTestUsers(): Promise<void> {
  await query(`
    DELETE FROM sessions
    WHERE user_id IN (
      SELECT id FROM users WHERE username LIKE 'test_%'
    )
  `);

  await query(`
    DELETE FROM users
    WHERE username LIKE 'test_%'
  `);
}

/**
 * Cleanup all test data
 */
export async function cleanupTestData(): Promise<void> {
  try {
    await query(`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'test_%')`);
    await query(`DELETE FROM users WHERE username LIKE 'test_%'`);
    await query(`DELETE FROM roles WHERE is_system = false AND name LIKE 'test_%'`);
  } catch (error) {
    // Ignore errors for missing tables in test database
  }
}
