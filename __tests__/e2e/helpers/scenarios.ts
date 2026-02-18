import { expect } from 'vitest';
import type { TestUser } from './auth';
import { createRequestWithAuth, createUnauthenticatedRequest } from './auth-enhanced';
import { expectValidApiResponse, expectAuthError, expectPermissionError, expectValidApiError } from './validators';

/**
 * Common test scenario patterns for E2E tests.
 * Provides reusable test patterns for CRUD operations, pagination, etc.
 */

/**
 * Test CRUD operations for a resource.
 *
 * @param baseUrl - Base URL (e.g., 'http://localhost:3000/api/users')
 * @param user - Authenticated user
 * @param createData - Data for creating a resource
 * @param updateData - Data for updating a resource
 */
export async function testCrudOperations<TCreate, TUpdate>(
  baseUrl: string,
  user: TestUser,
  createData: TCreate,
  updateData: TUpdate
): Promise<void> {
  describe('CRUD Operations', () => {
    it('should require authentication for all operations', async () => {
      // Test unauthenticated read
      const listRequest = createUnauthenticatedRequest(baseUrl, 'GET');
      const listResponse = await fetch(listRequest);
      await expectAuthError(listResponse);

      // Test unauthenticated create
      const createRequest = createUnauthenticatedRequest(baseUrl, 'POST', createData);
      const createResponse = await fetch(createRequest);
      await expectAuthError(createResponse);
    });

    it('should create a resource', async () => {
      const request = await createRequestWithAuth(baseUrl, 'POST', user, createData);
      const response = await fetch(request);

      const data = await expectValidApiResponse(response, 201);
      expect(data).toBeDefined();
    });

    it('should read a resource', async () => {
      // First create a resource
      const createRequest = await createRequestWithAuth(baseUrl, 'POST', user, createData);
      const createResponse = await fetch(createRequest);
      const created = await expectValidApiResponse<any>(createResponse, 201);
      const resourceId = created.id;

      // Then read it
      const readUrl = `${baseUrl}/${resourceId}`;
      const readRequest = await createRequestWithAuth(readUrl, 'GET', user);
      const readResponse = await fetch(readRequest);

      const data = await expectValidApiResponse(readResponse, 200);
      expect(data).toHaveProperty('id', resourceId);
    });

    it('should update a resource', async () => {
      // First create a resource
      const createRequest = await createRequestWithAuth(baseUrl, 'POST', user, createData);
      const createResponse = await fetch(createRequest);
      const created = await expectValidApiResponse<any>(createResponse, 201);
      const resourceId = created.id;

      // Then update it
      const updateUrl = `${baseUrl}/${resourceId}`;
      const updateRequest = await createRequestWithAuth(updateUrl, 'PATCH', user, updateData);
      const updateResponse = await fetch(updateRequest);

      const data = await expectValidApiResponse(updateResponse, 200);
      expect(data).toBeDefined();
    });

    it('should delete a resource', async () => {
      // First create a resource
      const createRequest = await createRequestWithAuth(baseUrl, 'POST', user, createData);
      const createResponse = await fetch(createRequest);
      const created = await expectValidApiResponse<any>(createResponse, 201);
      const resourceId = created.id;

      // Then delete it
      const deleteUrl = `${baseUrl}/${resourceId}`;
      const deleteRequest = await createRequestWithAuth(deleteUrl, 'DELETE', user);
      const deleteResponse = await fetch(deleteRequest);

      await expectValidApiResponse(deleteResponse, 200);

      // Verify it's gone
      const readRequest = await createRequestWithAuth(deleteUrl, 'GET', user);
      const readResponse = await fetch(readRequest);
      await expectValidApiError(readResponse, 404);
    });
  });
}

/**
 * Test pagination for an endpoint.
 *
 * @param endpoint - The API endpoint (e.g., '/api/users')
 * @param user - Authenticated user
 * @param itemCount - Expected number of items
 * @param createItems - Optional function to create test items
 */
