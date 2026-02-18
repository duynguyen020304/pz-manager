import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, POST, PATCH, DELETE } from '@/app/api/servers/[name]/mods/route';
import { createUsersForAllRoles } from '../helpers/auth';
import { cleanupTestData } from '../helpers/cleanup';
import { createRequestWithAuth, type TestUser } from '../helpers/auth-enhanced';
import {
  expectValidApiResponse,
  expectAuthError,
  expectPermissionError
} from '../helpers/validators';

/**
 * E2E tests for mod management endpoints.
 */
describe('API: Mods', () => {
  let users: Record<string, TestUser & { sessionToken: string }>;
  const testServer = 'servertest';

  beforeEach(async () => {
    users = await createUsersForAllRoles();
  });

  afterEach(async () => {
    await cleanupTestData({ users: true, sessions: true });
  });

  describe('GET /api/servers/[name]/mods', () => {
    it('should require authentication', async () => {
      const request = new Request(`http://localhost:3000/api/servers/${testServer}/mods`);
      const response = await GET(request, { params: { name: testServer } });
      await expectAuthError(response);
    });

    it('should return mods for superadmin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/mods`,
        'GET',
        users.superadmin
      );
      const response = await GET(request, { params: { name: testServer } });
      await expectValidApiResponse(response);
    });

    it('should return mods for viewer', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/mods`,
        'GET',
        users.viewer
      );
      const response = await GET(request, { params: { name: testServer } });
      await expectValidApiResponse(response);
    });

    it('should return mods array', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/mods`,
        'GET',
        users.superadmin
      );

      const data = await expectValidApiResponse();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('POST /api/servers/[name]/mods', () => {
    it('should require authentication', async () => {
      const request = new Request(`http://localhost:3000/api/servers/${testServer}/mods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=123' })
      });

      const response = await POST(request, { params: { name: testServer } });
      await expectAuthError(response);
    });

    it('should add mod as superadmin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/mods`,
        'POST',
        users.superadmin,
        { modUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=123456' }
      );

      const response = await POST(request, { params: { name: testServer } });
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should add mod as admin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/mods`,
        'POST',
        users.admin,
        { workshopId: '123456' }
      );

      const response = await POST(request, { params: { name: testServer } });
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should forbid adding mod by operator', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/mods`,
        'POST',
        users.operator,
        { workshopId: '123456' }
      );

      const response = await POST(request, { params: { name: testServer } });
      await expectPermissionError(response);
    });

    it('should forbid adding mod by viewer', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/mods`,
        'POST',
        users.viewer,
        { workshopId: '123456' }
      );

      const response = await POST(request, { params: { name: testServer } });
      await expectPermissionError(response);
    });
  });

  describe('PATCH /api/servers/[name]/mods/order', () => {
    it('should require authentication', async () => {
      const request = new Request(`http://localhost:3000/api/servers/${testServer}/mods/order`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mods: ['mod1', 'mod2'] })
      });

      const response = await PATCH(request, { params: { name: testServer } });
      await expectAuthError(response);
    });

    it('should reorder mods as superadmin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/mods/order`,
        'PATCH',
        users.superadmin,
        { mods: ['mod1', 'mod2', 'mod3'] }
      );

      const response = await PATCH(request, { params: { name: testServer } });
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should forbid reordering by operator', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/mods/order`,
        'PATCH',
        users.operator,
        { mods: ['mod1', 'mod2'] }
      );

      const response = await PATCH(request, { params: { name: testServer } });
      await expectPermissionError(response);
    });
  });

  describe('DELETE /api/servers/[name]/mods', () => {
    it('should require authentication', async () => {
      const request = new Request(`http://localhost:3000/api/servers/${testServer}/mods?workshopId=123`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { name: testServer } });
      await expectAuthError(response);
    });

    it('should remove mod as superadmin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/mods?workshopId=123456`,
        'DELETE',
        users.superadmin
      );

      const response = await DELETE(request, { params: { name: testServer } });
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should forbid removing mod by operator', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/mods?workshopId=123456`,
        'DELETE',
        users.operator
      );

      const response = await DELETE(request, { params: { name: testServer } });
      await expectPermissionError(response);
    });
  });
});
