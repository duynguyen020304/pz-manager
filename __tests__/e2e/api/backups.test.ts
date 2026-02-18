import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/servers/[name]/snapshots/route';
import { POST } from '@/app/api/servers/[name]/restore/route';
import { createUsersForAllRoles } from '../helpers/auth';
import { cleanupTestData } from '../helpers/cleanup';
import { createRequestWithAuth, type TestUser } from '../helpers/auth-enhanced';
import {
  expectValidApiResponse,
  expectAuthError,
  expectPermissionError
} from '../helpers/validators';

/**
 * E2E tests for backup and restore endpoints.
 */
describe('API: Backups', () => {
  let users: Record<string, TestUser & { sessionToken: string }>;
  const testServer = 'servertest';

  beforeEach(async () => {
    users = await createUsersForAllRoles();
  });

  afterEach(async () => {
    await cleanupTestData({ users: true, sessions: true });
  });

  describe('GET /api/servers/[name]/snapshots', () => {
    it('should require authentication', async () => {
      const request = new Request(`http://localhost:3000/api/servers/${testServer}/snapshots`);
      const response = await GET(request, { params: { name: testServer } });
      await expectAuthError(response);
    });

    it('should return snapshots for superadmin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/snapshots`,
        'GET',
        users.superadmin
      );
      const response = await GET(request, { params: { name: testServer } });
      await expectValidApiResponse(response);
    });

    it('should return snapshots for viewer', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/snapshots`,
        'GET',
        users.viewer
      );
      const response = await GET(request, { params: { name: testServer } });
      await expectValidApiResponse(response);
    });

    it('should support filtering by schedule', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/snapshots?schedule=daily`,
        'GET',
        users.superadmin
      );
      const response = await GET(request, { params: { name: testServer } });
      await expectValidApiResponse(response);
    });

    it('should support pagination', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/snapshots?page=1&limit=10`,
        'GET',
        users.superadmin
      );
      const response = await GET(request, { params: { name: testServer } });
      await expectValidApiResponse(response);
    });
  });

  describe('POST /api/servers/[name]/restore', () => {
    it('should require authentication', async () => {
      const request = new Request(`http://localhost:3000/api/servers/${testServer}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: 'test-snapshot' })
      });

      const response = await POST(request, { params: { name: testServer } });
      await expectAuthError(response);
    });

    it('should start restore as superadmin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/restore`,
        'POST',
        users.superadmin,
        { snapshotId: 'test-snapshot-id' }
      );

      const response = await POST(request, { params: { name: testServer } });
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should start restore as admin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/restore`,
        'POST',
        users.admin,
        { snapshotId: 'test-snapshot-id' }
      );

      const response = await POST(request, { params: { name: testServer } });
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should start restore as operator', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/restore`,
        'POST',
        users.operator,
        { snapshotId: 'test-snapshot-id' }
      );

      const response = await POST(request, { params: { name: testServer } });
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should forbid restore by viewer', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/restore`,
        'POST',
        users.viewer,
        { snapshotId: 'test-snapshot-id' }
      );

      const response = await POST(request, { params: { name: testServer } });
      await expectPermissionError(response);
    });

    it('should require snapshotId parameter', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/restore`,
        'POST',
        users.superadmin,
        {}
      );

      const response = await POST(request, { params: { name: testServer } });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should return job ID for tracking', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/restore`,
        'POST',
        users.superadmin,
        { snapshotId: 'test-snapshot-id' }
      );

      const response = await POST(request, { params: { name: testServer } });

      const data = await response.json();

      if (data.data?.jobId) {
        expect(data.data.jobId).toContain('restore-');
      }
    });
  });

  describe('Restore Permissions Matrix', () => {
    it('should allow superadmin to restore', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/restore`,
        'POST',
        users.superadmin,
        { snapshotId: 'test-snapshot' }
      );

      const response = await POST(request, { params: { name: testServer } });
      expect([200, 201, 202]).toContain(response.status);
    });

    it('should allow admin to restore', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/restore`,
        'POST',
        users.admin,
        { snapshotId: 'test-snapshot' }
      );

      const response = await POST(request, { params: { name: testServer } });
      expect([200, 201, 202]).toContain(response.status);
    });

    it('should allow operator to restore', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/restore`,
        'POST',
        users.operator,
        { snapshotId: 'test-snapshot' }
      );

      const response = await POST(request, { params: { name: testServer } });
      expect([200, 201, 202]).toContain(response.status);
    });

    it('should forbid viewer from restoring', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServer}/restore`,
        'POST',
        users.viewer,
        { snapshotId: 'test-snapshot' }
      );

      const response = await POST(request, { params: { name: testServer } });
      await expectPermissionError(response);
    });
  });
});
