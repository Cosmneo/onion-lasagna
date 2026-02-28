/**
 * @fileoverview Tests for createMockClient and mockSequence.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { defineRoute, defineRouter } from '@cosmneo/onion-lasagna/http/route';
import { zodSchema } from '@cosmneo/onion-lasagna-zod';
import { createMockClient, mockSequence } from '../create-mock-client';
import { createClient, ClientError } from '../index';

// ============================================================================
// Test Routes
// ============================================================================

const listUsersRoute = defineRoute({
  method: 'GET',
  path: '/users',
  request: {
    query: {
      schema: zodSchema(z.object({ page: z.number().optional() })),
    },
  },
  responses: {
    200: {
      description: 'Success',
      schema: zodSchema(
        z.object({ items: z.array(z.object({ id: z.string() })), total: z.number() }),
      ),
    },
  },
});

const getUserRoute = defineRoute({
  method: 'GET',
  path: '/users/:userId',
  responses: {
    200: {
      description: 'Success',
      schema: zodSchema(z.object({ id: z.string(), name: z.string() })),
    },
  },
});

const createUserRoute = defineRoute({
  method: 'POST',
  path: '/users',
  request: {
    body: { schema: zodSchema(z.object({ name: z.string() })) },
  },
  responses: {
    201: {
      description: 'Created',
      schema: zodSchema(z.object({ id: z.string(), name: z.string() })),
    },
  },
});

const deleteUserRoute = defineRoute({
  method: 'DELETE',
  path: '/users/:userId',
  responses: { 204: { description: 'No Content' } },
});

const listItemsRoute = defineRoute({
  method: 'GET',
  path: '/items',
  responses: { 200: { description: 'Success' } },
});

// ============================================================================
// Tests
// ============================================================================

describe('createMockClient', () => {
  describe('client structure', () => {
    it('creates flat client from router config', () => {
      const { client } = createMockClient(
        { list: listUsersRoute, get: getUserRoute },
        { list: () => ({ items: [], total: 0 }), get: () => ({ id: '1', name: 'Alice' }) },
      );

      expect(typeof client['list']).toBe('function');
      expect(typeof client['get']).toBe('function');
    });

    it('creates flat client from defineRouter()', () => {
      const router = defineRouter({
        list: listUsersRoute,
        create: createUserRoute,
      });

      const { client } = createMockClient(router, {
        list: () => ({ items: [], total: 0 }),
        create: () => ({ id: '1', name: 'Test' }),
      });

      expect(typeof client['list']).toBe('function');
      expect(typeof client['create']).toBe('function');
    });

    it('creates nested client', () => {
      const { client } = createMockClient(
        {
          users: {
            list: listUsersRoute,
            get: getUserRoute,
            create: createUserRoute,
          },
        },
        {
          users: {
            list: () => ({ items: [], total: 0 }),
            get: () => ({ id: '1', name: 'Alice' }),
            create: () => ({ id: '2', name: 'Bob' }),
          },
        },
      );

      const users = client['users'] as Record<string, unknown>;
      expect(typeof users['list']).toBe('function');
      expect(typeof users['get']).toBe('function');
      expect(typeof users['create']).toBe('function');
    });

    it('creates deeply nested client', () => {
      const { client } = createMockClient(
        {
          api: {
            v1: {
              users: {
                list: listUsersRoute,
              },
            },
          },
        },
        {
          api: {
            v1: {
              users: {
                list: () => ({ items: [], total: 0 }),
              },
            },
          },
        },
      );

      const api = client['api'] as Record<string, unknown>;
      const v1 = api['v1'] as Record<string, unknown>;
      const users = v1['users'] as Record<string, unknown>;
      expect(typeof users['list']).toBe('function');
    });
  });

  describe('handler invocation', () => {
    it('receives pathParams correctly', async () => {
      let receivedInput: unknown;

      const { client } = createMockClient(
        { get: getUserRoute },
        {
          get: (input) => {
            receivedInput = input;
            return { id: input.pathParams.userId, name: 'Alice' };
          },
        },
      );

      await (client['get'] as (input: unknown) => Promise<unknown>)({
        pathParams: { userId: '42' },
      });

      expect(receivedInput).toEqual({ pathParams: { userId: '42' } });
    });

    it('receives query params correctly', async () => {
      let receivedInput: unknown;

      const { client } = createMockClient(
        { list: listUsersRoute },
        {
          list: (input) => {
            receivedInput = input;
            return { items: [], total: 0 };
          },
        },
      );

      await (client['list'] as (input: unknown) => Promise<unknown>)({
        query: { page: 2 },
      });

      expect(receivedInput).toEqual({ query: { page: 2 } });
    });

    it('receives body correctly', async () => {
      let receivedInput: unknown;

      const { client } = createMockClient(
        { create: createUserRoute },
        {
          create: (input) => {
            receivedInput = input;
            return { id: '1', name: input.body.name };
          },
        },
      );

      await (client['create'] as (input: unknown) => Promise<unknown>)({
        body: { name: 'Charlie' },
      });

      expect(receivedInput).toEqual({ body: { name: 'Charlie' } });
    });

    it('works without input for parameterless routes', async () => {
      const { client } = createMockClient({ list: listItemsRoute }, { list: () => undefined });

      const result = await (client['list'] as () => Promise<unknown>)();
      expect(result).toBeUndefined();
    });

    it('supports async handlers', async () => {
      const { client } = createMockClient(
        { list: listUsersRoute },
        {
          list: async () => {
            await new Promise((r) => setTimeout(r, 1));
            return { items: [{ id: '1' }], total: 1 };
          },
        },
      );

      const result = await (client['list'] as () => Promise<unknown>)();
      expect(result).toEqual({ items: [{ id: '1' }], total: 1 });
    });
  });

  describe('unregistered routes', () => {
    it('throws descriptive error with route key', async () => {
      const { client } = createMockClient(
        { list: listUsersRoute, get: getUserRoute },
        { list: () => ({ items: [], total: 0 }) },
      );

      await expect(
        (client['get'] as (input: unknown) => Promise<unknown>)({
          pathParams: { userId: '1' },
        }),
      ).rejects.toThrow('MockClient: no handler for route "get"');
    });

    it('throws descriptive error for nested route', async () => {
      const { client } = createMockClient(
        { users: { list: listUsersRoute, get: getUserRoute } },
        { users: { list: () => ({ items: [], total: 0 }) } },
      );

      const users = client['users'] as Record<string, (input: unknown) => Promise<unknown>>;
      await expect(users['get']!({ pathParams: { userId: '1' } })).rejects.toThrow(
        'MockClient: no handler for route "users.get"',
      );
    });
  });

  describe('call recording', () => {
    let calls: { route: string; input: unknown; response: unknown; timestamp: number }[];
    let client: Record<string, unknown>;
    let callsFor: (route: string) => typeof calls;
    let reset: () => void;

    beforeEach(() => {
      const result = createMockClient(
        {
          users: {
            list: listUsersRoute,
            get: getUserRoute,
            create: createUserRoute,
          },
        },
        {
          users: {
            list: () => ({ items: [], total: 0 }),
            get: (input) => ({ id: input.pathParams.userId, name: 'Alice' }),
            create: (input) => ({ id: '99', name: input.body.name }),
          },
        },
      );

      client = result.client as unknown as Record<string, unknown>;
      calls = result.calls;
      callsFor = result.callsFor;
      reset = result.reset;
    });

    it('records calls in order with route, input, response, and timestamp', async () => {
      const users = client['users'] as Record<string, (input?: unknown) => Promise<unknown>>;

      await users['list']!();
      await users['get']!({ pathParams: { userId: '5' } });

      expect(calls).toHaveLength(2);

      expect(calls[0]!.route).toBe('users.list');
      expect(calls[0]!.input).toBeUndefined();
      expect(calls[0]!.response).toEqual({ items: [], total: 0 });
      expect(typeof calls[0]!.timestamp).toBe('number');

      expect(calls[1]!.route).toBe('users.get');
      expect(calls[1]!.input).toEqual({ pathParams: { userId: '5' } });
      expect(calls[1]!.response).toEqual({ id: '5', name: 'Alice' });
    });

    it('callsFor filters by route key', async () => {
      const users = client['users'] as Record<string, (input?: unknown) => Promise<unknown>>;

      await users['list']!();
      await users['get']!({ pathParams: { userId: '1' } });
      await users['list']!({ query: { page: 2 } });

      expect(callsFor('users.list')).toHaveLength(2);
      expect(callsFor('users.get')).toHaveLength(1);
      expect(callsFor('users.create')).toHaveLength(0);
    });

    it('reset clears all calls', async () => {
      const users = client['users'] as Record<string, (input?: unknown) => Promise<unknown>>;

      await users['list']!();
      await users['create']!({ body: { name: 'Test' } });
      expect(calls).toHaveLength(2);

      reset();
      expect(calls).toHaveLength(0);
      expect(callsFor('users.list')).toHaveLength(0);
    });

    it('multiple calls accumulate', async () => {
      const users = client['users'] as Record<string, (input?: unknown) => Promise<unknown>>;

      await users['list']!();
      await users['list']!();
      await users['list']!();

      expect(calls).toHaveLength(3);
      expect(calls.every((c) => c.route === 'users.list')).toBe(true);
    });

    it('does not record failed handler calls', async () => {
      const { client: c, calls: cs } = createMockClient(
        { fail: listUsersRoute },
        {
          fail: () => {
            throw new Error('handler error');
          },
        },
      );

      await expect((c['fail'] as () => Promise<unknown>)()).rejects.toThrow('handler error');

      expect(cs).toHaveLength(0);
    });
  });

  describe('mockSequence', () => {
    it('returns values in order', async () => {
      const { client } = createMockClient(
        { list: listItemsRoute },
        {
          list: mockSequence([() => 'first', () => 'second', () => 'third']),
        },
      );

      const fn = client['list'] as () => Promise<unknown>;
      expect(await fn()).toBe('first');
      expect(await fn()).toBe('second');
      expect(await fn()).toBe('third');
    });

    it('throws after exhaustion by default', async () => {
      const { client } = createMockClient(
        { list: listItemsRoute },
        {
          list: mockSequence([() => 'only']),
        },
      );

      const fn = client['list'] as () => Promise<unknown>;
      expect(await fn()).toBe('only');
      await expect(fn()).rejects.toThrow('mockSequence: all 1 responses exhausted');
    });

    it('cycles with exhausted: cycle', async () => {
      const { client } = createMockClient(
        { list: listItemsRoute },
        {
          list: mockSequence([() => 'a', () => 'b'], { exhausted: 'cycle' }),
        },
      );

      const fn = client['list'] as () => Promise<unknown>;
      expect(await fn()).toBe('a');
      expect(await fn()).toBe('b');
      expect(await fn()).toBe('a');
      expect(await fn()).toBe('b');
    });

    it('repeats last with exhausted: last', async () => {
      const { client } = createMockClient(
        { list: listItemsRoute },
        {
          list: mockSequence([() => 'first', () => 'last'], { exhausted: 'last' }),
        },
      );

      const fn = client['list'] as () => Promise<unknown>;
      expect(await fn()).toBe('first');
      expect(await fn()).toBe('last');
      expect(await fn()).toBe('last');
      expect(await fn()).toBe('last');
    });
  });

  describe('re-exports', () => {
    it('exports createClient from core', () => {
      expect(typeof createClient).toBe('function');
    });

    it('exports ClientError from core', () => {
      const error = new ClientError('test', 404, 'Not Found');
      expect(error).toBeInstanceOf(Error);
      expect(error.status).toBe(404);
      expect(error.name).toBe('ClientError');
    });
  });
});
