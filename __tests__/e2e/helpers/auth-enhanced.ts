import { NextRequest } from 'next/server';
import { createTestUser, createTestSession, type TestUser } from './auth';
import { queryOne } from '@/lib/db';

/**
 * Enhanced authentication utilities that build upon the existing auth.ts helpers.
 * These provide convenience methods for common testing patterns.
 */

export type RoleName = 'superadmin' | 'admin' | 'operator' | 'viewer';

// Role ID mapping
export const ROLE_IDS: Record<RoleName, number> = {
  superadmin: 1,
  admin: 2,
  operator: 3,
  viewer: 4
};

/**
 * Create a test user with a specific role.
 * Convenience wrapper around createTestUser with role mapping.
 */
export async function createTestUserForRole(
  roleName: RoleName,
  overrides?: Partial<TestUser>
): Promise<TestUser> {
  return createTestUser({
    roleId: ROLE_IDS[roleName],
    username: `test_${roleName}_${Date.now()}`,
    email: `test_${roleName}_${Date.now()}@example.com`,
    ...overrides
  });
}

/**
 * Create users for all role types in a single call.
 * Returns an object mapping role names to user objects with sessions.
 */
export async function createUsersForAllRoles(): Promise<Record<RoleName, TestUser & { sessionToken: string }>> {
  const users: Record<string, TestUser & { sessionToken: string }> = {};

  for (const roleName of Object.keys(ROLE_IDS) as RoleName[]) {
    const user = await createTestUserForRole(roleName);
    const sessionToken = await createTestSession(user.id);
    users[roleName] = { ...user, sessionToken };
  }

  return users as Record<RoleName, TestUser & { sessionToken: string }>;
}

/**
 * Create an authenticated request with full control over method, body, and user.
 */
export async function createRequestWithAuth(
  url: string,
  method: string = 'GET',
  user?: TestUser,
  body?: unknown
): Promise<NextRequest> {
  // If no user provided, create a default admin user
  const testUser = user || await createTestUserForRole('admin');
  const sessionToken = await createTestSession(testUser.id);

  const headers: HeadersInit = {
    Cookie: `session=${sessionToken}`
  };

  // Add content-type for requests with body
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const request = new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  // Attach user to request for testing purposes
  (request as any).user = testUser;

  return request;
}

/**
 * Create a request without authentication (for testing 401 responses).
 */
export function createUnauthenticatedRequest(
  url: string,
  method: string = 'GET',
  body?: unknown
): NextRequest {
  const headers: HeadersInit = {};

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

/**
 * Test an endpoint across all roles to verify permission enforcement.
 *
 * @param url - The API endpoint URL
 * @param method - HTTP method (GET, POST, PATCH, DELETE)
 * @param expectedAccess - Object mapping role names to expected access (true = allowed, false = forbidden)
 * @param body - Optional request body for POST/PATCH requests
 *
 * @returns Object with test results for each role
 *
 * @example
 * const results = await testPermissionsAcrossRoles(
 *   'http://localhost:3000/api/users',
 *   'GET',
 *   { superadmin: true, admin: true, operator: false, viewer: false }
 * );
 */
export async function testPermissionsAcrossRoles(
  url: string,
  method: string,
  expectedAccess: Record<RoleName, boolean>,
  body?: unknown
): Promise<Record<RoleName, { status: number; allowed: boolean; expected: boolean }>> {
  const results: Record<RoleName, { status: number; allowed: boolean; expected: boolean }> = {} as any;

  for (const roleName of Object.keys(expectedAccess) as RoleName[]) {
    const user = await createTestUserForRole(roleName);
    const sessionToken = await createTestSession(user.id);

    const headers: HeadersInit = {
      Cookie: `session=${sessionToken}`
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const request = new NextRequest(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    // Fetch the actual response
    const response = await fetch(request);

    const allowed = response.status !== 401 && response.status !== 403;
    const expected = expectedAccess[roleName];

    results[roleName] = {
      status: response.status,
      allowed,
      expected
    };
  }

  return results;
}

/**
 * Create multiple test users with the same role (for pagination/filtering tests).
 */
export async function createTestUsersForRole(
  roleName: RoleName,
  count: number
): Promise<TestUser[]> {
  const users: TestUser[] = [];

  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      username: `test_${roleName}_${Date.now()}_${i}`,
      email: `test_${roleName}_${Date.now()}_${i}@example.com`,
      roleId: ROLE_IDS[roleName]
    });
    users.push(user);
  }

  return users;
}

/**
 * Get a user's role name from their role ID.
 */
export async function getUserRoleName(userId: string): Promise<RoleName | null> {
  const result = await queryOne<{ roleName: string }>(`
    SELECT r.name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = $1
  `, [userId]);

  if (!result) return null;

  // Map database role names to test role names
  const roleMap: Record<string, RoleName> = {
    'superadmin': 'superadmin',
    'admin': 'admin',
    'operator': 'operator',
    'viewer': 'viewer'
  };

  return roleMap[result.roleName] || null;
}

/**
 * Batch create test users with specific roles and return them with active sessions.
 */
export async function createTestUserBatch(
  users: Array<{ roleName: RoleName; overrides?: Partial<TestUser> }>
): Promise<Array<TestUser & { sessionToken: string }>> {
  const createdUsers: Array<TestUser & { sessionToken: string }> = [];

  for (const { roleName, overrides } of users) {
    const user = await createTestUserForRole(roleName, overrides);
    const sessionToken = await createTestSession(user.id);
    createdUsers.push({ ...user, sessionToken });
  }

  return createdUsers;
}
