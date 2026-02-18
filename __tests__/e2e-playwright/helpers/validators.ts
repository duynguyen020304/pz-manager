import { APIResponse } from '@playwright/test';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Expect successful API response
 */
export async function expectSuccessResponse<T = unknown>(
  response: APIResponse
): Promise<T> {
  const data = await response.json() as ApiResponse<T>;

  if (response.status() >= 400) {
    throw new Error(`Expected success but got status ${response.status()}: ${JSON.stringify(data)}`);
  }

  if (!data.success) {
    throw new Error(`Expected success=true but got: ${data.error || 'Unknown error'}`);
  }

  return data.data as T;
}

/**
 * Expect error API response
 */
export async function expectErrorResponse(
  response: APIResponse,
  expectedStatus?: number
): Promise<string> {
  if (expectedStatus) {
    if (response.status() !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus} but got ${response.status()}`);
    }
  }

  const data = await response.json() as ApiResponse;
  if (data.success) {
    throw new Error('Expected error response but got success');
  }

  return data.error || 'Unknown error';
}

/**
 * Expect 401 Unauthorized
 */
export async function expectAuthError(response: APIResponse): Promise<void> {
  if (response.status() !== 401) {
    throw new Error(`Expected 401 but got ${response.status()}`);
  }

  const data = await response.json() as ApiResponse;
  if (data.success) {
    throw new Error('Expected auth error but got success');
  }
}

/**
 * Expect 403 Forbidden
 */
export async function expectPermissionError(response: APIResponse): Promise<void> {
  if (response.status() !== 403) {
    throw new Error(`Expected 403 but got ${response.status()}`);
  }

  const data = await response.json() as ApiResponse;
  if (data.success) {
    throw new Error('Expected permission error but got success');
  }
}

/**
 * Expect 404 Not Found
 */
export async function expectNotFoundError(response: APIResponse): Promise<void> {
  if (response.status() !== 404) {
    throw new Error(`Expected 404 but got ${response.status()}`);
  }
}

/**
 * Expect 400 Validation Error
 */
export async function expectValidationError(
  response: APIResponse,
  expectedError?: string
): Promise<void> {
  if (response.status() !== 400) {
    throw new Error(`Expected 400 but got ${response.status()}`);
  }

  const error = await expectErrorResponse(response, 400);

  if (expectedError && !error.includes(expectedError)) {
    throw new Error(`Expected error containing "${expectedError}" but got "${error}"`);
  }
}
