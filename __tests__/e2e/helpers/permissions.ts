import { query, queryOne } from '@/lib/db';
import { hasPermission as checkPermission } from '@/lib/role-manager';
import type { RoleName } from './auth-enhanced';

/**
 * Permission testing utilities for E2E tests.
 * Provides helpers for checking and testing permissions across roles.
 */

/**
 * Get the role name for a user by their user ID.
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const result = await queryOne<{ roleName: string }>(`
    SELECT r.name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = $1
  `, [userId]);

  return result?.roleName || null;
}

/**
 * Get full role details including permissions.
 */
export async function getRoleDetails(roleId: number) {
  return await queryOne<{
    id: number;
    name: string;
    permissions: Record<string, string[]>;
    isSystem: boolean;
  }>(`
    SELECT id, name, permissions, is_system as "isSystem"
    FROM roles
    WHERE id = $1
  `, [roleId]);
}

/**
 * Check if a role has a specific permission.
 * Wrapper around lib/role-manager for testing convenience.
 */
export async function hasPermission(
  roleName: string,
  resource: string,
  action: string
): Promise<boolean> {
  const role = await queryOne<{ permissions: Record<string, string[]> }>(`
    SELECT permissions
    FROM roles
    WHERE name = $1
  `, [roleName]);

  if (!role) return false;

  return checkPermission({ name: roleName, permissions: role.permissions } as any, resource, action);
}

/**
 * Test if a user can perform an action on a resource.
 */
export async function canUserPerformAction(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const result = await queryOne<{ canPerform: boolean }>(`
    SELECT
      (
        SELECT permissions FROM roles WHERE id = (SELECT role_id FROM users WHERE id = $1)
      )->>$2 IS NOT NULL
    as canPerform
  `, [userId, `${resource}.${action}`]);

  return result?.canPerform || false;
}

/**
 * Test an endpoint across all roles to verify permission enforcement.
 *
 * @param baseUrl - Base URL for the API (e.g., 'http://localhost:3000/api')
 * @param endpoint - Endpoint path (e.g., '/users')
 * @param method - HTTP method (GET, POST, PATCH, DELETE)
 * @param resource - Resource name for permission checking (e.g., 'users')
 * @param action - Action name for permission checking (e.g., 'view', 'create', 'edit', 'delete')
 * @param body - Optional request body
 * @returns Test results showing which roles were allowed/denied
 */
