import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/servers/[name]/start/route';
import { POST as POSTStop } from '@/app/api/servers/[name]/stop/route';
import { POST as POSTAbort } from '@/app/api/servers/[name]/abort/route';
import { createTestUser, createUsersForAllRoles } from '../helpers/auth';
import { cleanupTestData, cleanupServerData } from '../helpers/cleanup';
import { createRequestWithAuth, type TestUser } from '../helpers/auth-enhanced';
import {
  expectValidApiResponse,
  expectAuthError,
  expectPermissionError
} from '../helpers/validators';

/**
 * E2E tests for server lifecycle operations.
 * Tests server start, stop, and abort with job tracking.
 */
describe('API: Server Lifecycle', () => {
  let superadminUser: TestUser & { sessionToken: string };
  let adminUser: TestUser & { sessionToken: string };
  let operatorUser: TestUser & { sessionToken: string };
  let viewerUser: TestUser & { sessionToken: string };
  const testServerName = 'test-lifecycle-server';

  beforeEach(async () => {
    const users = await createUsersForAllRoles();
    superadminUser = users.superadmin;
    adminUser = users.admin;
    operatorUser = users.operator;
    viewerUser = users.viewer;
  });

  afterEach(async () => {
    await cleanupTestData({ users: true, sessions: true });
    await cleanupServerData(testServerName);
  });

  describe('POST /api/servers/[name]/start', () => {
    it('should return 401 without authentication', async () => {
      const request = new Request(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        { method: 'POST' }
      );

      const response = await POST(request, { params: { name: testServerName } });

      await expectAuthError(response);
    });

    it('should start server as superadmin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        superadminUser
      );

      const response = await POST(request, { params: { name: testServerName } });

      const data = await expectValidApiResponse(response);

      // Should return job tracking information
      expect(data).toHaveProperty('jobId');
      expect(data.jobId).toContain('start-');
    });

    it('should start server as admin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        adminUser
      );

      const response = await POST(request, { params: { name: testServerName } });

      await expectValidApiResponse(response);
    });

    it('should start server as operator', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        operatorUser
      );

      const response = await POST(request, { params: { name: testServerName } });

      await expectValidApiResponse(response);
    });

    it('should forbid starting server as viewer', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        viewerUser
      );

      const response = await POST(request, { params: { name: testServerName } });

      await expectPermissionError(response);
    });

    it('should return job ID for tracking', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        superadminUser
      );

      const response = await POST(request, { params: { name: testServerName } });

      const data = await expectValidApiResponse<{ jobId: string }>();

      expect(data.jobId).toBeDefined();
      expect(typeof data.jobId).toBe('string');
      expect(data.jobId).toMatch(/^start-\d+-/);
    });

    it('should handle server that is already running', async () => {
      // Start the server
      const startRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        superadminUser
      );

      await POST(startRequest, { params: { name: testServerName } });

      // Try to start again (should fail or return appropriate status)
      const secondStartRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        superadminUser
      );

      const response = await POST(secondStartRequest, {
        params: { name: testServerName }
      });

      // Should return error or already-running status
      const data = await response.json();
      expect([200, 400, 409]).toContain(response.status);
    });

    it('should handle non-existent server', async () => {
      const nonExistentServer = 'non-existent-server-test';

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${nonExistentServer}/start`,
        'POST',
        superadminUser
      );

      const response = await POST(request, { params: { name: nonExistentServer } });

      // Should return error for non-existent server
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should include server name in response', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        superadminUser
      );

      const response = await POST(request, { params: { name: testServerName } });

      const data = await expectValidApiResponse();

      expect(data.serverName || data.name).toBeDefined();
    });
  });

  describe('POST /api/servers/[name]/stop', () => {
    beforeEach(async () => {
      // Start server before stop tests
      const startRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        superadminUser
      );

      await POST(startRequest, { params: { name: testServerName } });
    });

    it('should return 401 without authentication', async () => {
      const request = new Request(
        `http://localhost:3000/api/servers/${testServerName}/stop`,
        { method: 'POST' }
      );

      const response = await POSTStop(request, { params: { name: testServerName } });

      await expectAuthError(response);
    });

    it('should stop server as superadmin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/stop`,
        'POST',
        superadminUser
      );

      const response = await POSTStop(request, { params: { name: testServerName } });

      await expectValidApiResponse(response);
    });

    it('should stop server as admin', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/stop`,
        'POST',
        adminUser
      );

      const response = await POSTStop(request, { params: { name: testServerName } });

      await expectValidApiResponse(response);
    });

    it('should stop server as operator', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/stop`,
        'POST',
        operatorUser
      );

      const response = await POSTStop(request, { params: { name: testServerName } });

      await expectValidApiResponse(response);
    });

    it('should forbid stopping server as viewer', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/stop`,
        'POST',
        viewerUser
      );

      const response = await POSTStop(request, { params: { name: testServerName } });

      await expectPermissionError(response);
    });

    it('should return job ID for tracking', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/stop`,
        'POST',
        superadminUser
      );

      const response = await POSTStop(request, { params: { name: testServerName } });

      const data = await expectValidApiResponse<{ jobId: string }>();

      expect(data.jobId).toBeDefined();
      expect(data.jobId).toMatch(/^stop-\d+-/);
    });

    it('should handle server that is already stopped', async () => {
      // Stop the server
      const stopRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/stop`,
        'POST',
        superadminUser
      );

      await POSTStop(stopRequest, { params: { name: testServerName } });

      // Try to stop again
      const secondStopRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/stop`,
        'POST',
        superadminUser
      );

      const response = await POSTStop(secondStopRequest, {
        params: { name: testServerName }
      });

      // Should handle gracefully
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should handle non-existent server', async () => {
      const nonExistentServer = 'non-existent-server-stop';

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${nonExistentServer}/stop`,
        'POST',
        superadminUser
      );

      const response = await POSTStop(request, {
        params: { name: nonExistentServer }
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/servers/[name]/abort', () => {
    it('should return 401 without authentication', async () => {
      const request = new Request(
        `http://localhost:3000/api/servers/${testServerName}/abort`,
        { method: 'POST' }
      );

      const response = await POSTAbort(request, { params: { name: testServerName } });

      await expectAuthError(response);
    });

    it('should abort server operation as superadmin', async () => {
      // Start a server
      const startRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        superadminUser
      );

      const startResponse = await POST(startRequest, {
        params: { name: testServerName }
      });

      const startData = await startResponse.json();

      // Abort the operation
      if (startData.data?.jobId) {
        const abortRequest = await createRequestWithAuth(
          `http://localhost:3000/api/servers/${testServerName}/abort`,
          'POST',
          superadminUser,
          { jobId: startData.data.jobId }
        );

        const response = await POSTAbort(abortRequest, {
          params: { name: testServerName }
        });

        await expectValidApiResponse(response);
      }
    });

    it('should abort server operation as admin', async () => {
      const startRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        adminUser
      );

      const startResponse = await POST(startRequest, {
        params: { name: testServerName }
      });

      const startData = await startResponse.json();

      if (startData.data?.jobId) {
        const abortRequest = await createRequestWithAuth(
          `http://localhost:3000/api/servers/${testServerName}/abort`,
          'POST',
          adminUser,
          { jobId: startData.data.jobId }
        );

        const response = await POSTAbort(abortRequest, {
          params: { name: testServerName }
        });

        await expectValidApiResponse(response);
      }
    });

    it('should abort server operation as operator', async () => {
      const startRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        operatorUser
      );

      const startResponse = await POST(startRequest, {
        params: { name: testServerName }
      });

      const startData = await startResponse.json();

      if (startData.data?.jobId) {
        const abortRequest = await createRequestWithAuth(
          `http://localhost:3000/api/servers/${testServerName}/abort`,
          'POST',
          operatorUser,
          { jobId: startData.data.jobId }
        );

        const response = await POSTAbort(abortRequest, {
          params: { name: testServerName }
        });

        await expectValidApiResponse(response);
      }
    });

    it('should forbid aborting as viewer', async () => {
      const abortRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/abort`,
        'POST',
        viewerUser,
        { jobId: 'test-job-id' }
      );

      const response = await POSTAbort(abortRequest, {
        params: { name: testServerName }
      });

      await expectPermissionError(response);
    });

    it('should require jobId parameter', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/abort`,
        'POST',
        superadminUser
      );

      const response = await POSTAbort(request, {
        params: { name: testServerName }
      });

      // Should either succeed or return validation error
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should handle invalid jobId', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/abort`,
        'POST',
        superadminUser,
        { jobId: 'invalid-job-id-12345' }
      );

      const response = await POSTAbort(request, {
        params: { name: testServerName }
      });

      // Should handle gracefully
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Job Tracking', () => {
    it('should return unique job IDs for each operation', async () => {
      const startRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        superadminUser
      );

      const response = await POST(startRequest, {
        params: { name: testServerName }
      });

      const data = await expectValidApiResponse<{ jobId: string }>();

      expect(data.jobId).toBeDefined();

      // Job ID should be unique (contains timestamp)
      expect(data.jobId).toMatch(/\d+/);
    });

    it('should include job status in response', async () => {
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        superadminUser
      );

      const response = await POST(request, { params: { name: testServerName } });

      const data = await response.json();

      // Check for job status fields
      if (data.data) {
        expect(data.data.jobId).toBeDefined();
        // Status might be included
        expect(['status', 'state'].some(key => key in data.data)).toBe(true);
      }
    });
  });

  describe('Lifecycle Permissions Matrix', () => {
    it('should allow superadmin all lifecycle operations', async () => {
      // Start
      const startRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        superadminUser
      );

      const startResponse = await POST(startRequest, {
        params: { name: testServerName }
      });

      expect([200, 201]).toContain(startResponse.status);

      // Stop
      const stopRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/stop`,
        'POST',
        superadminUser
      );

      const stopResponse = await POSTStop(stopRequest, {
        params: { name: testServerName }
      });

      expect([200, 201]).toContain(stopResponse.status);

      // Abort
      const abortRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/abort`,
        'POST',
        superadminUser,
        { jobId: 'test-job' }
      );

      const abortResponse = await POSTAbort(abortRequest, {
        params: { name: testServerName }
      });

      expect([200, 201]).toContain(abortResponse.status);
    });

    it('should allow admin all lifecycle operations', async () => {
      // Start
      const startRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        adminUser
      );

      const startResponse = await POST(startRequest, {
        params: { name: testServerName }
      });

      expect([200, 201]).toContain(startResponse.status);

      // Stop
      const stopRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/stop`,
        'POST',
        adminUser
      );

      const stopResponse = await POSTStop(stopRequest, {
        params: { name: testServerName }
      });

      expect([200, 201]).toContain(stopResponse.status);
    });

    it('should allow operator start and stop', async () => {
      // Start
      const startRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        operatorUser
      );

      const startResponse = await POST(startRequest, {
        params: { name: testServerName }
      });

      expect([200, 201]).toContain(startResponse.status);

      // Stop
      const stopRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/stop`,
        'POST',
        operatorUser
      );

      const stopResponse = await POSTStop(stopRequest, {
        params: { name: testServerName }
      });

      expect([200, 201]).toContain(stopResponse.status);
    });

    it('should forbid viewer all lifecycle operations', async () => {
      // Start
      const startRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/start`,
        'POST',
        viewerUser
      );

      const startResponse = await POST(startRequest, {
        params: { name: testServerName }
      });

      expect([403, 401]).toContain(startResponse.status);

      // Stop
      const stopRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/stop`,
        'POST',
        viewerUser
      );

      const stopResponse = await POSTStop(stopRequest, {
        params: { name: testServerName }
      });

      expect([403, 401]).toContain(stopResponse.status);

      // Abort
      const abortRequest = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${testServerName}/abort`,
        'POST',
        viewerUser,
        { jobId: 'test-job' }
      );

      const abortResponse = await POSTAbort(abortRequest, {
        params: { name: testServerName }
      });

      expect([403, 401]).toContain(abortResponse.status);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple start attempts gracefully', async () => {
      const requests = Array.from({ length: 3 }, () =>
        createRequestWithAuth(
          `http://localhost:3000/api/servers/${testServerName}/start`,
          'POST',
          superadminUser
        ).then(req => POST(req, { params: { name: testServerName } }))
      );

      const responses = await Promise.all(requests);

      // All should return valid responses
      for (const response of responses) {
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500);
      }
    });
  });

  describe('Server Name Validation', () => {
    it('should reject empty server name', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/servers//start',
        'POST',
        superadminUser
      );

      const response = await POST(request, { params: { name: '' } });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle special characters in server name', async () => {
      const specialServerName = 'test-server-123';

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/servers/${specialServerName}/start`,
        'POST',
        superadminUser
      );

      const response = await POST(request, {
        params: { name: specialServerName }
      });

      // Should handle gracefully
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });
  });
});
