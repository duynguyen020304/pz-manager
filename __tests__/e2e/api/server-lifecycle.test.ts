import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST as startServer } from '@/app/api/servers/[name]/start/route';
import { POST as stopServer } from '@/app/api/servers/[name]/stop/route';
import { POST as abortServer } from '@/app/api/servers/[name]/abort/route';
import { GET as getServerStatus } from '@/app/api/servers/[name]/status/route';
import { GET as getAllServerStatus } from '@/app/api/servers/status/route';
import { createAuthenticatedRequest } from '../helpers/auth';
import type { ServerStatus } from '@/types';
import { mockTmux } from '../mocks/tmux';
import { mockProcesses } from '../mocks/processes';
import mockFs from 'mock-fs';
import fs from 'fs/promises';


describe('Server Lifecycle Operations', () => {
  beforeEach(async () => {
    // Reset all mocks
    mockTmux?.reset();
    mockProcesses?.reset();
    
    // Setup default mock file system with config
    const defaultFs = {
      '/root/server-cache': {},
      '/opt/zomboid-backups': {
        'config': {
          'backup-config.json': JSON.stringify({
            version: '1.0.0',
            savesPath: '/root/Zomboid/Saves',
            servers: ['test-server'],
            snapshotsPath: '/opt/zomboid-backups/snapshots',
            compression: { enabled: true, algorithm: 'zstd', level: 3 },
            integrity: { enabled: true, algorithm: 'sha256' },
            schedules: [],
            notifications: {},
            performance: {},
            autoRollback: { enabled: false }
          }, null, 2)
        },
        'snapshots': {}
      },
      '/tmp': {}
    };
    
    mockFs(defaultFs);
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe('POST /api/servers/[name]/start', () => {
    it('should start a stopped server and return jobId', async () => {
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/servers/test-server/start',
        { method: 'POST' }
      );
      
      const response = await startServer(request, { params: Promise.resolve({ name: 'test-server' }) });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.jobId).toBeDefined();
      expect(data.data.message).toContain('Starting');
    });

    it('should reject starting already running server', async () => {
      // Mock server as running
      mockProcesses.addProcess({
        name: 'java',
        command: `ProjectZomboid64 -servername test-server`,
        ports: [16261, 16262, 27015],
        uptime: '00:05:30'
      });
      
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/servers/test-server/start',
        { method: 'POST' }
      );
      
      const response = await startServer(request, { params: Promise.resolve({ name: 'test-server' }) });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already running');
    });

    it('should reject starting non-existent server', async () => {
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/servers/nonexistent-server/start',
        { method: 'POST' }
      );
      
      const response = await startServer(request, { params: Promise.resolve({ name: 'nonexistent-server' }) });
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/servers/[name]/stop', () => {
    it('should stop a running server and return jobId', async () => {
      // Mock server as running
      mockProcesses.addProcess({
        name: 'java',
        command: `ProjectZomboid64 -servername test-server`,
        ports: [16261, 16262, 27015],
        uptime: '00:05:30'
      });
      
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/servers/test-server/stop',
        { method: 'POST' }
      );
      
      const response = await stopServer(request, { params: Promise.resolve({ name: 'test-server' }) });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.jobId).toBeDefined();
      expect(data.data.message).toContain('Stopping');
    });

    it('should reject stopping already stopped server', async () => {
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/servers/test-server/stop',
        { method: 'POST' }
      );
      
      const response = await stopServer(request, { params: Promise.resolve({ name: 'test-server' }) });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not running');
    });
  });

  describe('POST /api/servers/[name]/abort', () => {
    it('should abort a pending start operation', async () => {
      // First start a server (creates a job)
      const startRequest = await createAuthenticatedRequest(
        'http://localhost:3000/api/servers/test-server/start',
        { method: 'POST' }
      );
      const startResponse = await startServer(startRequest, { params: Promise.resolve({ name: 'test-server' }) });
      const startData = await startResponse.json();
      const jobId = startData.data.jobId;
      
      // Then abort it
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/servers/test-server/abort',
        {
          method: 'POST',
          body: JSON.stringify({ jobId })
        }
      );
      
      const response = await abortServer(request, { params: Promise.resolve({ name: 'test-server' }) });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 for non-existent job', async () => {
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/servers/test-server/abort',
        {
          method: 'POST',
          body: JSON.stringify({ jobId: 'nonexistent-job-id' })
        }
      );
      
      const response = await abortServer(request, { params: Promise.resolve({ name: 'test-server' }) });
      
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/servers/[name]/status', () => {
    it('should return stopped status for non-running server', async () => {
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/servers/test-server/status'
      );
      
      const response = await getServerStatus(request, { params: Promise.resolve({ name: 'test-server' }) });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.state).toBe('stopped');
      expect(data.data.name).toBe('test-server');
    });

    it('should return running status with details for running server', async () => {
      // Mock server as running
      mockProcesses.addProcess({
        name: 'java',
        command: `ProjectZomboid64 -servername test-server`,
        ports: [16261, 16262, 27015],
        uptime: '00:05:30'
      });
      
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/servers/test-server/status'
      );
      
      const response = await getServerStatus(request, { params: Promise.resolve({ name: 'test-server' }) });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.state).toBe('running');
      expect(data.data.pid).toBeDefined();
      expect(data.data.ports).toBeDefined();
      expect(data.data.ports.defaultPort).toBe(16261);
    });
  });

  describe('GET /api/servers/status', () => {
    it('should return status for all configured servers', async () => {
      // Add multiple servers to config
      const configPath = '/opt/zomboid-backups/config/backup-config.json';
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      config.servers = ['server-1', 'server-2', 'server-3'];
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      // Mock one as running
      mockProcesses.addProcess({
        name: 'java',
        command: `ProjectZomboid64 -servername server-2`,
        ports: [16271, 16272, 27025],
        uptime: '00:10:00'
      });
      
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/servers/status'
      );
      
      const response = await getAllServerStatus(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3);
      
      // Check that server-2 is marked as running
      const server2 = data.data.find((s: ServerStatus) => s.name === 'server-2');
      expect(server2?.state).toBe('running');
      
      // Others should be stopped
      const server1 = data.data.find((s: ServerStatus) => s.name === 'server-1');
      expect(server1?.state).toBe('stopped');
    });
  });
});
