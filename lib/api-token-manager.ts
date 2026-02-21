import { randomBytes, createHash } from 'crypto';
import { query, queryOne } from './db';
import type { ApiToken, CreateTokenInput, UpdateTokenInput, CreateTokenResult } from '@/types';

const TOKEN_PREFIX = 'zomboid';
const MAX_TOKENS_PER_USER = 10;

// ============================================
// TOKEN GENERATION
// ============================================

export function generateApiToken(): { rawToken: string; tokenHash: string } {
  const randomPart = randomBytes(16).toString('hex');
  const checksumInput = `${TOKEN_PREFIX}_${randomPart}`;
  const checksum = createHash('sha256')
    .update(checksumInput)
    .digest('hex')
    .substring(0, 8);

  const rawToken = `${TOKEN_PREFIX}_${randomPart}_${checksum}`;
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  return { rawToken, tokenHash };
}

export function validateTokenFormat(token: string): boolean {
  return /^zomboid_[a-f0-9]{32}_[a-f0-9]{8}$/.test(token);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ============================================
// CRUD OPERATIONS
// ============================================

export async function createApiToken(
  userId: number,
  input: CreateTokenInput
): Promise<CreateTokenResult> {
  // Check token limit
  const countRow = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM api_tokens WHERE user_id = $1 AND is_active = true',
    [userId]
  );

  if (parseInt(countRow?.count || '0', 10) >= MAX_TOKENS_PER_USER) {
    throw new Error(`Maximum of ${MAX_TOKENS_PER_USER} active tokens allowed`);
  }

  const { rawToken, tokenHash } = generateApiToken();

  let expiresAt: Date | null = null;
  if (input.expiresInDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);
  }

  const row = await queryOne<{
    id: string;
    name: string;
    description: string | null;
    scopes: Record<string, string[]> | null;
    expires_at: Date | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    `INSERT INTO api_tokens
     (user_id, token_hash, name, description, scopes, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, description, scopes, expires_at, is_active, created_at, updated_at`,
    [
      userId,
      tokenHash,
      input.name.trim(),
      input.description?.trim() || null,
      input.scopes ? JSON.stringify(input.scopes) : null,
      expiresAt,
    ]
  );

  if (!row) {
    throw new Error('Failed to create token');
  }

  const tokenInfo: ApiToken = {
    id: row.id,
    userId,
    name: row.name,
    description: row.description,
    scopes: row.scopes,
    expiresAt: row.expires_at,
    lastUsedAt: null,
    lastUsedIp: null,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return { rawToken, tokenInfo };
}

export async function listApiTokens(userId: number): Promise<ApiToken[]> {
  const rows = await query<{
    id: string;
    name: string;
    description: string | null;
    scopes: Record<string, string[]> | null;
    expires_at: Date | null;
    last_used_at: Date | null;
    last_used_ip: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, name, description, scopes, expires_at,
            last_used_at, last_used_ip, is_active, created_at, updated_at
     FROM api_tokens
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows.map(row => ({
    id: row.id,
    userId,
    name: row.name,
    description: row.description,
    scopes: row.scopes,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    lastUsedIp: row.last_used_ip,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getApiToken(tokenId: string, userId: number): Promise<ApiToken | null> {
  const row = await queryOne<{
    id: string;
    name: string;
    description: string | null;
    scopes: Record<string, string[]> | null;
    expires_at: Date | null;
    last_used_at: Date | null;
    last_used_ip: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, name, description, scopes, expires_at,
            last_used_at, last_used_ip, is_active, created_at, updated_at
     FROM api_tokens
     WHERE id = $1 AND user_id = $2`,
    [tokenId, userId]
  );

  if (!row) return null;

  return {
    id: row.id,
    userId,
    name: row.name,
    description: row.description,
    scopes: row.scopes,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    lastUsedIp: row.last_used_ip,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateApiToken(
  tokenId: string,
  userId: number,
  input: UpdateTokenInput
): Promise<ApiToken> {
  const row = await queryOne<{
    id: string;
    name: string;
    description: string | null;
    scopes: Record<string, string[]> | null;
    expires_at: Date | null;
    last_used_at: Date | null;
    last_used_ip: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    `UPDATE api_tokens
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         expires_at = COALESCE($3, expires_at),
         scopes = COALESCE($4, scopes)
     WHERE id = $5 AND user_id = $6
     RETURNING id, name, description, scopes, expires_at,
               last_used_at, last_used_ip, is_active, created_at, updated_at`,
    [
      input.name?.trim(),
      input.description?.trim(),
      input.expiresAt,
      input.scopes ? JSON.stringify(input.scopes) : null,
      tokenId,
      userId,
    ]
  );

  if (!row) {
    throw new Error('Token not found');
  }

  return {
    id: row.id,
    userId,
    name: row.name,
    description: row.description,
    scopes: row.scopes,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    lastUsedIp: row.last_used_ip,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function revokeApiToken(tokenId: string, userId: number): Promise<void> {
  const result = await query(
    'UPDATE api_tokens SET is_active = false WHERE id = $1 AND user_id = $2',
    [tokenId, userId]
  );

  if (result.length === 0) {
    throw new Error('Token not found');
  }
}

export async function deleteApiToken(tokenId: string, userId: number): Promise<void> {
  const result = await query(
    'DELETE FROM api_tokens WHERE id = $1 AND user_id = $2',
    [tokenId, userId]
  );

  if (result.length === 0) {
    throw new Error('Token not found');
  }
}

export async function revokeAllUserTokens(userId: number): Promise<number> {
  const result = await query(
    'UPDATE api_tokens SET is_active = false WHERE user_id = $1 AND is_active = true',
    [userId]
  );
  return result.length;
}

// ============================================
// TOKEN AUTHENTICATION
// ============================================

export async function getTokenWithUser(tokenHash: string): Promise<{
  tokenId: string;
  userId: number;
  scopes: Record<string, string[]> | null;
  expiresAt: Date | null;
  isActive: boolean;
  username: string;
  email: string | null;
  roleId: number;
  isActiveUser: boolean;
  roleName: string;
  roleDescription: string;
  rolePermissions: Record<string, string[]>;
  roleIsSystem: boolean;
} | null> {
  return queryOne(
    `SELECT
      t.id as token_id,
      t.user_id,
      t.scopes,
      t.expires_at,
      t.is_active,
      u.username,
      u.email,
      u.role_id,
      u.is_active as is_active_user,
      r.name as role_name,
      r.description as role_description,
      r.permissions as role_permissions,
      r.is_system as role_is_system
     FROM api_tokens t
     JOIN users u ON t.user_id = u.id
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE t.token_hash = $1`,
    [tokenHash]
  );
}

export async function updateTokenLastUsed(
  tokenId: string,
  ipAddress: string | null
): Promise<void> {
  await query(
    `UPDATE api_tokens
     SET last_used_at = NOW(), last_used_ip = $1
     WHERE id = $2`,
    [ipAddress, tokenId]
  ).catch(() => {}); // Silently fail, don't block request
}
