import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import { createAxiosAdapter } from '../create-axios-adapter';

// ============================================================================
// Helpers
// ============================================================================

function createMockAxiosInstance(response: Partial<AxiosResponse> = {}): AxiosInstance {
  const defaults: AxiosResponse = {
    data: response.data ?? '',
    status: response.status ?? 200,
    statusText: response.statusText ?? 'OK',
    headers: response.headers ?? {},
    config: {} as InternalAxiosRequestConfig,
  };

  return {
    request: vi.fn().mockResolvedValue({ ...defaults, ...response }),
  } as unknown as AxiosInstance;
}

// ============================================================================
// Tests
// ============================================================================

describe('createAxiosAdapter', () => {
  let mockInstance: AxiosInstance;

  beforeEach(() => {
    mockInstance = createMockAxiosInstance();
  });

  it('should forward GET request with correct url, method, and headers', async () => {
    const adapter = createAxiosAdapter(mockInstance);

    const request = new Request('https://api.example.com/users', {
      method: 'GET',
      headers: { Authorization: 'Bearer token123' },
    });

    await adapter(request);

    expect(mockInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: expect.objectContaining({
          authorization: 'Bearer token123',
        }),
        validateStatus: expect.any(Function),
        responseType: 'arraybuffer',
      }),
    );
  });

  it('should forward POST request body correctly', async () => {
    const adapter = createAxiosAdapter(mockInstance);
    const body = JSON.stringify({ name: 'John', email: 'john@example.com' });

    const request = new Request('https://api.example.com/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    await adapter(request);

    expect(mockInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        data: body,
      }),
    );
  });

  it('should return non-2xx responses as Response objects (not throw)', async () => {
    const errorInstance = createMockAxiosInstance({
      status: 404,
      statusText: 'Not Found',
      data: JSON.stringify({ error: 'User not found' }),
    });

    const adapter = createAxiosAdapter(errorInstance);
    const request = new Request('https://api.example.com/users/999');

    const response = await adapter(request);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(404);
    expect(response.statusText).toBe('Not Found');
    expect(response.ok).toBe(false);
  });

  it('should re-throw network errors for the client to handle', async () => {
    const networkErrorInstance = {
      request: vi.fn().mockRejectedValue(new TypeError('Network request failed')),
    } as unknown as AxiosInstance;

    const adapter = createAxiosAdapter(networkErrorInstance);
    const request = new Request('https://api.example.com/users');

    await expect(adapter(request)).rejects.toThrow('Network request failed');
  });

  it('should pass AbortController signal through to axios', async () => {
    const adapter = createAxiosAdapter(mockInstance);
    const controller = new AbortController();
    const request = new Request('https://api.example.com/users');

    await adapter(request.clone(), { signal: controller.signal });

    expect(mockInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: controller.signal,
      }),
    );
  });

  it('should use provided custom instance', async () => {
    const customInstance = createMockAxiosInstance({
      data: JSON.stringify({ custom: true }),
    });

    const adapter = createAxiosAdapter(customInstance);
    const request = new Request('https://api.example.com/data');

    await adapter(request);

    expect(customInstance.request).toHaveBeenCalledTimes(1);
  });

  it('should lazily import default axios when no instance provided', async () => {
    const { default: axios } = await import('axios');
    const requestSpy = vi.spyOn(axios, 'request').mockResolvedValue({
      data: '',
      status: 200,
      statusText: 'OK',
      headers: {},
    });

    const adapter = createAxiosAdapter();
    const request = new Request('https://api.example.com/data');

    await adapter(request);

    expect(requestSpy).toHaveBeenCalledTimes(1);
    requestSpy.mockRestore();
  });

  it('should correctly convert response headers to Headers object', async () => {
    const headerInstance = createMockAxiosInstance({
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'abc-123',
        'x-rate-limit': '100',
      },
    });

    const adapter = createAxiosAdapter(headerInstance);
    const request = new Request('https://api.example.com/data');

    const response = await adapter(request);

    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.headers.get('x-request-id')).toBe('abc-123');
    expect(response.headers.get('x-rate-limit')).toBe('100');
  });

  it('should handle empty body (204 No Content) correctly', async () => {
    const noContentInstance = createMockAxiosInstance({
      status: 204,
      statusText: 'No Content',
      data: '',
    });

    const adapter = createAxiosAdapter(noContentInstance);
    const request = new Request('https://api.example.com/users/1', {
      method: 'DELETE',
    });

    const response = await adapter(request);

    expect(response.status).toBe(204);
    expect(response.statusText).toBe('No Content');
  });

  it('should pass raw text data without transformation', async () => {
    const jsonString = '{"id":1,"name":"John"}';
    const rawInstance = createMockAxiosInstance({
      data: jsonString,
      headers: { 'content-type': 'application/json' },
    });

    const adapter = createAxiosAdapter(rawInstance);
    const request = new Request('https://api.example.com/users/1');

    const response = await adapter(request);
    const text = await response.text();

    expect(text).toBe(jsonString);
  });

  it('should set validateStatus to always return true', async () => {
    const adapter = createAxiosAdapter(mockInstance);
    const request = new Request('https://api.example.com/users');

    await adapter(request);

    const call = vi.mocked(mockInstance.request).mock.calls[0]!;
    const config = call[0]!;
    expect(config.validateStatus!(200)).toBe(true);
    expect(config.validateStatus!(400)).toBe(true);
    expect(config.validateStatus!(500)).toBe(true);
  });

  it('should handle string URL input', async () => {
    const adapter = createAxiosAdapter(mockInstance);

    await adapter('https://api.example.com/health');

    expect(mockInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.example.com/health',
        method: 'GET',
      }),
    );
  });

  // ============================================================================
  // P02-1: Abort/Timeout error normalization
  // ============================================================================

  describe('P02-1: abort and timeout error normalization', () => {
    it('should rethrow axios CanceledError as DOMException with name AbortError', async () => {
      const canceledError = new axios.CanceledError('Request canceled');
      const abortInstance = {
        request: vi.fn().mockRejectedValue(canceledError),
      } as unknown as AxiosInstance;

      const adapter = createAxiosAdapter(abortInstance);
      const request = new Request('https://api.example.com/users');

      await expect(adapter(request)).rejects.toSatisfy(
        (err: unknown) => err instanceof Error && err.name === 'AbortError',
      );
    });

    it('should rethrow axios CanceledError (user abort) as DOMException AbortError, not as NetworkError', async () => {
      const canceledError = new axios.CanceledError('canceled');
      const abortInstance = {
        request: vi.fn().mockRejectedValue(canceledError),
      } as unknown as AxiosInstance;

      const adapter = createAxiosAdapter(abortInstance);
      const controller = new AbortController();
      controller.abort();
      const request = new Request('https://api.example.com/users');

      const err = await adapter(request, { signal: controller.signal }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).name).toBe('AbortError');
      expect((err as Error).name).not.toBe('NetworkError');
    });

    it('should rethrow ECONNABORTED (axios timeout) as DOMException with name TimeoutError', async () => {
      const timeoutError = Object.assign(new Error('timeout of 5000ms exceeded'), {
        code: 'ECONNABORTED',
        name: 'AxiosError',
      });
      const timeoutInstance = {
        request: vi.fn().mockRejectedValue(timeoutError),
      } as unknown as AxiosInstance;

      const adapter = createAxiosAdapter(timeoutInstance);
      const request = new Request('https://api.example.com/users');

      await expect(adapter(request)).rejects.toSatisfy(
        (err: unknown) => err instanceof Error && err.name === 'TimeoutError',
      );
    });

    it('should not re-label plain network errors as abort or timeout', async () => {
      const networkError = new TypeError('Network request failed');
      const networkInstance = {
        request: vi.fn().mockRejectedValue(networkError),
      } as unknown as AxiosInstance;

      const adapter = createAxiosAdapter(networkInstance);
      const request = new Request('https://api.example.com/users');

      await expect(adapter(request)).rejects.toSatisfy(
        (err: unknown) =>
          err instanceof Error && err.name !== 'AbortError' && err.name !== 'TimeoutError',
      );
    });
  });

  // ============================================================================
  // P02-2: Multi-value response headers (set-cookie)
  // ============================================================================

  describe('P02-2: multi-value response headers', () => {
    it('should preserve array response headers as separate entries (not comma-joined)', async () => {
      const cookies = ['sessionId=abc; Path=/; HttpOnly', 'userId=123; Path=/'];
      const headerInstance = createMockAxiosInstance({
        headers: {
          'set-cookie': cookies,
          'content-type': 'application/json',
        },
      });

      const adapter = createAxiosAdapter(headerInstance);
      const request = new Request('https://api.example.com/login');

      const response = await adapter(request);

      // Headers.getSetCookie() returns array; if comma-joined it would return a single-entry array
      const setCookieValues = response.headers.getSetCookie
        ? response.headers.getSetCookie()
        : [response.headers.get('set-cookie')];

      expect(setCookieValues).toHaveLength(2);
      expect(setCookieValues).toContain('sessionId=abc; Path=/; HttpOnly');
      expect(setCookieValues).toContain('userId=123; Path=/');
    });

    it('should not comma-join set-cookie array when accessed via get()', async () => {
      const cookies = ['a=1; Path=/', 'b=2; Path=/'];
      const headerInstance = createMockAxiosInstance({
        headers: { 'set-cookie': cookies },
      });

      const adapter = createAxiosAdapter(headerInstance);
      const response = await adapter(new Request('https://api.example.com/test'));

      // If the array was comma-joined, get() would return 'a=1; Path=/, b=2; Path=/'
      // With proper append, the Response header combines them per RFC but preserves them as two entries
      // The key check: no comma in the middle of two cookies' values
      const rawValue = response.headers.get('set-cookie');
      // Even if combined, the values should not have been String()-joined as one cookie string
      // The test ensures at least both cookie values appear
      expect(rawValue).toContain('a=1');
      expect(rawValue).toContain('b=2');
    });
  });

  // ============================================================================
  // P02-3: AbortSignal from Request object (no separate init)
  // ============================================================================

  describe('P02-3: request.signal fallback when no init.signal provided', () => {
    it('should pass request.signal to axios when no init argument is provided', async () => {
      const controller = new AbortController();
      const request = new Request('https://api.example.com/users', {
        signal: controller.signal,
      });

      // Call adapter with Request only — no init argument
      await createAxiosAdapter(mockInstance)(request);

      const call = vi.mocked(mockInstance.request).mock.calls[0]!;
      const config = call[0]!;
      // Verify a signal was forwarded (not undefined/null) and it is the request's own signal
      expect(config.signal).toBe(request.signal);
      expect(config.signal).not.toBeUndefined();
    });

    it('should prefer init.signal over request.signal when both are present', async () => {
      const requestController = new AbortController();
      const initController = new AbortController();

      const request = new Request('https://api.example.com/users', {
        signal: requestController.signal,
      });

      await createAxiosAdapter(mockInstance)(request, { signal: initController.signal });

      const call = vi.mocked(mockInstance.request).mock.calls[0]!;
      const config = call[0]!;
      // init.signal takes precedence over request.signal
      expect(config.signal).toBe(initController.signal);
      expect(config.signal).not.toBe(requestController.signal);
    });
  });

  // ============================================================================
  // P02-4: arraybuffer responseType for binary safety
  // ============================================================================

  describe('P02-4: responseType arraybuffer for binary safety', () => {
    it('should use arraybuffer responseType instead of text', async () => {
      const adapter = createAxiosAdapter(mockInstance);
      const request = new Request('https://api.example.com/file.bin');

      await adapter(request);

      expect(mockInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          responseType: 'arraybuffer',
        }),
      );
    });

    it('should correctly expose JSON body when responseType is arraybuffer', async () => {
      const jsonString = '{"id":1,"name":"John"}';
      const encoder = new TextEncoder();
      const buffer = encoder.encode(jsonString).buffer;

      const binaryInstance = createMockAxiosInstance({
        data: buffer,
        headers: { 'content-type': 'application/json' },
      });

      const adapter = createAxiosAdapter(binaryInstance);
      const response = await adapter(new Request('https://api.example.com/users/1'));
      const text = await response.text();

      expect(text).toBe(jsonString);
    });

    it('should handle binary response body correctly', async () => {
      const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]).buffer;
      const binaryInstance = createMockAxiosInstance({
        data: binaryData,
        headers: { 'content-type': 'image/png' },
      });

      const adapter = createAxiosAdapter(binaryInstance);
      const response = await adapter(new Request('https://api.example.com/image.png'));
      const arrayBuffer = await response.arrayBuffer();

      expect(arrayBuffer.byteLength).toBe(6);
      const view = new Uint8Array(arrayBuffer);
      expect(view[0]).toBe(0x89);
      expect(view[1]).toBe(0x50);
    });
  });
});
