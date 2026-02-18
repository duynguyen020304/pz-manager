import { beforeAll, afterAll } from 'vitest';
import { cleanupTestData, countTestRecords } from '../helpers/cleanup';

/**
 * Global E2E test suite configuration.
 * Runs once before all E2E tests and once after all E2E tests complete.
 */

let initialRecordCount: {
  users: number;
  sessions: number;
  roles: number;
  auditLogs: number;
};

beforeAll(async () => {
  // One-time E2E suite setup
  console.log('🧪 Setting up E2E test suite...');

  // Count initial records to verify cleanup
  initialRecordCount = await countTestRecords();

  if (Object.values(initialRecordCount).some(count => count > 0)) {
    console.warn(
      '⚠️  Database has existing test data before E2E suite run:\n' +
      `   - Users: ${initialRecordCount.users}\n` +
      `   - Sessions: ${initialRecordCount.sessions}\n` +
      `   - Roles: ${initialRecordCount.roles}\n` +
      `   - Audit logs: ${initialRecordCount.auditLogs}`
    );
  }

  console.log('✅ E2E test suite setup complete');
});

afterAll(async () => {
  // Final cleanup after all E2E tests
  console.log('🧹 Cleaning up after E2E test suite...');

  try {
    await cleanupTestData({
      users: true,
      sessions: true,
      roles: true,
      logs: true,
      auditLogs: true,
      backups: true,
      metrics: true
    });

    // Verify cleanup was successful
    const finalRecordCount = await countTestRecords();

    const remainingTotal = Object.values(finalRecordCount).reduce((sum, count) => sum + count, 0);

    if (remainingTotal > 0) {
      console.warn(
        '⚠️  E2E suite cleanup complete but some test data remains:\n' +
        `   - Users: ${finalRecordCount.users}\n` +
        `   - Sessions: ${finalRecordCount.sessions}\n` +
        `   - Roles: ${finalRecordCount.roles}\n` +
        `   - Audit logs: ${finalRecordCount.auditLogs}\n` +
        `   Total remaining: ${remainingTotal} records`
      );
    } else {
      console.log('✅ E2E suite cleanup complete - database is clean');
    }
  } catch (error) {
    console.error('❌ Error during E2E suite cleanup:', error);
    throw error;
  }
});

/**
 * Helper function to check if we're in E2E test mode.
 */
export function isE2ETest(): boolean {
  return process.env.NODE_ENV === 'test' && process.env.VITEST_WORKER_ID !== undefined;
}

/**
 * Helper function to get the base URL for API requests.
 * Defaults to localhost:3000 in test environment.
 */
export function getApiBaseUrl(): string {
  return process.env.API_BASE_URL || 'http://localhost:3000';
}

/**
 * Helper function to get test server name.
 * Uses existing servers for safety.
 */
export function getTestServerName(): string {
  return process.env.TEST_SERVER || 'servertest';
}

/**
 * Helper function to skip tests in CI if database is not available.
 */
export async function skipIfNoDatabase(): Promise<void> {
  try {
    const { query } = await import('@/lib/db');
    await query('SELECT 1');
  } catch (error) {
    console.warn('⚠️  Database not available, skipping E2E tests');
    process.exit(0);
  }
}

/**
 * Helper function to setup test environment variables.
 */
export function setupTestEnv(): void {
  // Set test-specific environment variables
  process.env.NODE_ENV = 'test';

  // Ensure we're using the test database
  if (!process.env.DATABASE_URL?.includes('test')) {
    console.warn('⚠️  DATABASE_URL does not contain "test" - ensure you are using a test database');
  }
}

// Auto-setup test environment
setupTestEnv();
