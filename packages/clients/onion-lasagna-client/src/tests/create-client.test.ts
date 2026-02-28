/**
 * @fileoverview Tests for createClient factory function.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { createClient } from '../create-client';
import { ClientError } from '../client-types';
import { defineRoute, defineRouter } from '@cosmneo/onion-lasagna/http/route';
import { zodSchema } from '@cosmneo/onion-lasagna-zod';

// Sample routes for testing
const listUsersRoute = defineRoute({
  method: 'GET',
  path: '/users',
  request: {
    query: {
      schema: zodSchema(z.object({ name: z.string() })),
    },
  },
  responses: { 200: { description: 'Success' } },
});

const getUserRoute = defineRoute({
  method: 'GET',
  path: '/users/:userId',
  responses: { 200: { description: 'Success' } },
});

const createUserRoute = defineRoute({
  method: 'POST',
  path: '/users',
  request: {
    body: { schema: zodSchema(z.object({ name: z.string() })) },
  },
  responses: { 201: { description: 'Created' } },
});

const deleteUserRoute = defineRoute({
  method: 'DELETE',
  path: '/users/:userId',
  responses: { 204: { description: 'No Content' } },
});

describe('createClient', () => {
  describe('client structure', () => {
    it('creates client from router definition', () => {
      const router = defineRouter({
        list: listUsersRoute,
        get: getUserRoute,
      });

      const client = createClient(router, { baseUrl: 'http://localhost:3000' });

      expect(typeof client.list).toBe('function');
      expect(typeof client.get).toBe('function');
    });

    it('creates client from router config', () => {
      const client = createClient(
        { list: listUsersRoute, get: getUserRoute },
        { baseUrl: 'http://localhost:3000' },
      );

      expect(typeof client.list).toBe('function');
      expect(typeof client.get).toBe('function');
    });

    it('creates nested client structure', () => {
      const router = defineRouter({
        users: {
          list: listUsersRoute,
          get: getUserRoute,
        },
        posts: {
          list: defineRoute({
            method: 'GET',
            path: '/posts',
            responses: { 200: { description: 'Success' } },
          }),
        },
      });

      const client = createClient(router, { baseUrl: 'http://localhost:3000' });

      expect(typeof client.users.list).toBe('function');
      expect(typeof client.users.get).toBe('function');
      expect(typeof client.posts.list).toBe('function');
    });

    it('handles deeply nested routers', () => {
      const router = defineRouter({
        api: {
          v1: {
            users: {
              list: listUsersRoute,
            },
          },
        },
      });

      const client = createClient(router, { baseUrl: 'http://localhost:3000' });

      expect(typeof client.api.v1.users.list).toBe('function');
    });
  });

  describe('URL building', () => {
    it('builds URL with base URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = createClient(
        { list: listUsersRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      await client.list();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/users',
        }),
        expect.any(Object),
      );
    });

    it('handles trailing slash in base URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = createClient(
        { list: listUsersRoute },
        { baseUrl: 'http://localhost:3000/', fetch: mockFetch },
      );

      await client.list();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/users',
        }),
        expect.any(Object),
      );
    });

    it('replaces path parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: '123' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = createClient(
        { get: getUserRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      await client.get({ pathParams: { userId: '123' } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/users/123',
        }),
        expect.any(Object),
      );
    });

    it('encodes path parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = createClient(
        { get: getUserRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      await client.get({ pathParams: { userId: 'user/with/slashes' } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/users/user%2Fwith%2Fslashes',
        }),
        expect.any(Object),
      );
    });

    it('adds query parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = createClient(
        { list: listUsersRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      await client.list({ query: { page: 1, limit: 10 } });

      const calledUrl = mockFetch.mock.calls[0]![0].url;
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('limit=10');
    });

    it('omits undefined query parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = createClient(
        { list: listUsersRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      await client.list({ query: { page: 1, limit: undefined } });

      const calledUrl = mockFetch.mock.calls[0]![0].url;
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).not.toContain('limit');
    });
  });

  describe('request handling', () => {
    it('sends correct HTTP method', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: '123' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = createClient(
        { create: createUserRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      await client.create({ body: { name: 'John' } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
        }),
        expect.any(Object),
      );
    });

    it('sends JSON body', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: '123' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = createClient(
        { create: createUserRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      await client.create({ body: { name: 'John' } });

      const request = mockFetch.mock.calls[0]![0] as Request;
      const body = await request.text();
      expect(JSON.parse(body)).toEqual({ name: 'John' });
    });

    it('sets Content-Type header for body', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: '123' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = createClient(
        { create: createUserRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      await client.create({ body: { name: 'John' } });

      const request = mockFetch.mock.calls[0]![0] as Request;
      expect(request.headers.get('Content-Type')).toBe('application/json');
    });

    it('merges default headers with request headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = createClient(
        { list: listUsersRoute },
        {
          baseUrl: 'http://localhost:3000',
          fetch: mockFetch,
          headers: { 'X-Default': 'value' },
        },
      );

      await client.list({ headers: { 'X-Custom': 'custom-value' } });

      const request = mockFetch.mock.calls[0]![0] as Request;
      expect(request.headers.get('X-Default')).toBe('value');
      expect(request.headers.get('X-Custom')).toBe('custom-value');
    });
  });

  describe('response handling', () => {
    it('parses JSON response', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: '123', name: 'John' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = createClient(
        { get: getUserRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      const result = await client.get({ pathParams: { userId: '123' } });

      expect(result).toEqual({ id: '123', name: 'John' });
    });

    it('parses text response', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Hello World', {
          headers: { 'Content-Type': 'text/plain' },
        }),
      );

      const client = createClient(
        { list: listUsersRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      const result = await client.list();

      expect(result).toBe('Hello World');
    });

    it('returns undefined for 204 No Content', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

      const client = createClient(
        { delete: deleteUserRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      const result = await client.delete({ pathParams: { userId: '123' } });

      expect(result).toBeUndefined();
    });

    it('returns undefined for 205 Reset Content', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 205 }));

      const client = createClient(
        { delete: deleteUserRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      const result = await client.delete({ pathParams: { userId: '123' } });

      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws ClientError for non-OK responses', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = createClient(
        { get: getUserRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      await expect(client.get({ pathParams: { userId: '123' } })).rejects.toThrow(ClientError);
    });

    it('includes response body in ClientError', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = createClient(
        { get: getUserRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      try {
        await client.get({ pathParams: { userId: '123' } });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientError);
        const clientError = error as ClientError;
        expect(clientError.status).toBe(404);
        expect(clientError.statusText).toBe('Not Found');
        expect(clientError.body).toEqual({ error: 'Not found' });
      }
    });

    it('handles network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      const client = createClient(
        { list: listUsersRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch },
      );

      try {
        await client.list();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientError);
        const clientError = error as ClientError;
        expect(clientError.status).toBe(0);
        expect(clientError.statusText).toBe('Network Error');
        expect(clientError.message).toBe('Network failure');
      }
    });
  });

  describe('interceptors', () => {
    it('calls onRequest interceptor', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const onRequest = vi.fn((req: Request) => {
        // Add custom header
        const headers = new Headers(req.headers);
        headers.set('X-Custom', 'value');
        return new Request(req.url, { ...req, headers });
      });

      const client = createClient(
        { list: listUsersRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch, onRequest },
      );

      await client.list();

      expect(onRequest).toHaveBeenCalled();
    });

    it('calls onResponse interceptor', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const onResponse = vi.fn((res: Response) => res);

      const client = createClient(
        { list: listUsersRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch, onResponse },
      );

      await client.list();

      expect(onResponse).toHaveBeenCalled();
    });

    it('calls onError interceptor on error', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const onError = vi.fn();

      const client = createClient(
        { get: getUserRoute },
        { baseUrl: 'http://localhost:3000', fetch: mockFetch, onError },
      );

      await expect(client.get({ pathParams: { userId: '123' } })).rejects.toThrow();

      expect(onError).toHaveBeenCalledWith(expect.any(ClientError));
    });
  });

  describe('retry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('retries on 5xx errors', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: 'Server Error' }), {
            status: 500,
            statusText: 'Internal Server Error',
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const client = createClient(
        { list: listUsersRoute },
        {
          baseUrl: 'http://localhost:3000',
          fetch: mockFetch,
          retry: { attempts: 1, delay: 100 },
        },
      );

      const promise = client.list();

      // Advance timers for retry delay
      await vi.advanceTimersByTimeAsync(100);

      await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries on 429 Too Many Requests', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: 'Rate limited' }), {
            status: 429,
            statusText: 'Too Many Requests',
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const client = createClient(
        { list: listUsersRoute },
        {
          baseUrl: 'http://localhost:3000',
          fetch: mockFetch,
          retry: { attempts: 1, delay: 100 },
        },
      );

      const promise = client.list();
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not retry on 4xx errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = createClient(
        { get: getUserRoute },
        {
          baseUrl: 'http://localhost:3000',
          fetch: mockFetch,
          retry: { attempts: 3, delay: 100 },
        },
      );

      await expect(client.get({ pathParams: { userId: '123' } })).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('respects custom retryOn status codes', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: 'Custom' }), {
            status: 418,
            statusText: "I'm a teapot",
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const client = createClient(
        { list: listUsersRoute },
        {
          baseUrl: 'http://localhost:3000',
          fetch: mockFetch,
          retry: { attempts: 1, delay: 100, retryOn: [418] },
        },
      );

      const promise = client.list();
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws after max retry attempts', async () => {
      vi.useRealTimers(); // Use real timers for this test to avoid unhandled rejections

      // Create fresh Response for each call to avoid "body already read" errors
      const mockFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'Server Error' }), {
            status: 500,
            statusText: 'Internal Server Error',
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );

      const client = createClient(
        { list: listUsersRoute },
        {
          baseUrl: 'http://localhost:3000',
          fetch: mockFetch,
          retry: { attempts: 2, delay: 1 }, // Very short delay
        },
      );

      await expect(client.list()).rejects.toThrow(ClientError);

      // 1 initial + 2 retries = 3 total
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('timeout', () => {
    it('throws ClientError with timeout message', async () => {
      // Use real timers with a short timeout to test timeout behavior
      const mockFetch = vi.fn().mockImplementation(
        (_request: Request, options?: RequestInit) =>
          new Promise((_, reject) => {
            // Simulate abort behavior
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
            // Never resolves on its own
          }),
      );

      const client = createClient(
        { list: listUsersRoute },
        {
          baseUrl: 'http://localhost:3000',
          fetch: mockFetch,
          timeout: 50, // Very short timeout
        },
      );

      try {
        await client.list();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientError);
        const clientError = error as ClientError;
        expect(clientError.status).toBe(0);
        // The error could be either timeout or abort depending on timing
        expect(['Timeout', 'Aborted']).toContain(clientError.statusText);
      }
    });
  });
});