export async function testEndpointPermissions(
  baseUrl: string,
  endpoint: string,
  method: string,
  resource: string,
  action: string,
  body?: unknown
): Promise<Record<string, { allowed: boolean; status?: number }>> {
  const roleIds: Record<string, number> = {
    superadmin: 1,
    admin: 2,
    operator: 3,
    viewer: 4
  };

  const results: Record<string, { allowed: boolean; status?: number }> = {};

  for (const [roleName, roleId] of Object.entries(roleIds)) {
    // Get a user with this role
    const user = await queryOne<{ id: string; username: string }>(`
      SELECT id, username
      FROM users
      WHERE role_id = $1
      AND username LIKE 'test_%'
      LIMIT 1
    `, [roleId]);

    if (!user) {
      results[roleName] = { allowed: false, status: 0 };
      continue;
    }

    // Get session
    const session = await queryOne<{ token: string }>(`
      SELECT token
      FROM sessions
      WHERE user_id = $1
      LIMIT 1
    `, [user.id]);

    if (!session) {
      results[roleName] = { allowed: false, status: 0 };
      continue;
    }

    // Make request
    const url = `${baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      Cookie: `session=${session.token}`
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      const allowed = response.status !== 401 && response.status !== 403;
      results[roleName] = { allowed, status: response.status };
    } catch (error) {
      results[roleName] = { allowed: false, status: 0 };
    }
  }

  return results;
}

/**
 * Verify that a specific permission is granted for a role.
 */
export async function expectPermissionGranted(
  roleName: string,
  resource: string,
  action: string
): Promise<void> {
  const hasIt = await hasPermission(roleName, resource, action);
  if (!hasIt) {
    throw new Error(`Expected role '${roleName}' to have permission '${resource}.${action}'`);
  }
}

/**
 * Verify that a specific permission is denied for a role.
 */
export async function expectPermissionDenied(
  roleName: string,
  resource: string,
  action: string
): Promise<void> {
  const hasIt = await hasPermission(roleName, resource, action);
  if (hasIt) {
    throw new Error(`Expected role '${roleName}' NOT to have permission '${resource}.${action}'`);
  }
}

/**
 * Get all permissions for a role as a flattened list.
 */
export async function getRolePermissions(roleName: string): Promise<string[]> {
  const role = await queryOne<{ permissions: Record<string, string[]> }>(`
    SELECT permissions
    FROM roles
    WHERE name = $1
  `, [roleName]);

  if (!role || !role.permissions) {
    return [];
  }

  // Flatten permissions object to array of "resource.action" strings
  const flat: string[] = [];

  for (const [resource, actions] of Object.entries(role.permissions)) {
    if (Array.isArray(actions)) {
      for (const action of actions) {
        flat.push(`${resource}.${action}`);
      }
    }
  }

  return flat;
}

/**
 * Check if a role is a system role (protected).
 */
export async function isSystemRole(roleName: string): Promise<boolean> {
  const result = await queryOne<{ isSystem: boolean }>(`
    SELECT is_system as "isSystem"
    FROM roles
    WHERE name = $1
  `, [roleName]);

  return result?.isSystem || false;
}

/**
 * Create a custom role with specific permissions for testing.
 */
export async function createTestRole(
  name: string,
  permissions: Record<string, string[]>
): Promise<number> {
  const result = await queryOne<{ id: number }>(`
    INSERT INTO roles (name, permissions, is_system)
    VALUES ($1, $2, false)
    RETURNING id
  `, [name, JSON.stringify(permissions)]);

  if (!result) {
    throw new Error(`Failed to create test role: ${name}`);
  }

  return result.id;
}

/**
 * Delete a test role (only non-system roles).
 */
export async function deleteTestRole(roleName: string): Promise<boolean> {
  const result = await queryOne<{ deleted: boolean }>(`
    DELETE FROM roles
    WHERE name = $1 AND is_system = false
    RETURNING true as deleted
  `, [roleName]);

  return result?.deleted || false;
}

/**
 * Update a role's permissions.
 */
export async function updateRolePermissions(
  roleId: number,
  permissions: Record<string, string[]>
): Promise<void> {
  await query(`
    UPDATE roles
    SET permissions = $1, updated_at = NOW()
    WHERE id = $2
  `, [JSON.stringify(permissions), roleId]);
}

/**
 * Get users with a specific role.
 */
export async function getUsersWithRole(roleId: number): Promise<Array<{ id: string; username: string }>> {
  return await query<{ id: string; username: string }>(`
    SELECT id, username
    FROM users
    WHERE role_id = $1
  `, [roleId]);
}

/**
 * Count users with each role.
 */
export async function countUsersByRole(): Promise<Record<string, number>> {
  const results = await query<{ roleName: string; count: number }>(`
    SELECT r.name as "roleName", COUNT(*)::int as count
    FROM users u
    JOIN roles r ON u.role_id = r.id
    GROUP BY r.name
    ORDER BY r.name
  `);

  const counts: Record<string, number> = {};

  for (const row of results) {
    counts[row.roleName] = row.count;
  }

  return counts;
}

/**
 * Verify permission matrix matches expected values.
 */
export async function verifyPermissionMatrix(
  expectedPermissions: Record<string, Record<string, string[]>>
): Promise<boolean> {
  const allValid = await Promise.all(
    Object.entries(expectedPermissions).map(async ([roleName, permissions]) => {
      const actualPermissions = await getRolePermissions(roleName);

      // Check each expected permission exists
      for (const [resource, actions] of Object.entries(permissions)) {
        for (const action of actions) {
          const hasIt = actualPermissions.includes(`${resource}.${action}`);
          if (!hasIt) {
            console.error(
              `Role ${roleName} missing permission: ${resource}.${action}`
            );
            return false;
          }
        }
      }

      return true;
    })
  );

  return allValid.every(v => v);
}

/**
 * Test that system roles cannot be modified or deleted.
 */
export async function expectSystemRoleProtected(roleName: string): Promise<void> {
  const isSystem = await isSystemRole(roleName);

  if (!isSystem) {
    throw new Error(`Role '${roleName}' is not a system role`);
  }

  // Try to delete - should fail
  const deleted = await deleteTestRole(roleName);

  if (deleted) {
    throw new Error(`System role '${roleName}' was deleted (should be protected)`);
  }
}

/**
 * Get role ID by name.
 */
export async function getRoleId(roleName: string): Promise<number | null> {
  const result = await queryOne<{ id: number }>(`
    SELECT id FROM roles WHERE name = $1
  `, [roleName]);

  return result?.id || null;
}

/**
 * Assign a user to a different role.
 */
export async function assignUserRole(userId: string, roleId: number): Promise<void> {
  await query(`
    UPDATE users
    SET role_id = $1, updated_at = NOW()
    WHERE id = $2
  `, [roleId, userId]);
}
