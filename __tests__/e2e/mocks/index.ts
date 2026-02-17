import { vi } from 'vitest';
import * as mockFs from 'mock-fs';
import { mockTmux } from './tmux';
import { mockProcesses } from './processes';

// Re-export mocks
export { mockTmux, mockProcesses };

// Mock shelljs exec function
export function setupShellJsMock() {
  vi.mock('shelljs', () => ({
    default: {
      exec: vi.fn((command: string, options?: any, callback?: any) => {
        // Handle different command types
        
        // tmux commands
        if (command.startsWith('tmux new-session')) {
          const match = command.match(/-s\s+(\S+)/);
          const sessionName = match ? match[1] : '';
          const result = mockTmux.createSession(sessionName);
          if (callback) callback(result.exitCode, result.stdout, result.stderr);
          return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
        }

        if (command.startsWith('tmux kill-session')) {
          const match = command.match(/-t\s+(\S+)/);
          const sessionName = match ? match[1] : '';
          const result = mockTmux.killSession(sessionName);
          if (callback) callback(result.exitCode, result.stdout, result.stderr);
          return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
        }

        if (command.startsWith('tmux has-session')) {
          const match = command.match(/-t\s+(\S+)/);
          const sessionName = match ? match[1] : '';
          const result = mockTmux.hasSession(sessionName);
          if (callback) callback(result.exitCode, result.stdout, result.stderr);
          return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
        }

        if (command.startsWith('tmux send-keys')) {
          const match = command.match(/-t\s+(\S+)\s+"(.+?)"/);
          const sessionName = match ? match[1] : '';
          const keys = match ? match[2] : '';
          const result = mockTmux.sendKeys(sessionName, keys);
          if (callback) callback(result.exitCode, result.stdout, result.stderr);
          return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
        }

        if (command.startsWith('tmux capture-pane')) {
          const match = command.match(/-t\s+(\S+)/);
          const sessionName = match ? match[1] : '';
          const result = mockTmux.capturePane(sessionName);
          if (callback) callback(result.exitCode, result.stdout, result.stderr);
          return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
        }

        // Process commands
        if (command.startsWith('pgrep -f')) {
          const pattern = command.replace('pgrep -f', '').trim().replace(/^["']|["']$/g, '');
          const result = mockProcesses.pgrep(pattern);
          if (callback) callback(result.exitCode, result.stdout, result.stderr);
          return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
        }

        if (command.startsWith('ps -o etime=')) {
          const match = command.match(/-p\s+(\d+)/);
          const pid = match ? parseInt(match[1]) : 0;
          const result = mockProcesses.psUptime(pid);
          if (callback) callback(result.exitCode, result.stdout, result.stderr);
          return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
        }

        if (command.startsWith('ss -ulnp')) {
          const match = command.match(/:(\d+)/);
          const port = match ? parseInt(match[1]) : 0;
          const result = mockProcesses.ssPort(port);
          if (callback) callback(result.exitCode, result.stdout, result.stderr);
          return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
        }

        // Disk usage command
        if (command.startsWith('du -sb')) {
          // Mock directory size
          if (callback) callback(0, '104857600', ''); // 100MB
          return { code: 0, stdout: '104857600', stderr: '' };
        }

        // Default: success with empty output
        if (callback) callback(0, '', '');
        return { code: 0, stdout: '', stderr: '' };
      }),
      which: vi.fn(() => ({ code: 0, stdout: '/usr/bin/tmux' })),
      config: { silent: true }
    },
    exec: vi.fn(),
    which: vi.fn()
  }));
}

// Setup mock file system for a server
export function setupMockServerFileSystem(serverName: string, options: {
  hasIni?: boolean;
  hasDb?: boolean;
  hasMapFiles?: boolean;
} = {}) {
  const { hasIni = true, hasDb = true, hasMapFiles = true } = options;
  
  const basePath = `/root/server-cache/${serverName}`;
  const fsConfig: Record<string, any> = {};

  // Base structure
  fsConfig[basePath] = {
    Logs: {},
    Server: {},
    db: {},
    Saves: {
      Multiplayer: {
        [serverName]: hasMapFiles ? {
          'map_meta.bin': Buffer.from([0x00]),
          map: {},
          chunkdata: {}
        } : {}
      }
    },
    steamapps: {
      workshop: {
        content: {
          '108600': {}
        }
      }
    },
    Mods: {}
  };

  // Add INI file if specified
  if (hasIni) {
    fsConfig[basePath].Server[`${serverName}.ini`] = `
PublicName=${serverName}
PublicDescription=Test server
MaxPlayers=16
PVP=true
SafehouseAllowRespawn=true
Password=
AdminPassword=test123
Mods=
WorkshopItems=
Map=Muldraugh, KY
DefaultPort=16261
UDPPort=16262
RCONPort=27015
`;
  }

  // Add DB file if specified
  if (hasDb) {
    fsConfig[basePath].db[`${serverName}.db`] = Buffer.from([0x00]);
  }

  return fsConfig;
}

// Reset all mocks
export function resetAllMocks() {
  mockTmux.reset();
  mockProcesses.reset();
  mockFs.restore();
}
