import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { resetTestDatabase } from '../setup/test-db';
import mockFs from 'mock-fs';

// Global test setup
beforeAll(async () => {
  // Ensure database is ready
  // Database setup is handled in test-db.ts
  
  // Mock shelljs module
  vi.mock('shelljs', () => ({
    default: {
      exec: vi.fn((command: string, options?: any, callback?: any) => {
        // Default success response
        if (callback) callback(0, '', '');
        return { code: 0, stdout: '', stderr: '' };
      }),
      which: vi.fn(() => ({ code: 0, stdout: '/usr/bin/command' })),
      config: { silent: true }
    },
    exec: vi.fn(),
    which: vi.fn()
  }));
});

beforeEach(async () => {
  // Reset database state
  await resetTestDatabase();
  
  // Setup default mock file system
  const defaultFs = {
    '/root/server-cache': {},
    '/opt/zomboid-backups': {
      config: {
        'backup-config.json': JSON.stringify({
          version: '1.0.0',
          savesPath: '/root/Zomboid/Saves',
          servers: [],
          snapshotsPath: '/opt/zomboid-backups/snapshots',
          compression: { enabled: true, algorithm: 'zstd', level: 3 },
          integrity: { enabled: true, algorithm: 'sha256' },
          schedules: [],
          notifications: {},
          performance: {},
          autoRollback: { enabled: false }
        }, null, 2)
      },
      snapshots: {}
    },
    '/tmp': {}
  };
  
  mockFs(defaultFs);
});

afterEach(() => {
  // Restore file system
  mockFs.restore();
});

afterAll(async () => {
  // Final cleanup
  mockFs.restore();
});
