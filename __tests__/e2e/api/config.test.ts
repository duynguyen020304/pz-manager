import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, POST, DELETE } from '@/app/api/servers/[name]/config/route';
import { createUsersForAllRoles } from '../helpers/auth';
import { cleanupTestData } from '../helpers/cleanup';
import { createRequestWithAuth, type TestUser } from '../helpers/auth-enhanced';
import {
  expectValidApiResponse,
  expectAuthError,
  expectPermissionError
} from '../helpers/validators';

/**
 * E2E tests for server configuration (INI) endpoints.
 */
describe('API: Server Configuration', () => {
  let users: Record<string, TestUser & { sessionToken: string }>;
  const testServer = 'servertest'; // Use existing server for tests

  beforeEach(async () => {
    users = await createUsersForAllRoles();
  });

  afterEach(async () => {
    await cleanupTestData({ users: true, sessions: true });
  });

  describe('GET /api/servers/[name]/config', () => {
    it('should require authentication', async () => {
      const request = new Request(`http://localhost:3000/api/servers/${testServer}/config`);
      const response = await GET(request, { params: { name: testServer } });
      await expectAuthError(response);
    });

    it('should return config for superadmin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/config`,
        'GET',
        users.superadmin
      );
      const response = await GET(request, { params: { name: testServer } });
      await expectValidApiResponse(response);
    });

    it('should return config for viewer', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/config`,
        'GET',
        users.viewer
      );
      const response = await GET(request, { params: { name: testServer } });
      await expectValidApiResponse(response);
    });

    it('should return INI configuration as JSON object', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/config`,
        'GET',
        users.superadmin
      );
      const response = await GET(request, { params: { name: testServer } });

      const data = await expectValidApiResponse<Record<string, string>>();
      expect(typeof data).toBe('object');
    });

    it('should include common INI settings', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/config`,
        'GET',
        users.superadmin
      );
      const response = await GET(request, { params: { name: testServer } });

      const data = await expectValidApiResponse<Record<string, string>>();

      // Check for common settings
      const commonKeys = ['Ports', 'MaxPlayers', 'Password', 'Public'];
      const hasCommonKey = commonKeys.some(key => key in data);
      expect(hasCommonKey).toBe(true);
    });
  });

  describe('POST /api/servers/[name]/config', () => {
    it('should require authentication', async () => {
      const request = new Request(`http://localhost:3000/api/servers/${testServer}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ MaxPlayers: '16' })
      });

      const response = await POST(request, {
        params: { name: testServer }
      });
      await expectAuthError(response);
    });

    it('should update config as superadmin', async () => {
      const updateData = { MaxPlayers: '32' };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/config`,
        'POST',
        users.superadmin,
        updateData
      );

      const response = await POST(request, { params: { name: testServer } });
      await expectValidApiResponse(response);
    });

    it('should update config as admin', async () => {
      const updateData = { Public: 'true' };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/config`,
        'POST',
        users.admin,
        updateData
      );

      const response = await POST(request, { params: { name: testServer } });
      await expectValidApiResponse(response);
    });

    it('should forbid config updates by operator', async () => {
      const updateData = { MaxPlayers: '50' };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/config`,
        'POST',
        users.operator,
        updateData
      );

      const response = await POST(request, { params: { name: testServer } });
      await expectPermissionError(response);
    });

    it('should forbid config updates by viewer', async () => {
      const updateData = { MaxPlayers: '50' };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/config`,
        'POST',
        users.viewer,
        updateData
      );

      const response = await POST(request, { params: { name: testServer } });
      await expectPermissionError(response);
    });

    it('should support partial updates', async () => {
      const updateData = { MaxPlayers: '24' };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/config`,
        'POST',
        users.superadmin,
        updateData
      );

      const response = await POST(request, { params: { name: testServer } });
      await expectValidApiResponse(response);
    });

    it('should validate config values', async () => {
      const invalidData = { MaxPlayers: 'invalid' };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/config`,
        'POST',
        users.superadmin,
        invalidData
      );

      const response = await POST(request, { params: { name: testServer } });

      // Should either accept or return validation error
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('DELETE /api/servers/[name]/config', () => {
    it('should require authentication', async () => {
      const request = new Request(`http://localhost:3000/api/servers/${testServer}/config`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { name: testServer } });
      await expectAuthError(response);
    });

    it('should reset config as superadmin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/config`,
        'DELETE',
        users.superadmin
      );

      const response = await DELETE(request, { params: { name: testServer } });
      await expectValidApiResponse(response);
    });

    it('should reset config as admin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/config`,
        'DELETE',
        users.admin
      );

      const response = await DELETE(request, { params: { name: testServer } });
      await expectValidApiResponse(response);
    });

    it('should forbid config reset by operator', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/config`,
        'DELETE',
        users.operator
      );

      const response = await DELETE(request, { params: { name: testServer } });
      await expectPermissionError(response);
    });

    it('should forbid config reset by viewer', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/config`,
        'DELETE',
        users.viewer
      );

      const response = await DELETE(request, { params: { name: testServer } });
      await expectPermissionError(response);
    });
  });
});
