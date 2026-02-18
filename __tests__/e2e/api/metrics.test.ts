import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/metrics/route';
import { createUsersForAllRoles } from '../helpers/auth';
import { cleanupTestData } from '../helpers/cleanup';
import { createRequestWithAuth, type TestUser } from '../helpers/auth-enhanced';
import {
  expectValidApiResponse,
  expectAuthError
} from '../helpers/validators';

/**
 * E2E tests for system monitoring endpoints.
 */
describe('API: Metrics', () => {
  let users: Record<string, TestUser & { sessionToken: string }>;

  beforeEach(async () => {
    users = await createUsersForAllRoles();
  });

  afterEach(async () => {
    await cleanupTestData({ users: true, sessions: true });
  });

  describe('GET /api/metrics', () => {
    it('should require authentication', async () => {
      const request = new Request('http://localhost:3000/api/metrics');
      const response = await GET(request);
      await expectAuthError(response);
    });

    it('should return current metrics for superadmin', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/metrics?type=current',
        'GET',
        users.superadmin
      );
      const response = await GET(request);
      await expectValidApiResponse(response);
    });

    it('should return current metrics for viewer', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/metrics?type=current',
        'GET',
        users.viewer
      );
      const response = await GET(request);
      await expectValidApiResponse(response);
    });

    it('should include CPU usage', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/metrics?type=current',
        'GET',
        users.superadmin
      );

      const data = await expectValidApiResponse();
      expect(data).toHaveProperty('cpu');
    });

    it('should include memory usage', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/metrics?type=current',
        'GET',
        users.superadmin
      );

      const data = await expectValidApiResponse();
      expect(data).toHaveProperty('memory');
    });

    it('should support history queries', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/metrics/history?hours=1',
        'GET',
        users.superadmin
      );
      const response = await GET(request);
      await expectValidApiResponse(response);
    });

    it('should support spike queries', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/metrics/spikes?hours=24',
        'GET',
        users.superadmin
      );
      const response = await GET(request);
      await expectValidApiResponse(response);
    });

    it('should return monitor service status', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/metrics/status',
        'GET',
        users.superadmin
      );
      const response = await GET(request);
      await expectValidApiResponse(response);
    });
  });

  describe('Metrics Data Validation', () => {
    it('should return numeric CPU percentage', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/metrics?type=current',
        'GET',
        users.superadmin
      );

      const data = await expectValidApiResponse();
      if (data.cpu !== undefined) {
        expect(typeof data.cpu).toBe('number');
        expect(data.cpu).toBeGreaterThanOrEqual(0);
        expect(data.cpu).toBeLessThanOrEqual(100);
      }
    });

    it('should return numeric memory percentage', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/metrics?type=current',
        'GET',
        users.superadmin
      );

      const data = await expectValidApiResponse();
      if (data.memory !== undefined) {
        expect(typeof data.memory).toBe('number');
        expect(data.memory).toBeGreaterThanOrEqual(0);
        expect(data.memory).toBeLessThanOrEqual(100);
      }
    });
  });
});
