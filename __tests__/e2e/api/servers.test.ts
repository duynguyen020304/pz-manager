import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST, DELETE } from '@/app/api/servers/route';
import { createAuthenticatedRequest } from '../helpers/auth';
import { mockTmux } from '../mocks/tmux';
import { mockProcesses } from '../mocks/processes';
import { setupMockServerFileSystem } from '../mocks';
import mockFs from 'mock-fs';
import fs from 'fs/promises';

describe('/api/servers', () => {
  beforeEach(async () => {
    // Reset all mocks
    mockTmux?.reset();
    mockProcesses?.reset();
    
    // Setup default mock file system
    const defaultFs = {
      '/root/server-cache': {},
      '/opt/zomboid-backups': {
        'config': {
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
        'snapshots': {}
      },
      '/tmp': {}
    };
    
    mockFs(defaultFs);
  });

  describe('GET /api/servers', () => {
    it('should return empty list when no servers exist', async () => {
      const request = await createAuthenticatedRequest('http://localhost:3000/api/servers');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should return list of configured servers', async () => {
      // Setup a server in the config
      const configPath = '/opt/zomboid-backups/config/backup-config.json';
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      config.servers = ['test-server-1', 'test-server-2'];
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      // Setup mock file system for servers
      const serverFs = {
        ...setupMockServerFileSystem('test-server-1', { hasIni: true, hasDb: true, hasMapFiles: true }),
        ...setupMockServerFileSystem('test-server-2', { hasIni: false, hasDb: true, hasMapFiles: true }),
      };
      mockFs(serverFs);
      
      const request = await createAuthenticatedRequest('http://localhost:3000/api/servers');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe('test-server-1');
      expect(data.data[0].valid).toBe(true);
      expect(data.data[0].hasIni).toBe(true);
      expect(data.data[0].hasDb).toBe(true);
      expect(data.data[1].name).toBe('test-server-2');
      expect(data.data[1].valid).toBe(true);
      expect(data.data[1].hasIni).toBe(false);
    });

    it('should reject unauthenticated requests', async () => {
      const request = new Request('http://localhost:3000/api/servers');
      
      const response = await GET(request as unknown as Parameters<typeof GET>[0]);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication');
    });
  });

  describe('POST /api/servers', () => {
    it('should add a new server successfully', async () => {
      const request = await createAuthenticatedRequest('http://localhost:3000/api/servers', {
        method: 'POST',
        body: JSON.stringify({ name: 'new-server' })
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('new-server');
      
      // Verify server was added to config
      const configPath = '/opt/zomboid-backups/config/backup-config.json';
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      expect(config.servers).toContain('new-server');
    });

    it('should reject invalid server names', async () => {
      const invalidNames = ['', 'invalid@name', 'name with spaces', 'name\nwith\nnewlines'];
      
      for (const name of invalidNames) {
        const request = await createAuthenticatedRequest('http://localhost:3000/api/servers', {
          method: 'POST',
          body: JSON.stringify({ name })
        });
        
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toMatch(/required|Invalid server name/);
      }
    });

    it('should reject duplicate server names', async () => {
      // First, add a server
      const request1 = await createAuthenticatedRequest('http://localhost:3000/api/servers', {
        method: 'POST',
        body: JSON.stringify({ name: 'duplicate-server' })
      });
      await POST(request1);
      
      // Try to add the same server again
      const request2 = await createAuthenticatedRequest('http://localhost:3000/api/servers', {
        method: 'POST',
        body: JSON.stringify({ name: 'duplicate-server' })
      });
      
      const response = await POST(request2);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already exists');
    });

    it('should accept valid server names with hyphens and underscores', async () => {
      const validNames = ['my-server', 'my_server', 'MyServer123', 'server-1_test'];
      
      for (let i = 0; i < validNames.length; i++) {
        const name = validNames[i];
        const request = await createAuthenticatedRequest('http://localhost:3000/api/servers', {
          method: 'POST',
          body: JSON.stringify({ name })
        });
        
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.message).toContain(name);
      }
    });
  });

  describe('DELETE /api/servers', () => {
    it('should remove a server successfully', async () => {
      // First add a server
      const addRequest = await createAuthenticatedRequest('http://localhost:3000/api/servers', {
        method: 'POST',
        body: JSON.stringify({ name: 'server-to-remove' })
      });
      await POST(addRequest);
      
      // Then remove it
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/servers?name=server-to-remove',
        { method: 'DELETE' }
      );
      
      const response = await DELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('server-to-remove');
      
      // Verify server was removed from config
      const configPath = '/opt/zomboid-backups/config/backup-config.json';
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      expect(config.servers).not.toContain('server-to-remove');
    });

    it('should reject removal without name parameter', async () => {
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/servers',
        { method: 'DELETE' }
      );
      
      const response = await DELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('required');
    });

    it('should reject removal of non-existent server', async () => {
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/servers?name=nonexistent-server',
        { method: 'DELETE' }
      );
      
      const response = await DELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });
  });
});
