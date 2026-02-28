/**
 * @fileoverview Tests for defineRoute factory function.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineRoute } from '../define-route';
import { zodSchema } from '../../__test-utils__/zod-schema';

describe('defineRoute', () => {
  describe('basic route creation', () => {
    it('creates a GET route with minimal config', () => {
      const route = defineRoute({
        method: 'GET',
        path: '/users',
        responses: {
          200: { description: 'Success' },
        },
      });

      expect(route.method).toBe('GET');
      expect(route.path).toBe('/users');
      expect(route.responses[200]).toBeDefined();
    });

    it('creates a POST route with body', () => {
      const route = defineRoute({
        method: 'POST',
        path: '/users',
        request: {
          body: {
            schema: zodSchema(z.object({ name: z.string() })),
          },
        },
        responses: {
          201: { description: 'Created' },
        },
      });

      expect(route.method).toBe('POST');
      expect(route.request.body).toBeDefined();
      expect(route.request.body?.schema).toBeDefined();
    });

    it('creates route with query params', () => {
      const route = defineRoute({
        method: 'GET',
        path: '/users',
        request: {
          query: {
            schema: zodSchema(z.object({ page: z.number() })),
          },
        },
        responses: {
          200: { description: 'Success' },
        },
      });

      expect(route.request.query).toBeDefined();
      expect(route.request.query?.schema).toBeDefined();
    });

    it('creates route with path params schema', () => {
      const route = defineRoute({
        method: 'GET',
        path: '/users/:userId',
        request: {
          params: {
            schema: zodSchema(z.object({ userId: z.string() })),
          },
        },
        responses: {
          200: { description: 'Success' },
        },
      });

      expect(route.request.params).toBeDefined();
    });

    it('creates route with headers', () => {
      const route = defineRoute({
        method: 'GET',
        path: '/users',
        request: {
          headers: {
            schema: zodSchema(z.object({ authorization: z.string() })),
          },
        },
        responses: {
          200: { description: 'Success' },
        },
      });

      expect(route.request.headers).toBeDefined();
    });
  });

  describe('response configuration', () => {
    it('creates route with multiple response codes', () => {
      const route = defineRoute({
        method: 'POST',
        path: '/users',
        request: {
          body: {
            schema: zodSchema(z.object({ name: z.string() })),
          },
        },
        responses: {
          201: {
            description: 'Created',
            schema: zodSchema(z.object({ name: z.string() })),
          },
          400: { description: 'Bad Request' },
          409: { description: 'Conflict' },
        },
      });

      expect(route.responses[201]).toBeDefined();
      expect(route.responses[400]).toBeDefined();
      expect(route.responses[409]).toBeDefined();
    });

    it('supports response with custom content type', () => {
      const route = defineRoute({
        method: 'GET',
        path: '/export',
        responses: {
          200: {
            description: 'CSV export',
            contentType: 'text/csv',
          },
        },
      });

      expect(route.responses[200].contentType).toBe('text/csv');
    });
  });

  describe('documentation', () => {
    it('includes docs metadata', () => {
      const route = defineRoute({
        method: 'GET',
        path: '/users',
        responses: {
          200: { description: 'Success' },
        },
        docs: {
          summary: 'List all users',
          description: 'Returns a paginated list of users',
          tags: ['Users'],
          operationId: 'listUsers',
        },
      });

      expect(route.docs.summary).toBe('List all users');
      expect(route.docs.description).toBe('Returns a paginated list of users');
      expect(route.docs.tags).toEqual(['Users']);
      expect(route.docs.operationId).toBe('listUsers');
    });

    it('sets deprecated flag', () => {
      const route = defineRoute({
        method: 'GET',
        path: '/v1/users',
        responses: {
          200: { description: 'Success' },
        },
        docs: {
          deprecated: true,
        },
      });

      expect(route.docs.deprecated).toBe(true);
    });

    it('defaults deprecated to false', () => {
      const route = defineRoute({
        method: 'GET',
        path: '/users',
        responses: {
          200: { description: 'Success' },
        },
      });

      expect(route.docs.deprecated).toBe(false);
    });

    it('includes security configuration', () => {
      const route = defineRoute({
        method: 'GET',
        path: '/admin/users',
        responses: {
          200: { description: 'Success' },
        },
        docs: {
          security: [{ bearerAuth: [] }],
        },
      });

      expect(route.docs.security).toEqual([{ bearerAuth: [] }]);
    });

    it('includes external docs', () => {
      const route = defineRoute({
        method: 'GET',
        path: '/users',
        responses: {
          200: { description: 'Success' },
        },
        docs: {
          externalDocs: {
            url: 'https://docs.example.com/users',
            description: 'User API documentation',
          },
        },
      });

      expect(route.docs.externalDocs?.url).toBe('https://docs.example.com/users');
    });
  });

  describe('immutability', () => {
    it('returns frozen object', () => {
      const route = defineRoute({
        method: 'GET',
        path: '/users',
        responses: {
          200: { description: 'Success' },
        },
      });

      expect(Object.isFrozen(route)).toBe(true);
    });

    it('prevents modification', () => {
      const route = defineRoute({
        method: 'GET',
        path: '/users',
        responses: {
          200: { description: 'Success' },
        },
      });

      expect(() => {
        // @ts-expect-error - testing runtime immutability
        route.method = 'POST';
      }).toThrow();
    });
  });

  describe('HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'] as const;

    methods.forEach((method) => {
      it(`supports ${method} method`, () => {
        const route = defineRoute({
          method,
          path: '/test',
          responses: {
            200: { description: 'Success' },
          },
        });

        expect(route.method).toBe(method);
      });
    });
  });

  describe('body configuration', () => {
    it('supports required body flag', () => {
      const route = defineRoute({
        method: 'POST',
        path: '/users',
        request: {
          body: {
            schema: zodSchema(z.object({ name: z.string() })),
            required: true,
          },
        },
        responses: {
          201: { description: 'Created' },
        },
      });

      expect(route.request.body?.required).toBe(true);
    });

    it('supports custom content type', () => {
      const route = defineRoute({
        method: 'POST',
        path: '/upload',
        request: {
          body: {
            schema: zodSchema(z.object({ name: z.string() })),
            contentType: 'multipart/form-data',
          },
        },
        responses: {
          200: { description: 'Uploaded' },
        },
      });

      expect(route.request.body?.contentType).toBe('multipart/form-data');
    });

    it('supports body description', () => {
      const route = defineRoute({
        method: 'POST',
        path: '/users',
        request: {
          body: {
            schema: zodSchema(z.object({ name: z.string() })),
            description: 'User data to create',
          },
        },
        responses: {
          201: { description: 'Created' },
        },
      });

      expect(route.request.body?.description).toBe('User data to create');
    });
  });
});
