import { vi } from 'vitest';
import { readdir, readFile, access, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Mock factories for external dependencies in E2E tests.
 * These mocks prevent tests from depending on external systems (tmux, Steam API, file system).
 */

/**
 * Mock tmux session detection.
 *
 * @param sessionName - The tmux session name to mock
 * @param exists - Whether the session should exist
 * @param sessions - Optional list of all sessions to mock
 */
export function mockTmuxSession(
  sessionName: string,
  exists: boolean,
  sessions: string[] = []
): void {
  // Mock exec for tmux commands
  vi.mock('child_process', () => ({
    exec: vi.fn((command, callback) => {
      if (command.includes('tmux list-sessions')) {
        const output = exists
          ? sessions.length > 0
            ? sessions.join('\n')
            : sessionName
          : '';
        callback(null, { stdout: output, stderr: '' });
      } else if (command.includes(`tmux has-session`)) {
        callback(exists ? null : new Error('session not found'), exists ? { stdout: '', stderr: '' } : null);
      } else {
        // Call original exec for other commands
        const originalExec = require('child_process').exec;
        originalExec(command, callback);
      }
    })
  }));
}

/**
 * Mock process detection for Project Zomboid servers.
 *
 * @param serverName - The server name
 * @param running - Whether the process should appear running
 * @param pid - Optional specific PID to return
 */
export function mockProcessDetection(serverName: string, running: boolean, pid?: number): void {
  vi.mock('child_process', async () => {
    const actual = await vi.importActual('child_process');

    return {
      ...actual,
      exec: vi.fn((command, callback) => {
        if (command.includes('pgrep') && command.includes('ProjectZomboid')) {
          if (running) {
            const testPid = pid || 12345;
            callback(null, { stdout: String(testPid), stderr: '' });
          } else {
            callback(null, { stdout: '', stderr: '' });
          }
        } else if (command.includes('ss -ulnp')) {
          if (running) {
            callback(null, {
              stdout: `udp UNCONN 0 0 0.0.0.0:16262 0.0.0.0:* pid=${pid || 12345}/"ProjectZomboid64"`,
              stderr: ''
            });
          } else {
            callback(null, { stdout: '', stderr: '' });
          }
        } else {
          const originalExec = (await vi.importActual('child_process')).exec;
          originalExec(command, callback);
        }
      })
    };
  });
}

/**
 * Mock Steam Workshop API response.
 *
 * @param modId - The workshop mod ID
 * @param title - The mod title to return
 * @param error - Optional error to simulate API failure
 */
export function mockSteamWorkshop(modId: string, title: string, error?: string): void {
  vi.mock('@/lib/mod-manager', async () => {
    const actual = await vi.importActual('@/lib/mod-manager');

    return {
      ...actual,
      fetchModTitleFromWorkshop: vi.fn((workshopId: string) => {
        if (error) {
          return Promise.reject(new Error(error));
        }
        return Promise.resolve(workshopId === modId ? title : null);
      })
    };
  });
}

/**
 * Mock file system operations.
 *
 * @param fileExists - Record mapping file paths to existence boolean
 */
export function mockFileSystem(fileExists: Record<string, boolean>): void {
  vi.mock('fs/promises', async () => {
    const actual = await vi.importActual('fs/promises');

    return {
      ...actual,
      access: vi.fn((path: string) => {
        const exists = fileExists[path] ?? false;
        return exists ? Promise.resolve() : Promise.reject(new Error('File not found'));
      }),
      readFile: vi.fn((path: string) => {
        if (fileExists[path]) {
          return Promise.resolve('mock file content');
        }
        return Promise.reject(new Error('File not found'));
      }),
      stat: vi.fn((path: string) => {
        if (fileExists[path]) {
          return Promise.resolve({
            isFile: () => true,
            isDirectory: () => false,
            size: 1024
          });
        }
        return Promise.reject(new Error('File not found'));
      }),
      readdir: vi.fn((path: string) => {
        if (fileExists[path]) {
          return Promise.resolve(['file1.txt', 'file2.ini']);
        }
        return Promise.reject(new Error('Directory not found'));
      })
    };
  });
}

/**
 * Mock server configuration files (INI files).
 *
 * @param serverName - The server name
 * @param configContent - The INI content to mock
 */
export function mockServerConfig(serverName: string, configContent: string): void {
  const configPath = `/root/server-cache/${serverName}/Server/${serverName}.ini`;

  vi.mock('fs/promises', async () => {
    const actual = await vi.importActual('fs/promises');

    return {
      ...actual,
      readFile: vi.fn((path: string) => {
        if (path === configPath) {
          return Promise.resolve(configContent);
        }
        return (actual as any).readFile(path);
      }),
      writeFile: vi.fn((path: string, content: string) => {
        if (path === configPath) {
          return Promise.resolve();
        }
        return (actual as any).writeFile(path, content);
      })
    };
  });
}

/**
 * Mock SSE (Server-Sent Events) stream.
 *
 * @param events - Array of events to emit { event, data }
 */
export function mockSSEStream(events: Array<{ event?: string; data: string }>): void {
  // Mock EventSource for client-side
  global.EventSource = vi.fn(() => {
    const mockSource: any = {
      readyState: 0, // CONNECTING
      url: '',
      onopen: null,
      onmessage: null,
      onerror: null,

      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),

      // Simulate events
      _emitEvents: function() {
        setTimeout(() => {
          this.readyState = 1; // OPEN
          if (this.onopen) this.onopen({} as Event);

          events.forEach(({ event, data }, index) => {
            setTimeout(() => {
              if (event && this.addEventListener) {
                const listeners = (this.addEventListener as any).mock.calls;
                listeners.forEach(([eventName, handler]: [string, Function]) => {
                  if (eventName === event) {
                    handler({ data } as MessageEvent);
                  }
                });
              }
            }, index * 10);
          });
        }, 0);
      },

      close: vi.fn(function() {
        this.readyState = 2; // CLOSED
      })
    };

    // Auto-emit events
    setTimeout(() => mockSource._emitEvents(), 0);

    return mockSource;
  }) as any;
}

