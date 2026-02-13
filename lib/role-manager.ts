import { query, queryOne, transaction } from './db';
import type { Role, CreateRoleInput, UpdateRoleInput } from '@/types';

// ============================================
// PERMISSION CHECKING
// ============================================

/**
 * Check if a role has a specific permission
 * Superadmin role (id=1) has all permissions
 */
export function hasPermission(
  role: Role,
  resource: string,
  action: string
): boolean {
  // Superadmin has all permissions
  if (role.name === 'superadmin' || role.id === 1) {
    return true;
  }

  // Check for wildcard resource permission
  if (role.permissions['*']) {
    const wildcardActions = role.permissions['*'];
    if (wildcardActions.includes('*') || wildcardActions.includes(action)) {
      return true;
    }
  }

  // Check specific resource permission
  const actions = role.permissions[resource];
  if (!actions) {
    return false;
  }

  return actions.includes(action);
}

/**
 * Check if a role has all specified permissions
 */
export function hasAllPermissions(
  role: Role,
  permissions: Array<{ resource: string; action: string }>
): boolean {
  return permissions.every(({ resource, action }) =>
    hasPermission(role, resource, action)
  );
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(
  role: Role,
  permissions: Array<{ resource: string; action: string }>
): boolean {
  return permissions.some(({ resource, action }) =>
    hasPermission(role, resource, action)
  );
}

/**
 * Get all permissions for a role as a flat list
 */
export function getRolePermissionsList(role: Role): string[] {
  if (role.name === 'superadmin') {
    return ['*:*'];
  }

  const permissions: string[] = [];
  for (const [resource, actions] of Object.entries(role.permissions)) {
    for (const action of actions) {
      permissions.push(`${resource}:${action}`);
    }
  }
  return permissions;
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get all roles
 */
export async function getAllRoles(): Promise<Role[]> {
  const rows = await query<{
    id: number;
    name: string;
    description: string;
    permissions: Record<string, string[]>;
    is_system: boolean;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM roles ORDER BY id');

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    permissions: row.permissions,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Get role by ID
 */
export async function getRoleById(id: number): Promise<Role | null> {
  const row = await queryOne<{
    id: number;
    name: string;
    description: string;
    permissions: Record<string, string[]>;
    is_system: boolean;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM roles WHERE id = $1', [id]);

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    permissions: row.permissions,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get role by name
 */
export async function getRoleByName(name: string): Promise<Role | null> {
  const row = await queryOne<{
    id: number;
    name: string;
    description: string;
    permissions: Record<string, string[]>;
    is_system: boolean;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM roles WHERE name = $1', [name]);

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    permissions: row.permissions,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create a new role
 */
export async function createRole(input: CreateRoleInput): Promise<Role> {
  // Check if role name already exists
  const existing = await getRoleByName(input.name);
  if (existing) {
    throw new Error(`Role with name '${input.name}' already exists`);
  }

  const row = await queryOne<{
    id: number;
    name: string;
    description: string;
    permissions: Record<string, string[]>;
    is_system: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    `INSERT INTO roles (name, description, permissions, is_system)
     VALUES ($1, $2, $3, false)
     RETURNING *`,
    [input.name, input.description || '', JSON.stringify(input.permissions)]
  );

  if (!row) {
    throw new Error('Failed to create role');
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    permissions: row.permissions,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Update a role
 * Note: System roles cannot have their name changed
 */
export async function updateRole(
  id: number,
  input: UpdateRoleInput
): Promise<Role> {
  const role = await getRoleById(id);
  if (!role) {
    throw new Error('Role not found');
  }

  // Prevent renaming system roles
  if (role.isSystem && input.name && input.name !== role.name) {
    throw new Error('Cannot rename system roles');
  }

  // Check for name conflict if changing name
  if (input.name && input.name !== role.name) {
    const existing = await getRoleByName(input.name);
    if (existing) {
      throw new Error(`Role with name '${input.name}' already exists`);
    }
  }

  const row = await queryOne<{
    id: number;
    name: string;
    description: string;
    permissions: Record<string, string[]>;
    is_system: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    `UPDATE roles
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         permissions = COALESCE($3, permissions)
     WHERE id = $4
     RETURNING *`,
    [
      input.name,
      input.description,
      input.permissions ? JSON.stringify(input.permissions) : null,
      id,
    ]
  );

  if (!row) {
    throw new Error('Failed to update role');
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    permissions: row.permissions,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Delete a role
 * Note: System roles cannot be deleted
 * Users with this role will have their role set to null
 */
export async function deleteRole(id: number): Promise<void> {
  const role = await getRoleById(id);
  if (!role) {
    throw new Error('Role not found');
  }

  if (role.isSystem) {
    throw new Error('Cannot delete system roles');
  }

  await transaction(async (client) => {
    // Set users with this role to null
    await client.query('UPDATE users SET role_id = NULL WHERE role_id = $1', [
      id,
    ]);

    // Delete the role
    const result = await client.query('DELETE FROM roles WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new Error('Failed to delete role');
    }
  });
}

/**
 * Get count of users assigned to a role
 */
export async function getRoleUserCount(id: number): Promise<number> {
  const row = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM users WHERE role_id = $1',
    [id]
  );
  return parseInt(row?.count || '0', 10);
}

// ============================================
// DEFAULT ROLES
// ============================================

export const DEFAULT_ROLES = {
  superadmin: {
    name: 'superadmin',
    description: 'Full system access - can perform any action',
    permissions: { '*': ['*'] },
  },
  admin: {
    name: 'admin',
    description: 'Administrator - can manage servers, backups, schedules, and users',
    permissions: {
      servers: ['view', 'start', 'stop', 'configure'],
      backups: ['view', 'create', 'restore', 'delete'],
      schedules: ['view', 'create', 'edit', 'delete'],
      settings: ['view', 'edit'],
      logs: ['view'],
      users: ['view', 'create', 'edit'],
      roles: ['view'],
    },
  },
  operator: {
    name: 'operator',
    description: 'Operator - can start/stop servers and view logs',
    permissions: {
      servers: ['view', 'start', 'stop'],
      backups: ['view'],
      schedules: ['view'],
      logs: ['view'],
    },
  },
  viewer: {
    name: 'viewer',
    description: 'Viewer - read-only access to all resources',
    permissions: {
      servers: ['view'],
      backups: ['view'],
      schedules: ['view'],
      logs: ['view'],
    },
  },
};
