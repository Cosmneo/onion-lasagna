import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
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
        responseType: 'text',
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
});