/**
 * Mock log file watcher.
 *
 * @param serverName - The server name
 * @param logEntries - Array of log entries to return
 */
export function mockLogFileWatcher(
  serverName: string,
  logEntries: Array<{ timestamp: Date; level: string; message: string }>
): void {
  vi.mock('@/lib/log-watcher', async () => {
    const actual = await vi.importActual('@/lib/log-watcher');

    return {
      ...actual,
      startWatchingAll: vi.fn(() => Promise.resolve()),
      startWatchingRunning: vi.fn(() => Promise.resolve()),
      watchLogFile: vi.fn(() => Promise.resolve())
    };
  });
}

/**
 * Mock backup system operations.
 *
 * @param snapshots - Array of snapshots to return
 */
export function mockBackupSystem(snapshots: Array<{
  name: string;
  schedule: string;
  timestamp: string;
  size: number;
}>): void {
  vi.mock('@/lib/backup-manager', async () => {
    const actual = await vi.importActual('@/lib/backup-manager');

    return {
      ...actual,
      getSnapshots: vi.fn(() => Promise.resolve(snapshots)),
      createSnapshot: vi.fn(() => Promise.resolve({ success: true })),
      restoreSnapshot: vi.fn(() => Promise.resolve({ success: true }))
    };
  });
}

/**
 * Mock server manager operations.
 *
 * @param serverStatus - The server status to return
 */
export function mockServerManager(serverStatus: 'stopped' | 'starting' | 'running' | 'stopping'): void {
  vi.mock('@/lib/server-manager', async () => {
    const actual = await vi.importActual('@/lib/server-manager');

    return {
      ...actual,
      detectServers: vi.fn(() => Promise.resolve([
        { name: 'test-server', path: '/root/server-cache/test-server' }
      ])),
      getServerStatus: vi.fn(() => Promise.resolve(serverStatus)),
      startServer: vi.fn(() => Promise.resolve({
        success: true,
        jobId: `start-${Date.now()}-test`
      })),
      stopServer: vi.fn(() => Promise.resolve({
        success: true,
        jobId: `stop-${Date.now()}-test`
      }))
    };
  });
}

