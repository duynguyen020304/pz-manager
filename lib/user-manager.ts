import bcrypt from 'bcryptjs';
import { query, queryOne } from './db';
import { getRoleById } from './role-manager';
import type {
  User,
  UserWithRole,
  CreateUserInput,
  UpdateUserInput,
  PaginatedResult,
} from '@/types';

const SALT_ROUNDS = 10;

// ============================================
// PASSWORD HANDLING
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get user by ID (without role details)
 */
export async function getUserById(id: number): Promise<User | null> {
  const row = await queryOne<{
    id: number;
    username: string;
    email: string | null;
    password_hash: string;
    role_id: number;
    is_active: boolean;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM users WHERE id = $1', [id]);

  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    roleId: row.role_id,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get user by ID with role details
 */
export async function getUserByIdWithRole(
  id: number
): Promise<UserWithRole | null> {
  const row = await queryOne<{
    id: number;
    username: string;
    email: string | null;
    password_hash: string;
    role_id: number;
    is_active: boolean;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
    role_name: string;
    role_description: string;
    role_permissions: Record<string, string[]>;
    role_is_system: boolean;
    role_created_at: Date;
    role_updated_at: Date;
  }>(
    `SELECT u.*, 
            r.name as role_name, 
            r.description as role_description, 
            r.permissions as role_permissions,
            r.is_system as role_is_system,
            r.created_at as role_created_at,
            r.updated_at as role_updated_at
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.id = $1`,
    [id]
  );

  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    roleId: row.role_id,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    role: {
      id: row.role_id,
      name: row.role_name,
      description: row.role_description,
      permissions: row.role_permissions,
      isSystem: row.role_is_system,
      createdAt: row.role_created_at,
      updatedAt: row.role_updated_at,
    },
  };
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const row = await queryOne<{
    id: number;
    username: string;
    email: string | null;
    password_hash: string;
    role_id: number;
    is_active: boolean;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM users WHERE username = $1', [username]);

  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    roleId: row.role_id,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get user by username with role (for authentication)
 */
export async function getUserByUsernameWithRole(
  username: string
): Promise<UserWithRole | null> {
  const row = await queryOne<{
    id: number;
    username: string;
    email: string | null;
    password_hash: string;
    role_id: number;
    is_active: boolean;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
    role_name: string;
    role_description: string;
    role_permissions: Record<string, string[]>;
    role_is_system: boolean;
    role_created_at: Date;
    role_updated_at: Date;
  }>(
    `SELECT u.*, 
            r.name as role_name, 
            r.description as role_description, 
            r.permissions as role_permissions,
            r.is_system as role_is_system,
            r.created_at as role_created_at,
            r.updated_at as role_updated_at
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.username = $1`,
    [username]
  );

  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    password_hash: row.password_hash,
    roleId: row.role_id,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    role: {
      id: row.role_id,
      name: row.role_name,
      description: row.role_description,
      permissions: row.role_permissions,
      isSystem: row.role_is_system,
      createdAt: row.role_created_at,
      updatedAt: row.role_updated_at,
    },
  };
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const row = await queryOne<{
    id: number;
    username: string;
    email: string | null;
    password_hash: string;
    role_id: number;
    is_active: boolean;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM users WHERE email = $1', [email]);

  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    roleId: row.role_id,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * List users with pagination and filtering
 */
export async function listUsers(options: {
  page?: number;
  limit?: number;
  roleId?: number;
  isActive?: boolean;
  search?: string;
}): Promise<PaginatedResult<UserWithRole>> {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const offset = (page - 1) * limit;

  // Build query conditions
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.roleId !== undefined) {
    conditions.push(`u.role_id = $${paramIndex++}`);
    params.push(options.roleId);
  }

  if (options.isActive !== undefined) {
    conditions.push(`u.is_active = $${paramIndex++}`);
    params.push(options.isActive);
  }

  if (options.search) {
    conditions.push(
      `(u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`
    );
    params.push(`%${options.search}%`);
    paramIndex++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM users u ${whereClause}`,
    params
  );
  const total = parseInt(countRow?.count || '0', 10);

  // Get users
  const rows = await query<{
    id: number;
    username: string;
    email: string | null;
    password_hash: string;
    role_id: number;
    is_active: boolean;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
    role_name: string;
    role_description: string;
    role_permissions: Record<string, string[]>;
    role_is_system: boolean;
    role_created_at: Date;
    role_updated_at: Date;
  }>(
    `SELECT u.*, 
            r.name as role_name, 
            r.description as role_description, 
            r.permissions as role_permissions,
            r.is_system as role_is_system,
            r.created_at as role_created_at,
            r.updated_at as role_updated_at
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  const data = rows.map((row) => ({
    id: row.id,
    username: row.username,
    email: row.email,
    roleId: row.role_id,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    role: {
      id: row.role_id,
      name: row.role_name,
      description: row.role_description,
      permissions: row.role_permissions,
      isSystem: row.role_is_system,
      createdAt: row.role_created_at,
      updatedAt: row.role_updated_at,
    },
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  // Check if username already exists
  const existingUsername = await getUserByUsername(input.username);
  if (existingUsername) {
    throw new Error(`Username '${input.username}' already exists`);
  }

  // Check if email already exists (if provided)
  if (input.email) {
    const existingEmail = await getUserByEmail(input.email);
    if (existingEmail) {
      throw new Error(`Email '${input.email}' already exists`);
    }
  }

  // Verify role exists
  const role = await getRoleById(input.roleId);
  if (!role) {
    throw new Error(`Role with id '${input.roleId}' does not exist`);
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  const row = await queryOne<{
    id: number;
    username: string;
    email: string | null;
    password_hash: string;
    role_id: number;
    is_active: boolean;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `INSERT INTO users (username, email, password_hash, role_id, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.username,
      input.email || null,
      passwordHash,
      input.roleId,
      input.isActive ?? true,
    ]
  );

  if (!row) {
    throw new Error('Failed to create user');
  }

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    roleId: row.role_id,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Update a user
 */
export async function updateUser(
  id: number,
  input: UpdateUserInput
): Promise<User> {
  const user = await getUserById(id);
  if (!user) {
    throw new Error('User not found');
  }

  // Check for username conflict if changing username
  if (input.username && input.username !== user.username) {
    const existing = await getUserByUsername(input.username);
    if (existing) {
      throw new Error(`Username '${input.username}' already exists`);
    }
  }

  // Check for email conflict if changing email
  if (input.email && input.email !== user.email) {
    const existing = await getUserByEmail(input.email);
    if (existing) {
      throw new Error(`Email '${input.email}' already exists`);
    }
  }

  // Verify role exists if changing role
  if (input.roleId !== undefined) {
    const role = await getRoleById(input.roleId);
    if (!role) {
      throw new Error(`Role with id '${input.roleId}' does not exist`);
    }
  }

  // Hash password if provided
  let passwordHash: string | undefined;
  if (input.password) {
    passwordHash = await hashPassword(input.password);
  }

  const row = await queryOne<{
    id: number;
    username: string;
    email: string | null;
    password_hash: string;
    role_id: number;
    is_active: boolean;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `UPDATE users
     SET username = COALESCE($1, username),
         email = COALESCE($2, email),
         password_hash = COALESCE($3, password_hash),
         role_id = COALESCE($4, role_id),
         is_active = COALESCE($5, is_active)
     WHERE id = $6
     RETURNING *`,
    [
      input.username,
      input.email,
      passwordHash,
      input.roleId,
      input.isActive,
      id,
    ]
  );

  if (!row) {
    throw new Error('Failed to update user');
  }

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    roleId: row.role_id,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Delete a user
 * Note: Cannot delete the last superadmin
 */
export async function deleteUser(id: number): Promise<void> {
  const user = await getUserByIdWithRole(id);
  if (!user) {
    throw new Error('User not found');
  }

  // Check if this is the last superadmin
  if (user.role?.name === 'superadmin') {
    const superadminCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'superadmin' AND u.is_active = true`
    );

    if (parseInt(superadminCount?.count || '0', 10) <= 1) {
      throw new Error('Cannot delete the last active superadmin');
    }
  }

  const result = await query<{ id: number }>(
    'DELETE FROM users WHERE id = $1 RETURNING id',
    [id]
  );

  if (result.length === 0) {
    throw new Error('Failed to delete user');
  }
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(id: number): Promise<void> {
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);
}

/**
 * Count total users
 */
export async function countUsers(): Promise<number> {
  const row = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM users');
  return parseInt(row?.count || '0', 10);
}

/**
 * Count active users
 */
export async function countActiveUsers(): Promise<number> {
  const row = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM users WHERE is_active = true'
  );
  return parseInt(row?.count || '0', 10);
}
