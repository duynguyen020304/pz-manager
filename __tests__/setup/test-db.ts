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

    -- ============================================
    -- AUDIT LOGS (Time-series data - regular table in tests)
    -- ============================================
    CREATE TABLE IF NOT EXISTS audit_logs (
      time TIMESTAMPTZ NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      username VARCHAR(50),
      action VARCHAR(100) NOT NULL,
      resource_type VARCHAR(50) NOT NULL,
      resource_id VARCHAR(255),
      details JSONB,
      ip_address INET
    );

    -- ============================================
    -- LOG SYSTEM TABLES
    -- ============================================
    CREATE TABLE IF NOT EXISTS backup_logs (
      time TIMESTAMPTZ NOT NULL,
      log_type TEXT NOT NULL,
      level TEXT NOT NULL,
      server TEXT,
      message TEXT NOT NULL,
      details JSONB,
      parsed_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pz_player_events (
      time TIMESTAMPTZ NOT NULL,
      server TEXT NOT NULL,
      event_type TEXT NOT NULL,
      username TEXT,
      ip_address INET,
      details JSONB,
      parsed_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pz_server_events (
      time TIMESTAMPTZ NOT NULL,
      server TEXT NOT NULL,
      event_type TEXT NOT NULL,
      category TEXT,
      level TEXT,
      message TEXT,
      details JSONB,
      parsed_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pz_skill_snapshots (
      time TIMESTAMPTZ NOT NULL,
      server TEXT NOT NULL,
      username TEXT NOT NULL,
      player_id INTEGER,
      hours_survived INTEGER,
      skills JSONB NOT NULL,
      parsed_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pz_chat_messages (
      time TIMESTAMPTZ NOT NULL,
      server TEXT NOT NULL,
      username TEXT NOT NULL,
      chat_type TEXT NOT NULL,
      message TEXT NOT NULL,
      coordinates JSONB,
      parsed_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pz_pvp_events (
      time TIMESTAMPTZ NOT NULL,
      server TEXT NOT NULL,
      event_type TEXT NOT NULL,
      attacker TEXT,
      victim TEXT,
      weapon TEXT,
      damage REAL,
      details JSONB,
      parsed_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS log_file_positions (
      file_path TEXT PRIMARY KEY,
      last_position BIGINT NOT NULL,
      last_modified TIMESTAMPTZ NOT NULL,
      last_ingested TIMESTAMPTZ DEFAULT NOW(),
      file_size BIGINT,
      checksum TEXT,
      parser_type TEXT NOT NULL
    );

    -- ============================================
    -- MONITORING TABLES
    -- ============================================
    CREATE TABLE IF NOT EXISTS system_metrics (
      time TIMESTAMPTZ NOT NULL,
      cpu_percent NUMERIC,
      cpu_cores JSONB,
      memory_used_bytes BIGINT,
      memory_total_bytes BIGINT,
      memory_percent NUMERIC,
      swap_used_bytes BIGINT,
      swap_total_bytes BIGINT,
      swap_percent NUMERIC,
      network_interface TEXT,
      network_rx_bytes BIGINT,
      network_tx_bytes BIGINT,
      network_rx_sec BIGINT,
      network_tx_sec BIGINT
    );

    CREATE TABLE IF NOT EXISTS system_spikes (
      time TIMESTAMPTZ NOT NULL,
      metric_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      previous_value NUMERIC,
      current_value NUMERIC,
      change_percent NUMERIC,
      sustained_for_seconds INTEGER,
      details JSONB
    );

    CREATE TABLE IF NOT EXISTS monitor_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      enabled BOOLEAN DEFAULT true,
      polling_interval_seconds INTEGER DEFAULT 5,
      data_retention_days INTEGER DEFAULT 30,
      cpu_spike_threshold_percent NUMERIC DEFAULT 25.0,
      cpu_spike_sustained_seconds INTEGER DEFAULT 15,
      cpu_critical_threshold NUMERIC DEFAULT 90.0,
      memory_spike_threshold_percent NUMERIC DEFAULT 20.0,
      memory_spike_sustained_seconds INTEGER DEFAULT 10,
      memory_critical_threshold NUMERIC DEFAULT 90.0,
      swap_spike_threshold_percent NUMERIC DEFAULT 30.0,
      swap_spike_sustained_seconds INTEGER DEFAULT 10,
      swap_critical_threshold NUMERIC DEFAULT 50.0,
      network_spike_threshold_percent NUMERIC DEFAULT 50.0,
      network_spike_sustained_seconds INTEGER DEFAULT 10,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT single_config CHECK (id = 1)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

    -- Audit log indexes
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, time DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

    -- Log table indexes
    CREATE INDEX IF NOT EXISTS idx_backup_logs_server ON backup_logs(server, time DESC);
    CREATE INDEX IF NOT EXISTS idx_pz_player_events_server ON pz_player_events(server, time DESC);
    CREATE INDEX IF NOT EXISTS idx_pz_server_events_server ON pz_server_events(server, time DESC);
    CREATE INDEX IF NOT EXISTS idx_pz_skill_snapshots_server ON pz_skill_snapshots(server, time DESC);
    CREATE INDEX IF NOT EXISTS idx_pz_chat_messages_server ON pz_chat_messages(server, time DESC);
    CREATE INDEX IF NOT EXISTS idx_pz_pvp_events_server ON pz_pvp_events(server, time DESC);
    CREATE INDEX IF NOT EXISTS idx_log_file_positions_ingested ON log_file_positions(last_ingested DESC);

    -- Monitoring table indexes
    CREATE INDEX IF NOT EXISTS idx_system_metrics_time ON system_metrics(time DESC);
    CREATE INDEX IF NOT EXISTS idx_system_spikes_time ON system_spikes(time DESC);
    CREATE INDEX IF NOT EXISTS idx_monitor_config_id ON monitor_config(id);

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
    // Insert default users
    await client.query(`
      INSERT INTO users (username, email, password_hash, role_id, is_active)
      VALUES
        ('admin', 'admin@example.com', '$2b$10$abcdefghijklmnopqrstuv', 1, true),
        ('testuser', 'test@example.com', '$2b$10$abcdefghijklmnopqrstuv', 2, true),
        ('disabled', 'disabled@example.com', '$2b$10$abcdefghijklmnopqrstuv', 3, false);
    `);

    // Insert default monitor config
    await client.query(`
      INSERT INTO monitor_config (id, enabled, polling_interval_seconds, data_retention_days)
      VALUES (1, true, 5, 30)
      ON CONFLICT (id) DO NOTHING;
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
