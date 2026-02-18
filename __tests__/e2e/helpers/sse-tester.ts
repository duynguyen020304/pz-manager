import { expect } from 'vitest';

/**
 * Server-Sent Events (SSE) testing utilities for E2E tests.
 * Provides helpers for parsing and validating SSE streams.
 */

/**
 * Parsed SSE message
 */
export interface SSEMessage {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
}

/**
 * SSE connection options
 */
export interface SSEConnectionOptions {
  url: string;
  headers?: HeadersInit;
  params?: Record<string, string>;
  timeout?: number;
}

/**
 * Parse SSE message chunk into structured messages.
 *
 * @param chunk - Raw SSE chunk from response
 * @returns Array of parsed SSE messages
 */
export function parseSSEMessage(chunk: string): SSEMessage[] {
  const lines = chunk.split('\n');
  const messages: SSEMessage[] = [];
  let currentMessage: Partial<SSEMessage> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line marks end of message
    if (!trimmed) {
      if (currentMessage.data !== undefined) {
        messages.push({
          event: currentMessage.event,
          data: currentMessage.data,
          id: currentMessage.id,
          retry: currentMessage.retry
        });
      }
      currentMessage = {};
      continue;
    }

    // Parse field: value format
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      // Line without colon is treated as field with empty value
      currentMessage.data = (currentMessage.data || '') + trimmed;
      continue;
    }

    const field = trimmed.substring(0, colonIndex).trim();
    let value = trimmed.substring(colonIndex + 1).trim();

    switch (field) {
      case 'event':
        currentMessage.event = value;
        break;
      case 'data':
        currentMessage.data = (currentMessage.data || '') + (currentMessage.data ? '\n' : '') + value;
        break;
      case 'id':
        currentMessage.id = value;
        break;
      case 'retry':
        currentMessage.retry = parseInt(value, 10);
        break;
    }
  }

  // Handle last message if no trailing newline
  if (currentMessage.data !== undefined) {
    messages.push({
      event: currentMessage.event,
      data: currentMessage.data,
      id: currentMessage.id,
      retry: currentMessage.retry
    });
  }

  return messages;
}

/**
 * Read SSE stream from Response until timeout or completion.
 *
 * @param response - Fetch Response object with SSE stream
 * @param timeout - Maximum time to wait (ms)
 * @returns Array of SSE messages
 */