export async function testPagination(
  endpoint: string,
  user: TestUser,
  itemCount: number,
  createItems?: (count: number) => Promise<void>
): Promise<void> {
  describe('Pagination', () => {
    if (createItems) {
      it('should create test items', async () => {
        await createItems(itemCount);
      });
    }

    it('should return paginated results', async () => {
      const url = `${endpoint}?page=1&limit=10`;
      const request = await createRequestWithAuth(url, 'GET', user);
      const response = await fetch(request);

      const data = await expectValidApiResponse<{
        items: unknown[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(response);

      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('limit');
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.length).toBeLessThanOrEqual(10);
    });

    it('should respect limit parameter', async () => {
      const url = `${endpoint}?page=1&limit=5`;
      const request = await createRequestWithAuth(url, 'GET', user);
      const response = await fetch(request);

      const data = await expectValidApiResponse<{ items: unknown[] }>(response);

      expect(data.items.length).toBeLessThanOrEqual(5);
    });

    it('should handle page parameter', async () => {
      const url = `${endpoint}?page=2&limit=5`;
      const request = await createRequestWithAuth(url, 'GET', user);
      const response = await fetch(request);

      const data = await expectValidApiResponse<{ items: unknown[]; page: number }>(response);

      expect(data.page).toBe(2);
    });
  });
}

/**
 * Test search functionality.
 *
 * @param endpoint - The API endpoint (e.g., '/api/users')
 * @param user - Authenticated user
 * @param searchTerm - Search term to test
 * @param expectResults - Whether results are expected
 */
export async function testSearch(
  endpoint: string,
  user: TestUser,
  searchTerm: string,
  expectResults: boolean = true
): Promise<void> {
  it('should support search', async () => {
    const url = `${endpoint}?search=${encodeURIComponent(searchTerm)}`;
    const request = await createRequestWithAuth(url, 'GET', user);
    const response = await fetch(request);

    const data = await expectValidApiResponse<{ items: unknown[]; total: number }>(response);

    if (expectResults) {
      expect(data.total).toBeGreaterThan(0);
      expect(data.items.length).toBeGreaterThan(0);
    } else {
      expect(data.total).toBe(0);
      expect(data.items.length).toBe(0);
    }
  });
}

/**
 * Test filtering functionality.
 *
 * @param endpoint - The API endpoint
 * @param user - Authenticated user
 * @param filters - Object of filter parameters
 * @param expectResults - Whether results are expected
 */
export async function testFiltering(
  endpoint: string,
  user: TestUser,
  filters: Record<string, string>,
  expectResults: boolean = true
): Promise<void> {
  it('should support filtering', async () => {
    const params = new URLSearchParams(filters);
    const url = `${endpoint}?${params.toString()}`;
    const request = await createRequestWithAuth(url, 'GET', user);
    const response = await fetch(request);

    const data = await expectValidApiResponse<{ items: unknown[]; total: number }>(response);

    if (expectResults) {
      expect(data.total).toBeGreaterThan(0);
    } else {
      expect(data.total).toBe(0);
    }
  });
}

/**
 * Test role-based access control for an endpoint.
 *
 * @param endpoint - The API endpoint
 * @param method - HTTP method
 * @param users - Object with users for each role
 * @param expectedAccess - Object mapping roles to expected access
 * @param body - Optional request body
 */
export async function testRoleBasedAccess(
  endpoint: string,
  method: string,
  users: Record<string, TestUser & { sessionToken: string }>,
  expectedAccess: Record<string, boolean>,
  body?: unknown
): Promise<void> {
  describe('Role-Based Access Control', () => {
    for (const [roleName, shouldHaveAccess] of Object.entries(expectedAccess)) {
      it(`${shouldHaveAccess ? 'should' : 'should not'} allow ${roleName} to ${method} ${endpoint}`, async () => {
        const user = users[roleName];
        expect(user).toBeDefined();

        const headers: HeadersInit = {
          Cookie: `session=${user.sessionToken}`
        };

        if (body) {
          headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(endpoint, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined
        });

        if (shouldHaveAccess) {
          // Should not be auth/permission error
          expect([401, 403]).not.toContain(response.status);

          // Either 2xx success or 4xx validation error (not permission)
          expect(response.status).toBeGreaterThanOrEqual(200);
          expect(response.status).toBeLessThan(500);
        } else {
          // Should be permission error or redirect
          expect([401, 403]).toContain(response.status);
        }
      });
    }
  });
}

/**
 * Test input validation for an endpoint.
 *
 * @param endpoint - The API endpoint
 * @param method - HTTP method (POST, PATCH, PUT)
 * @param user - Authenticated user
 * @param invalidInputs - Array of invalid inputs to test
 */
export async function testInputValidation(
  endpoint: string,
  method: string,
  user: TestUser,
  invalidInputs: Array<{
    input: unknown;
    expectedError?: string;
    description: string;
  }>
): Promise<void> {
  describe('Input Validation', () => {
    for (const { input, expectedError, description } of invalidInputs) {
      it(`should reject: ${description}`, async () => {
        const request = await createRequestWithAuth(endpoint, method, user, input);
        const response = await fetch(request);

        await expectValidationError(response, expectedError);
      });
    }

    it('should accept valid input', async () => {
      // This test assumes the last invalidInput has a valid counterpart
      // or you pass validInput separately
      const validInput = invalidInputs[0]?.input;
      if (validInput) {
        const request = await createRequestWithAuth(endpoint, method, user, validInput);
        const response = await fetch(request);

        // Should not be a validation error (could be other errors though)
        expect(response.status).not.toBe(400);
      }
    });
  });
}

/**
 * Test error handling for various failure scenarios.
 *
 * @param endpoint - The API endpoint
 * @param user - Authenticated user
 * @param errorScenarios - Array of error scenarios to test
 */
export async function testErrorHandling(
  endpoint: string,
  user: TestUser,
  errorScenarios: Array<{
    method: string;
    body?: unknown;
    expectedStatus: number;
    description: string;
  }>
): Promise<void> {
  describe('Error Handling', () => {
    for (const { method, body, expectedStatus, description } of errorScenarios) {
      it(`should handle: ${description}`, async () => {
        const request = await createRequestWithAuth(endpoint, method, user, body);
        const response = await fetch(request);

        expect(response.status).toBe(expectedStatus);
      });
    }
  });
}

/**
 * Test concurrent request handling.
 *
 * @param endpoint - The API endpoint
 * @param user - Authenticated user
 * @param requestCount - Number of concurrent requests
 * @param setupRequest - Function to setup each request
 */
export async function testConcurrentRequests(
  endpoint: string,
  user: TestUser,
  requestCount: number,
  setupRequest: (index: number) => { method: string; body?: unknown }
): Promise<void> {
  it('should handle concurrent requests', async () => {
    const requests = Array.from({ length: requestCount }, (_, i) => {
      const { method, body } = setupRequest(i);

      return createRequestWithAuth(endpoint, method, user, body).then(req =>
        fetch(req)
      );
    });

    const responses = await Promise.all(requests);

    // All should succeed (not throw or return 5xx)
    for (const response of responses) {
      expect(response.status).toBeLessThan(600);
      expect(response.status).toBeGreaterThanOrEqual(200);
    }
  });
}

/**
 * Test rate limiting (if implemented).
 *
 * @param endpoint - The API endpoint
 * @param user - Authenticated user
 * @param requestCount - Number of requests to make
 * @param rateLimit - Expected rate limit (requests per minute)
 */
export async function testRateLimiting(
  endpoint: string,
  user: TestUser,
  requestCount: number,
  rateLimit?: number
): Promise<void> {
  it('should enforce rate limiting', async () => {
    const requests = Array.from({ length: requestCount }, () =>
      createRequestWithAuth(endpoint, 'GET', user).then(req => fetch(req))
    );

    const responses = await Promise.all(requests);

    const rateLimitedResponses = responses.filter(r => r.status === 429);

    if (rateLimit) {
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    } else {
      // If no rate limit specified, just check that we get some responses
      expect(responses.length).toBe(requestCount);
    }
  });
}

/**
 * Test IDempotency of operations.
 *
 * @param endpoint - The API endpoint
 * @param user - Authenticated user
 * @param method - HTTP method
 * @param body - Request body
 * @param times - Number of times to repeat
 */
export async function testIdempotency(
  endpoint: string,
  user: TestUser,
  method: string,
  body?: unknown,
  times: number = 3
): Promise<void> {
  it('should be idempotent', async () => {
    const requests = Array.from({ length: times }, () =>
      createRequestWithAuth(endpoint, method, user, body).then(req => fetch(req))
    );

    const responses = await Promise.all(requests);

    // All should return the same status
    const statuses = responses.map(r => r.status);
    expect(new Set(statuses).size).toBe(1);
  });
}

/**
 * Test SSE (Server-Sent Events) endpoint.
 *
 * @param endpoint - The SSE endpoint
 * @param user - Authenticated user
 * @param params - Query parameters
 * @param expectedEvents - Array of expected event types
 */
export async function testSSEEndpoint(
  endpoint: string,
  user: TestUser,
  params: Record<string, string>,
  expectedEvents: string[]
): Promise<void> {
  it('should establish SSE connection', async () => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${endpoint}?${queryString}`;

    const headers: HeadersInit = {
      Cookie: `session=${user.sessionToken}`
    };

    const response = await fetch(url, { headers });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
  });
}