/**
 * Mock console manager for tmux console streaming.
 *
 * @param consoleLines - Array of console lines to stream
 */
export function mockConsoleManager(consoleLines: string[]): void {
  vi.mock('@/lib/console-manager', async () => {
    const actual = await vi.importActual('@/lib/console-manager');

    return {
      ...actual,
      startCapture: vi.fn(() => Promise.resolve()),
      stopCapture: vi.fn(() => Promise.resolve()),
      getConsoleOutput: vi.fn(() => Promise.resolve(consoleLines.join('\n')))
    };
  });
}

/**
 * Mock system monitoring metrics.
 *
 * @param metrics - Current system metrics
 */
export function mockSystemMetrics(metrics: {
  cpu: number;
  memory: number;
  swap: number;
  network?: { rx: number; tx: number };
}): void {
  vi.mock('@/lib/system-monitor', async () => {
    const actual = await vi.importActual('@/lib/system-monitor');

    const mockMonitor = {
      isRunning: true,
      start: vi.fn(() => Promise.resolve()),
      stop: vi.fn(() => Promise.resolve()),
      getCurrentMetrics: vi.fn(() => Promise.resolve(metrics)),
      getMetricsHistory: vi.fn(() => Promise.resolve([])),
      getSpikeEvents: vi.fn(() => Promise.resolve([]))
    };

    return {
      ...actual,
      getSystemMonitor: vi.fn(() => mockMonitor)
    };
  });
}

/**
 * Clear all mocks and restore original implementations.
 */
export function clearAllMocks(): void {
  vi.clearAllMocks();
  vi.resetAllMocks();
}

/**
 * Create a mock server in the database.
 * Useful for tests that need server data but not actual server processes.
 */
export async function createMockServerInDb(serverName: string): Promise<void> {
  const { query } = await import('@/lib/db');

  // Insert a mock server into INI config (if that table exists)
  // This is a placeholder - adjust based on your server storage approach
  await query(`
    INSERT INTO servers (name, path, created_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (name) DO NOTHING
  `, [serverName, `/root/server-cache/${serverName}`]);
}

/**
 * Mock external dependencies for a full server lifecycle test.
 * Combines multiple mocks for comprehensive testing.
 */
export function mockServerLifecycle(
  serverName: string,
  stages: {
    initial?: 'stopped' | 'running';
    duringStart?: 'starting' | 'running';
    afterStart?: 'running';
    duringStop?: 'stopping';
    afterStop?: 'stopped';
  } = {}
): void {
  const {
    initial = 'stopped',
    duringStart = 'starting',
    afterStart = 'running',
    duringStop = 'stopping',
    afterStop = 'stopped'
  } = stages;

  // Mock tmux sessions
  mockTmuxServerSession(serverName, initial === 'running');

  // Mock process detection
  mockProcessDetection(serverName, initial === 'running');

  // Mock server manager
  mockServerManager(initial);
}

/**
 * Mock tmux server session specifically.
 */
function mockTmuxServerSession(serverName: string, exists: boolean): void {
  const sessionName = `pz-${serverName}`;

  vi.mock('util', async () => {
    const actual = await vi.importActual('util');
    return {
      ...actual,
      promisify: vi.fn((fn: any) => {
        if (fn.name === 'exec') {
          return async (command: string) => {
            if (command.includes('tmux has-session')) {
              if (exists) {
                return { stdout: '', stderr: '' };
              } else {
                throw new Error('session not found');
              }
            } else if (command.includes('tmux list-sessions')) {
              if (exists) {
                return { stdout: sessionName, stderr: '' };
              } else {
                return { stdout: '', stderr: '' };
              }
            }
            return { stdout: '', stderr: '' };
          };
        }
        return (actual as any).promisify(fn);
      })
    };
  });
}