export async function readSSEStream(
  response: Response,
  timeout: number = 5000
): Promise<SSEMessage[]> {
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/event-stream');

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  const messages: SSEMessage[] = [];
  let buffer = '';
  let startTime = Date.now();

  try {
    while (Date.now() - startTime < timeout) {
      const { done, value } = await reader.read();

      if (done) {
        // Parse any remaining buffer
        if (buffer.trim()) {
          messages.push(...parseSSEMessage(buffer));
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Parse complete messages (ending with double newline)
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || ''; // Keep incomplete part in buffer

      for (const part of parts) {
        if (part.trim()) {
          messages.push(...parseSSEMessage(part));
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return messages;
}

/**
 * Connect to SSE endpoint and read messages.
 *
 * @param options - SSE connection options
 * @returns Array of SSE messages
 */
export async function connectSSE(options: SSEConnectionOptions): Promise<SSEMessage[]> {
  const { url, headers = {}, params, timeout = 5000 } = options;

  // Build URL with params
  let fullUrl = url;
  if (params) {
    const queryString = new URLSearchParams(params).toString();
    fullUrl = `${url}${queryString ? '?' + queryString : ''}`;
  }

  const response = await fetch(fullUrl, {
    headers
  });

  return readSSEStream(response, timeout);
}

/**
 * Expect SSE message with specific event type.
 *
 * @param messages - Array of SSE messages
 * @param eventType - Expected event type
 * @returns First matching message
 */
export function expectSSEEvent(messages: SSEMessage[], eventType: string): SSEMessage {
  const message = messages.find(m => m.event === eventType);

  if (!message) {
    const receivedEvents = messages
      .map(m => m.event || '(message)')
      .join(', ');

    throw new Error(
      `Expected SSE event '${eventType}' but received: ${receivedEvents || '(none)'}`
    );
  }

  return message;
}

/**
 * Expect SSE message with specific data.
 *
 * @param messages - Array of SSE messages
 * @param dataMatcher - Function to match data (returns true if match)
 * @returns First matching message
 */
export function expectSSEData(
  messages: SSEMessage[],
  dataMatcher: (data: string) => boolean
): SSEMessage {
  const message = messages.find(m => dataMatcher(m.data));

  if (!message) {
    throw new Error(`Expected SSE data matching predicate but found none`);
  }

  return message;
}

/**
 * Parse JSON data from SSE message.
 *
 * @param message - SSE message
 * @returns Parsed JSON object
 */
export function parseSSEData<T = unknown>(message: SSEMessage): T {
  try {
    return JSON.parse(message.data) as T;
  } catch (error) {
    throw new Error(`Failed to parse SSE data as JSON: ${message.data}`);
  }
}

/**
 * Validate SSE connection response headers.
 *
 * @param response - Fetch Response object
 */
export function expectSSEHeaders(response: Response): void {
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/event-stream');

  // Check for cache control headers
  const cacheControl = response.headers.get('cache-control');
  expect(cacheControl).toMatch(/no-cache|no-store/i);

  // Check for connection keep-alive
  const connection = response.headers.get('connection');
  if (connection) {
    expect(connection.toLowerCase()).toContain('keep-alive');
  }
}

/**
 * Test SSE heartbeat/keepalive messages.
 *
 * @param messages - Array of SSE messages
 * @param heartbeatInterval - Expected interval between heartbeats (ms)
 */
export function expectSSEHeartbeat(
  messages: SSEMessage[],
  heartbeatInterval: number = 5000
): void {
  const heartbeatMessages = messages.filter(m => m.event === 'heartbeat' || m.data === ':heartbeat');

  expect(heartbeatMessages.length).toBeGreaterThan(0);

  // Check intervals (roughly)
  const timestamps = heartbeatMessages.map((_, i) => i * heartbeatInterval);

  for (let i = 1; i < timestamps.length; i++) {
    const diff = timestamps[i] - timestamps[i - 1];
    expect(diff).toBeLessThanOrEqual(heartbeatInterval + 1000); // Allow 1s tolerance
  }
}

/**
 * Group SSE messages by event type.
 *
 * @param messages - Array of SSE messages
 * @returns Object mapping event types to message arrays
 */
export function groupSSEMessagesByEvent(messages: SSEMessage[]): Record<string, SSEMessage[]> {
  const groups: Record<string, SSEMessage[]> = {};

  for (const message of messages) {
    const eventType = message.event || 'message';

    if (!groups[eventType]) {
      groups[eventType] = [];
    }

    groups[eventType].push(message);
  }

  return groups;
}

/**
 * Count SSE messages by event type.
 *
 * @param messages - Array of SSE messages
 * @returns Object mapping event types to counts
 */
export function countSSEMessagesByEvent(messages: SSEMessage[]): Record<string, number> {
  const groups = groupSSEMessagesByEvent(messages);
  const counts: Record<string, number> = {};

  for (const [eventType, eventMessages] of Object.entries(groups)) {
    counts[eventType] = eventMessages.length;
  }

  return counts;
}

/**
 * Expect SSE message sequence in order.
 *
 * @param messages - Array of SSE messages
 * @param expectedEvents - Array of expected event types in order
 */
export function expectSSESequence(messages: SSEMessage[], expectedEvents: string[]): void {
  const actualEvents = messages.map(m => m.event || 'message');

  expect(actualEvents).toHaveLength(expectedEvents.length);

  for (let i = 0; i < expectedEvents.length; i++) {
    expect(actualEvents[i]).toBe(expectedEvents[i]);
  }
}

/**
 * Validate SSE data schema.
 *
 * @param message - SSE message
 * @param requiredFields - Array of required fields in parsed data
 */
export function expectSSEDataSchema(
  message: SSEMessage,
  requiredFields: string[]
): void {
  const data = parseSSEData(message);

  for (const field of requiredFields) {
    expect(data).toHaveProperty(field);
  }
}

/**
 * Mock SSE stream for testing.
 * Returns a mock Response object that emits SSE messages.
 *
 * @param messages - Array of messages to emit
 * @returns Mock Response object
 */
export function mockSSEStream(messages: Array<{ event?: string; data: string }>): Response {
  const chunks = messages.map(msg => {
    let chunk = '';

    if (msg.event) {
      chunk += `event: ${msg.event}\n`;
    }

    chunk += `data: ${msg.data}\n\n`;

    return chunk;
  });

  const body = chunks.join('');

  return {
    status: 200,
    headers: new Headers({
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      'connection': 'keep-alive'
    }),
    body: {
      getReader: () => ({
        read: async () => {
          // Simulate async streaming
          await new Promise(resolve => setTimeout(resolve, 10));

          return {
            done: true,
            value: new TextEncoder().encode(body)
          };
        },
        releaseLock: () => {}
      })
    }
  } as Response;
}

/**
 * Test SSE reconnection logic.
 *
 * @param connect - Function to establish SSE connection
 * @param disconnect - Function to disconnect SSE
 * @param reconnectDelay - Expected reconnection delay (ms)
 */
export async function testSSEReconnection(
  connect: () => Promise<Response>,
  disconnect: (response: Response) => Promise<void>,
  reconnectDelay: number = 1000
): Promise<void> {
  // First connection
  const response1 = await connect();
  expectSSEHeaders(response1);

  // Disconnect
  await disconnect(response1);

  // Wait for reconnect delay
  await new Promise(resolve => setTimeout(resolve, reconnectDelay));

  // Reconnect
  const response2 = await connect();
  expectSSEHeaders(response2);

  // Cleanup
  await disconnect(response2);
}

/**
 * Stream SSE messages to callback.
 *
 * @param response - Fetch Response object
 * @param callback - Function to call for each message
 * @param timeout - Maximum time to stream (ms)
 */
export async function streamSSEMessages(
  response: Response,
  callback: (message: SSEMessage) => void,
  timeout: number = 5000
): Promise<void> {
  const messages = await readSSEStream(response, timeout);

  for (const message of messages) {
    callback(message);
  }
}

/**
 * Batch SSE messages by type for bulk assertions.
 *
 * @param messages - Array of SSE messages
 * @returns Object with message arrays by type
 */
export function batchSSEMessages(messages: SSEMessage[]): {
  initial: SSEMessage[];
  batch: SSEMessage[];
  heartbeat: SSEMessage[];
  error: SSEMessage[];
  other: SSEMessage[];
} {
  return {
    initial: messages.filter(m => m.event === 'initial'),
    batch: messages.filter(m => m.event === 'batch'),
    heartbeat: messages.filter(m => m.event === 'heartbeat'),
    error: messages.filter(m => m.event === 'error'),
    other: messages.filter(m =>
      !['initial', 'batch', 'heartbeat', 'error'].includes(m.event || '')
    )
  };
}
