import { newDb, DataType } from 'pg-mem';
import type { IMemoryDb } from 'pg-mem';

// Type for pg-mem adapter Pool (similar to pg Pool)
interface TestPool {
  connect(): Promise<TestPoolClient>;
  end(): Promise<void>;
}

interface TestPoolClient {
  query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
  release(): void;
}

let db: IMemoryDb | null = null;
let pool: TestPool | null = null;

export function createTestDatabase(): IMemoryDb {
  return createDatabaseInternal();
}

function createDatabaseInternal(): IMemoryDb {
  db = newDb();

  // Register gen_random_uuid function directly on the public schema
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => crypto.randomUUID(),
  });

  // Create schema
  db.public.none(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      permissions JSONB NOT NULL DEFAULT '{}',
      is_system BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
      is_active BOOLEAN DEFAULT true,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      ip_address INET,
      user_agent TEXT
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

    -- Insert default roles
    INSERT INTO roles (name, description, permissions, is_system) VALUES
      ('superadmin', 'Full system access', '{"*": ["*"]}', true),
      ('admin', 'Administrator', '{"servers": ["view", "start", "stop"], "users": ["view"]}', true),
      ('operator', 'Operator', '{"servers": ["view", "start", "stop"]}', true),
      ('viewer', 'Viewer', '{"servers": ["view"]}', true);
  `);

  // Create pg adapter Pool for use by both lib/db.ts and resetTestDatabase
  const { Pool: PgMemPool } = db.adapters.createPg();
  pool = new PgMemPool({ max: 1 }) as TestPool;

  // Seed initial test data through the Pool
  seedTestData();

  return db;
}

export function getTestPool(): TestPool {
  if (!pool) {
    throw new Error('Test pool not initialized. Call createTestDatabase() first.');
  }
  return pool;
}

async function seedTestData(): Promise<void> {
  if (!pool) return;

  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO users (username, email, password_hash, role_id, is_active)
      VALUES
        ('admin', 'admin@example.com', '$2b$10$abcdefghijklmnopqrstuv', 1, true),
        ('testuser', 'test@example.com', '$2b$10$abcdefghijklmnopqrstuv', 2, true),
        ('disabled', 'disabled@example.com', '$2b$10$abcdefghijklmnopqrstuv', 3, false);
    `);
  } finally {
    client.release();
  }
}

export async function resetTestDatabase(): Promise<void> {
  // Recreate the entire database to reset sequences
  // This is the most reliable way with pg-mem
  db = null;
  pool = null;

  const newDb = createDatabaseInternal();

  // Update global references to point to the new database and pool
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__TEST_DB__ = newDb;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__TEST_POOL__ = pool;
}

export function getTestDatabase(): IMemoryDb {
  if (!db) {
    throw new Error('Test database not initialized');
  }
  return db;
}
