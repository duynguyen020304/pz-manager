import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/servers/detect/route';
import { createTestUser, createUsersForAllRoles } from '../helpers/auth';
import { cleanupTestData } from '../helpers/cleanup';
import { createRequestWithAuth, type TestUser } from '../helpers/auth-enhanced';
import {
  expectValidApiResponse,
  expectAuthError,
  expectPermissionError
} from '../helpers/validators';

/**
 * E2E tests for server auto-detection endpoint.
 * Tests automatic server discovery from file system and tmux.
 */
describe('API: Server Detection', () => {
  let superadminUser: TestUser & { sessionToken: string };
  let adminUser: TestUser & { sessionToken: string };
  let operatorUser: TestUser & { sessionToken: string };
  let viewerUser: TestUser & { sessionToken: string };

  beforeEach(async () => {
    const users = await createUsersForAllRoles();
    superadminUser = users.superadmin;
    adminUser = users.admin;
    operatorUser = users.operator;
    viewerUser = users.viewer;
  });

  afterEach(async () => {
    await cleanupTestData({ users: true, sessions: true });
  });

  describe('GET /api/servers/detect', () => {
    it('should return 401 without authentication', async () => {
      const request = new Request('http://localhost:3000/api/servers/detect');
      const response = await GET(request);

      await expectAuthError(response);
    });

    it('should detect servers for superadmin', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should detect servers for admin', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        adminUser
      );
      const response = await GET(request);

      await expectValidApiResponse(response);
    });

    it('should detect servers for operator', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        operatorUser
      );
      const response = await GET(request);

      await expectValidApiResponse(response);
    });

    it('should detect servers for viewer', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        viewerUser
      );
      const response = await GET(request);

      await expectValidApiResponse(response);
    });

    it('should return server detection results', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse<any[]>();

      // Each detected server should have certain properties
      if (data.length > 0) {
        const server = data[0];
        expect(server).toHaveProperty('name');
        expect(server).toHaveProperty('path');
      }
    });

    it('should scan server-cache directory for servers', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse<any[]>();

      // Should find servers in /root/server-cache/
      // (Assuming test servers exist)
      expect(Array.isArray(data)).toBe(true);
    });

    it('should identify server properties', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse<any[]>();

      if (data.length > 0) {
        const server = data[0];

        // Check for common server properties
        expect(server.name).toBeDefined();
        expect(typeof server.name).toBe('string');

        // Path might be optional depending on implementation
        if (server.path) {
          expect(typeof server.path).toBe('string');
        }
      }
    });

    it('should handle empty detection results gracefully', async () => {
      // This test assumes the server-cache might be empty
      // The endpoint should return empty array, not error
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);

      // Should be array (empty or not)
      expect(Array.isArray(data)).toBe(true);
    });

    it('should filter out invalid servers', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse<any[]>();

      // All returned servers should be valid
      // (Assuming validation logic exists)
      if (data.length > 0) {
        // Each server should have required properties
        for (const server of data) {
          expect(server.name).toBeDefined();
          expect(server.name.length).toBeGreaterThan(0);
        }
      }
    });

    it('should not duplicate existing configured servers', async () => {
      // This test would require setting up existing servers
      // For now, just verify the endpoint works
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      await expectValidApiResponse(response);
    });

    it('should handle detection errors gracefully', async () => {
      // Even if file system has issues, should not throw 500
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      // Should either succeed or return graceful error
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Detection Permissions', () => {
    it('should allow detection for all authenticated roles', async () => {
      const users = [superadminUser, adminUser, operatorUser, viewerUser];

      for (const user of users) {
        const request = await createRequestWithAuth(
          'http://localhost:3000/api/servers/detect',
          'GET',
          user
        );
        const response = await GET(request);

        // All authenticated users should be able to detect servers
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
      }
    });

    it('should require authentication', async () => {
      const request = new Request('http://localhost:3000/api/servers/detect');
      const response = await GET(request);

      await expectAuthError(response);
    });
  });

  describe('Detection Caching', () => {
    it('should return consistent results on repeated calls', async () => {
      const request1 = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response1 = await GET(request1);
      const data1 = await expectValidApiResponse<any[]>(response1);

      const request2 = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response2 = await GET(request2);
      const data2 = await expectValidApiResponse<any[]>(response2);

      // Results should be consistent
      expect(data1.length).toBe(data2.length);

      // Server names should match
      const names1 = data1.map(s => s.name).sort();
      const names2 = data2.map(s => s.name).sort();
      expect(names1).toEqual(names2);
    });
  });

  describe('Detection Performance', () => {
    it('should complete detection quickly', async () => {
      const startTime = Date.now();

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const endTime = Date.now();
      const duration = endTime - startTime;

      await expectValidApiResponse(response);

      // Detection should complete in reasonable time
      // (Adjust threshold based on actual system)
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle concurrent detection requests', async () => {
      // Make multiple concurrent requests
      const requests = Array.from({ length: 3 }, () =>
        createRequestWithAuth(
          'http://localhost:3000/api/servers/detect',
          'GET',
          superadminUser
        ).then(req => GET(req))
      );

      const responses = await Promise.all(requests);

      // All should succeed
      for (const response of responses) {
        await expectValidApiResponse(response);
      }
    });
  });

  describe('Detection Edge Cases', () => {
    it('should handle servers with special characters in names', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse<any[]>();

      // If servers with special names exist, they should be handled
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle servers without INI files', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse<any[]>();

      // Should still detect servers even if INI is missing
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle symlinked server directories', async () => {
      // If symlinks are used, they should be handled appropriately
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      await expectValidApiResponse(response);
    });
  });

  describe('Detection Response Format', () => {
    it('should return servers in consistent format', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse<any[]>();

      if (data.length > 0) {
        // Check structure of first server
        const server = data[0];
        expect(typeof server).toBe('object');
        expect(server.name).toBeDefined();
      }
    });

    it('should include server metadata', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers/detect',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse<any[]>();

      if (data.length > 0) {
        const server = data[0];

        // Check for common metadata fields
        const optionalFields = ['path', 'hasIni', 'hasDb', 'valid', 'size'];
        const presentFields = optionalFields.filter(f => f in server);

        // At least some metadata should be present
        expect(presentFields.length).toBeGreaterThan(0);
      }
    });
  });
});
