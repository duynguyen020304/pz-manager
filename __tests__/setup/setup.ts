import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach } from 'vitest';

// Check if we should use the real database for testing
const useRealDatabase = process.env.USE_REAL_DATABASE === 'true' ||
                        process.env.TEST_MODE === 'integration';

if (!useRealDatabase) {
  // Only import test-db when using pg-mem
  import('./test-db').then(async ({ createTestDatabase, resetTestDatabase, getTestPool }) => {
    // Initialize test database before all tests
    beforeAll(async () => {
      const db = createTestDatabase();
      const pool = getTestPool();
      // Make database and pool available globally for lib/db.ts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).__TEST_DB__ = db;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).__TEST_POOL__ = pool;
    });

    // Reset database after each test
    afterEach(async () => {
      await resetTestDatabase();
    });

    // Cleanup after all tests
    afterAll(() => {
      // Cleanup resources
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).__TEST_DB__ = undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).__TEST_POOL__ = undefined;
    });
  });
} else {
  console.log('🗄️  Running tests against real TimescaleDB database');
  console.log('   DATABASE_URL:', process.env.DATABASE_URL || 'not set');
}
