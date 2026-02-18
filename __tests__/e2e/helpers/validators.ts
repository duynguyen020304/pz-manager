import { expect } from 'vitest';
import type { ApiResponse } from '@/types';

/**
 * API response validation utilities for E2E tests.
 * Provides consistent validation patterns for API responses.
 */

/**
 * Standard API response shape
 */
export interface StandardApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Type guard to check if a response is a valid ApiResponse.
 */
export function isValidApiResponse(response: unknown): response is StandardApiResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    typeof (response as any).success === 'boolean'
  );
}

/**
 * Validate that a response is a proper API response.
 * Throws if invalid.
 */
export function validateApiResponse(response: unknown): StandardApiResponse {
  if (!isValidApiResponse(response)) {
    throw new Error(
      'Invalid API response format. Expected { success: boolean, data?: any, error?: string }'
    );
  }

  return response;
}

/**
 * Expect an API response to have success: true.
 * Throws with descriptive error if not.
 */
export function expectSuccessResponse<T = unknown>(
  response: StandardApiResponse<T>,
  dataCheck?: (data: T) => void
): asserts response is StandardApiResponse<T> & { success: true; data: T } {
  expect(response.success).toBe(true);

  if (response.error) {
    throw new Error(`Expected success but got error: ${response.error}`);
  }

  if (dataCheck && response.data) {
    dataCheck(response.data);
  }
}

/**
 * Expect an API response to have success: false (error response).
 * Throws with descriptive error if not.
 */
export function expectErrorResponse(
  response: StandardApiResponse,
  expectedErrorMessage?: string
): asserts response is StandardApiResponse & { success: false } {
  expect(response.success).toBe(false);
  expect(response.error).toBeDefined();

  if (expectedErrorMessage) {
    expect(response.error).toContain(expectedErrorMessage);
  }
}

/**
 * Validate a Response object from fetch() and parse JSON.
 * Returns the parsed JSON data.
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  expect(response).toBeDefined();

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  throw new Error(`Expected JSON response but got content-type: ${contentType}`);
}

/**
 * Expect a response to have a specific status code.
 */
export function expectStatus(response: Response, expectedStatus: number): void {
  expect(response.status).toBe(expectedStatus);
}

/**
 * Expect a successful 2xx response.
 */
export function expectSuccessful(response: Response): void {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
}

/**
 * Expect a client error 4xx response.
 */
export function expectClientError(response: Response): void {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.status).toBeLessThan(500);
}

/**
 * Expect a server error 5xx response.
 */
export function expectServerError(response: Response): void {
  expect(response.status).toBeGreaterThanOrEqual(500);
  expect(response.status).toBeLessThan(600);
}

/**
 * Validate a full API response flow:
 * 1. Check HTTP status
 * 2. Parse JSON
 * 3. Validate API response structure
 * 4. Check success flag
 *
 * @returns The data from the response
 */
export async function expectValidApiResponse<T = unknown>(
  response: Response,
  expectedStatus: number = 200
): Promise<T> {
  expectStatus(response, expectedStatus);

  const json = await parseJsonResponse<StandardApiResponse<T>>(response);
  validateApiResponse(json);
  expectSuccessResponse(json);

  return json.data as T;
}

/**
 * Validate an error API response flow:
 * 1. Check HTTP status (4xx or 5xx)
 * 2. Parse JSON
 * 3. Validate API response structure
 * 4. Check success: false
 *
 * @returns The error message from the response
 */
export async function expectValidApiError(
  response: Response,
  expectedStatus: number = 400
): Promise<string> {
  expectStatus(response, expectedStatus);

  const json = await parseJsonResponse<StandardApiResponse>(response);
  validateApiResponse(json);
  expectErrorResponse(json);

  return json.error!;
}

/**
 * Validate pagination response structure.
 */
export function expectPaginatedResponse<T>(
  response: StandardApiResponse<T[]>,
  checkTotal?: (total: number) => void
): void {
  expectSuccessResponse(response);

  // If pagination metadata is included
  if ('total' in response && typeof response.total === 'number') {
    expect(Array.isArray(response.data)).toBe(true);

    if (checkTotal) {
      checkTotal(response.total as number);
    }
  }
}

