import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/logs/route';
import { createUsersForAllRoles } from '../helpers/auth';
import { cleanupTestData } from '../helpers/cleanup';
import { createRequestWithAuth, type TestUser } from '../helpers/auth-enhanced';
import {
  expectValidApiResponse,
  expectAuthError
} from '../helpers/validators';

/**
 * E2E tests for log management endpoints.
 */
describe('API: Logs', () => {
  let users: Record<string, TestUser & { sessionToken: string }>;

  beforeEach(async () => {
    users = await createUsersForAllRoles();
  });

  afterEach(async () => {
    await cleanupTestData({ users: true, sessions: true });
  });

  describe('GET /api/logs', () => {
    it('should require authentication', async () => {
      const request = new Request('http://localhost:3000/api/logs');
      const response = await GET(request);
      await expectAuthError(response);
    });

    it('should return logs for superadmin', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/logs',
        'GET',
        users.superadmin
      );
      const response = await GET(request);
      await expectValidApiResponse(response);
    });

    it('should return logs for viewer', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/logs',
        'GET',
        users.viewer
      );
      const response = await GET(request);
      await expectValidApiResponse(response);
    });

    it('should support filtering by server', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/logs?server=servertest',
        'GET',
        users.superadmin
      );
      const response = await GET(request);
      await expectValidApiResponse(response);
    });

    it('should support filtering by event type', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/logs?eventType=chat',
        'GET',
        users.superadmin
      );
      const response = await GET(request);
      await expectValidApiResponse(response);
    });

    it('should support pagination', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/logs?limit=50',
        'GET',
        users.superadmin
      );
      const response = await GET(request);
      await expectValidApiResponse(response);
    });

    it('should support date range filtering', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/logs?from=2026-01-01&to=2026-12-31',
        'GET',
        users.superadmin
      );
      const response = await GET(request);
      await expectValidApiResponse(response);
    });
  });

  describe('SSE /api/logs/stream', () => {
    it('should require authentication', async () => {
      const request = new Request('http://localhost:3000/api/logs/stream');
      const response = await fetch(request);
      expect(response.status).toBe(401);
    });

    it('should establish SSE connection for superadmin', async () => {
      const url = `http://localhost:3000/api/logs/stream?server=servertest&types=chat,server`;

      const response = await fetch(url, {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
    });

    it('should establish SSE connection for viewer', async () => {
      const url = `http://localhost:3000/api/logs/stream?server=servertest`;

      const response = await fetch(url, {
        headers: {
          Cookie: `session=${users.viewer.sessionToken}`
        }
      });

      expect(response.status).toBe(200);
    });

    it('should support filtering by event types', async () => {
      const url = `http://localhost:3000/api/logs/stream?server=servertest&types=chat`;

      const response = await fetch(url, {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        }
      });

      expect(response.status).toBe(200);
    });
  });
});
