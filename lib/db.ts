import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import type { IMemoryDb } from 'pg-mem';

// Type for pg-mem adapter Pool (similar to pg Pool)
interface TestPool {
  connect(): Promise<PoolClient>;
  end(): Promise<void>;
}

// Check environment
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
const useRealDatabase = process.env.USE_REAL_DATABASE === 'true' ||
                        process.env.TEST_MODE === 'integration';

// When USE_REAL_DATABASE is true, we always use the real database even in test mode
const shouldUsePgMem = isTestEnvironment && !useRealDatabase;

let pool: Pool | null = null;
let testDb: IMemoryDb | null = null;
let testPool: TestPool | null = null; // Store pg-mem adapter Pool

// Initialize real pool when NOT using pg-mem
if (!shouldUsePgMem) {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });
}

export { pool };

/**
 * Set test database for testing
 */
export function setTestDatabase(db: IMemoryDb): void {
  if (!shouldUsePgMem) {
    throw new Error('Cannot set test database outside of pg-mem test environment');
  }
  testDb = db;
}

/**
 * Get database instance (real or test)
 */
function getDb() {
  if (shouldUsePgMem) {
    // Check for global test database first
    const globalDb = (globalThis as { __TEST_DB__?: unknown; __TEST_POOL__?: unknown }).__TEST_DB__;
    const globalPool = (globalThis as { __TEST_DB__?: unknown; __TEST_POOL__?: unknown }).__TEST_POOL__;

    if (globalDb) {
      testDb = globalDb as IMemoryDb;
    }

    if (globalPool) {
      testPool = globalPool as TestPool;
      return testPool;
    }

    if (!testDb) {
      throw new Error('Test database not initialized. Make sure setup.ts is loaded.');
    }
    return testPool;
  }
  return pool;
}

/**
 * Execute a query with automatic client release
 */
export async function query<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<T[]> {
  const db = getDb();

  // Both pg-mem adapter Pool and real pg Pool have the same interface
  const client = await (db as Pool).connect();
  try {
    const result: QueryResult<T> = await client.query<T>(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Execute a single row query (returns first row or null)
 */
export async function queryOne<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<T | null> {
  const results = await query<T>(text, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute a transaction with automatic commit/rollback
 */
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  if (shouldUsePgMem) {
    // In pg-mem test mode, just run the callback without transaction
    // (pg-mem has limited transaction support)
    const db = getDb();
    const client = await (db as Pool).connect();
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }

  if (!pool) {
    throw new Error('Database pool not initialized');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check database connection
 */
export async function checkConnection(): Promise<boolean> {
  if (shouldUsePgMem) {
    return !!testDb;
  }

  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Close pool (useful for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
  if (testPool) {
    await testPool.end();
  }
}

/**
 * Initialize database tables
 * This should be called on application startup
 */
export async function initializeDatabase(): Promise<void> {
  const connected = await checkConnection();
  if (!connected) {
    throw new Error('Failed to connect to database');
  }

  console.log('Database connection established successfully');
}
