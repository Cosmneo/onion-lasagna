/**
 * @fileoverview Tests for the mock GraphQL client.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineQuery, defineMutation, defineGraphQLSchema } from '@cosmneo/onion-lasagna/graphql/field';
import { createMockGraphQLClient, mockGraphQLSequence } from '../create-mock-graphql-client';

// Use a minimal zodSchema for tests (inline, no external dep needed)
function zodSchema<T extends import('zod').ZodType>(schema: T) {
  return {
    validate(data: unknown) {
      const result = schema.safeParse(data);
      if (result.success) return { success: true as const, data: result.data };
      return {
        success: false as const,
        issues: result.error.issues.map((i) => ({ path: i.path.map(String), message: i.message })),
      };
    },
    toJsonSchema() { return {}; },
    _output: undefined as T['_output'],
    _input: undefined as T['_input'],
    _schema: schema,
  };
}

describe('createMockGraphQLClient', () => {
  it('creates a mock client with handlers', async () => {
    const getUser = defineQuery({
      input: zodSchema(z.object({ userId: z.string() })),
      output: zodSchema(z.object({ id: z.string(), name: z.string() })),
    });
    const schema = defineGraphQLSchema({ getUser });

    const { client } = createMockGraphQLClient(schema, {
      getUser: (input) => ({ id: input.userId, name: 'Alice' }),
    });

    const result = await client.getUser({ userId: 'U-001' });
    expect(result).toEqual({ id: 'U-001', name: 'Alice' });
  });

  it('records calls', async () => {
    const getUser = defineQuery();
    const schema = defineGraphQLSchema({ getUser });

    const { client, calls } = createMockGraphQLClient(schema, {
      getUser: () => ({ name: 'Alice' }),
    });

    await client.getUser();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.field).toBe('getUser');
    expect(calls[0]!.response).toEqual({ name: 'Alice' });
  });

  it('filters calls with callsFor', async () => {
    const getUser = defineQuery();
    const listUsers = defineQuery();
    const schema = defineGraphQLSchema({ getUser, listUsers });

    const { client, callsFor } = createMockGraphQLClient(schema, {
      getUser: () => ({ name: 'Alice' }),
      listUsers: () => [],
    });

    await client.getUser();
    await client.listUsers();

    expect(callsFor('getUser')).toHaveLength(1);
    expect(callsFor('listUsers')).toHaveLength(1);
  });

  it('resets call history', async () => {
    const getUser = defineQuery();
    const schema = defineGraphQLSchema({ getUser });

    const { client, calls, reset } = createMockGraphQLClient(schema, {
      getUser: () => ({ name: 'Alice' }),
    });

    await client.getUser();
    expect(calls).toHaveLength(1);

    reset();
    expect(calls).toHaveLength(0);
  });

  it('throws for unregistered handlers', async () => {
    const getUser = defineQuery();
    const schema = defineGraphQLSchema({ getUser });

    const { client } = createMockGraphQLClient(schema, {});

    await expect(client.getUser()).rejects.toThrow('no handler for field "getUser"');
  });

  it('handles nested schema structure', async () => {
    const get = defineQuery();
    const create = defineMutation();
    const schema = defineGraphQLSchema({
      users: { get, create },
    });

    const { client, callsFor } = createMockGraphQLClient(schema, {
      users: {
        get: () => ({ name: 'Alice' }),
        create: () => ({ id: '123' }),
      },
    });

    await client.users.get();
    await client.users.create();

    expect(callsFor('users.get')).toHaveLength(1);
    expect(callsFor('users.create')).toHaveLength(1);
  });
});

describe('mockGraphQLSequence', () => {
  it('returns responses in order', async () => {
    const getUser = defineQuery();
    const schema = defineGraphQLSchema({ getUser });

    const { client } = createMockGraphQLClient(schema, {
      getUser: mockGraphQLSequence([
        () => ({ name: 'First' }),
        () => ({ name: 'Second' }),
      ]),
    });

    expect(await client.getUser()).toEqual({ name: 'First' });
    expect(await client.getUser()).toEqual({ name: 'Second' });
  });

  it('throws when exhausted by default', async () => {
    const getUser = defineQuery();
    const schema = defineGraphQLSchema({ getUser });

    const { client } = createMockGraphQLClient(schema, {
      getUser: mockGraphQLSequence([() => ({ name: 'Only' })]),
    });

    await client.getUser();
    await expect(client.getUser()).rejects.toThrow('exhausted');
  });

  it('cycles when configured', async () => {
    const getUser = defineQuery();
    const schema = defineGraphQLSchema({ getUser });

    const { client } = createMockGraphQLClient(schema, {
      getUser: mockGraphQLSequence([() => 'a', () => 'b'], { exhausted: 'cycle' }),
    });

    expect(await client.getUser()).toBe('a');
    expect(await client.getUser()).toBe('b');
    expect(await client.getUser()).toBe('a');
  });

  it('repeats last when configured', async () => {
    const getUser = defineQuery();
    const schema = defineGraphQLSchema({ getUser });

    const { client } = createMockGraphQLClient(schema, {
      getUser: mockGraphQLSequence([() => 'a', () => 'b'], { exhausted: 'last' }),
    });

    expect(await client.getUser()).toBe('a');
    expect(await client.getUser()).toBe('b');
    expect(await client.getUser()).toBe('b');
  });
});