/**
 * Validate CRUD operation response.
 */
export async function expectCrudSuccess<T>(
  response: Response,
  operation: 'create' | 'update' | 'delete' | 'read',
  expectedStatus: number = 200
): Promise<T> {
  const statusMap = {
    create: 201,
    update: 200,
    delete: 200,
    read: 200
  };

  const data = await expectValidApiResponse<T>(response, expectedStatus || statusMap[operation]);

  return data;
}

/**
 * Validate authentication error (401).
 */
export async function expectAuthError(response: Response): Promise<void> {
  expectStatus(response, 401);

  const json = await parseJsonResponse<StandardApiResponse>(response);

  // Either an error response or redirect to login
  if (isValidApiResponse(json)) {
    expectErrorResponse(json);
  }
}

/**
 * Validate authorization error (403).
 */
export async function expectPermissionError(response: Response): Promise<void> {
  expectStatus(response, 403);

  const json = await parseJsonResponse<StandardApiResponse>(response);
  validateApiResponse(json);
  expectErrorResponse(json);
}

/**
 * Validate validation error (400).
 */
export async function expectValidationError(
  response: Response,
  expectedError?: string
): Promise<void> {
  expectStatus(response, 400);

  const json = await parseJsonResponse<StandardApiResponse>(response);
  validateApiResponse(json);
  expectErrorResponse(json, expectedError);
}

/**
 * Validate not found error (404).
 */
export async function expectNotFoundError(response: Response): Promise<void> {
  expectStatus(response, 404);

  const json = await parseJsonResponse<StandardApiResponse>(response);
  validateApiResponse(json);
  expectErrorResponse(json);
}

/**
 * Validate SSE (Server-Sent Events) response.
 */
export function expectSSEResponse(response: Response): void {
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/event-stream');
}

/**
 * Check if response has proper CORS headers.
 */
export function expectCORSHeaders(response: Response): void {
  // Check for common CORS headers
  const corsHeaders = ['access-control-allow-origin', 'access-control-allow-methods'];

  corsHeaders.forEach(header => {
    const value = response.headers.get(header);
    if (value) {
      expect(value).toBeDefined();
    }
  });
}

/**
 * Batch validate multiple responses.
 */
export async function validateResponseBatch(
  responses: Array<{ response: Response; expectedStatus: number }>
): Promise<void> {
  for (const { response, expectedStatus } of responses) {
    expectStatus(response, expectedStatus);
  }
}

/**
 * Expect response to match a schema (basic validation).
 */
export function expectResponseSchema<T>(
  data: unknown,
  requiredFields: (keyof T)[]
): void {
  expect(data).toBeDefined();
  expect(typeof data).toBe('object');

  for (const field of requiredFields) {
    expect(data).toHaveProperty(field as string);
  }
}

/**
 * Validate array response has minimum length.
 */
export function expectArrayLength<T>(
  data: T[],
  minLength: number,
  maxLength?: number
): void {
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBeGreaterThanOrEqual(minLength);

  if (maxLength !== undefined) {
    expect(data.length).toBeLessThanOrEqual(maxLength);
  }
}

/**
 * Validate response contains expected fields (subset match).
 */
export function expectResponseFields<T>(
  data: T,
  expectedFields: Partial<T>
): void {
  expect(data).toBeDefined();

  for (const [key, value] of Object.entries(expectedFields)) {
    expect((data as any)[key]).toEqual(value);
  }
}

/**
 * Validate timestamp fields (ISO 8601 format).
 */
export function expectValidTimestamp(timestamp: unknown): void {
  expect(timestamp).toBeDefined();
  expect(typeof timestamp).toBe('string');

  const date = new Date(timestamp as string);
  expect(date.toISOString()).toBe(timestamp as string);
}

/**
 * Validate UUID format.
 */
export function expectValidUUID(uuid: unknown): void {
  expect(uuid).toBeDefined();
  expect(typeof uuid).toBe('string');

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  expect(uuid).toMatch(uuidRegex);
}
