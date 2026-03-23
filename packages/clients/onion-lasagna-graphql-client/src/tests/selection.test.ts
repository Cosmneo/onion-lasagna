/**
 * @fileoverview Tests for field selection (flat and nested).
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { defineQuery, defineMutation, defineGraphQLSchema } from '@cosmneo/onion-lasagna/graphql/field';
import { createGraphQLClient } from '../create-graphql-client';

// Minimal zodSchema for tests
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
    toJsonSchema() {
      const { $schema, ...rest } = z.toJSONSchema(schema, {
        target: 'openapi-3.0',
        reused: 'inline',
        unrepresentable: 'any',
      }) as Record<string, unknown>;
      return rest;
    },
    _output: undefined as T['_output'],
    _input: undefined as T['_input'],
    _schema: schema,
  };
}

// Helper to capture the query string sent by the client
function createCapturingClient<T extends Record<string, unknown>>(
  schema: T,
) {
  const captured: { query: string; variables?: unknown }[] = [];

  const mockFetch = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    captured.push(body);
    return new Response(JSON.stringify({ data: { [Object.keys(body)[0] ?? 'field']: null } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  const client = createGraphQLClient(schema, {
    url: 'http://test/graphql',
    fetch: mockFetch as unknown as typeof fetch,
  });

  return { client, captured };
}

describe('field selection', () => {
  describe('flat select (array)', () => {
    it('sends only selected fields in the query', async () => {
      const listUsers = defineQuery({
        output: zodSchema(z.array(z.object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
        }))),
      });
      const schema = defineGraphQLSchema({ listUsers });

      const { client, captured } = createCapturingClient(schema);

      await client.listUsers(undefined, { select: ['id', 'name'] });

      expect(captured[0]!.query).toContain('listUsers { id name }');
      expect(captured[0]!.query).not.toContain('email');
    });
  });

  describe('nested select (object)', () => {
    it('sends nested selection in the query', async () => {
      const getUser = defineQuery({
        output: zodSchema(z.object({
          id: z.string(),
          name: z.string(),
          address: z.object({
            city: z.string(),
            country: z.string(),
            zip: z.string(),
          }),
        })),
      });
      const schema = defineGraphQLSchema({ getUser });

      const { client, captured } = createCapturingClient(schema);

      await client.getUser(undefined, {
        select: { id: true, address: { city: true, country: true } },
      });

      expect(captured[0]!.query).toContain('getUser { id address { city country } }');
      expect(captured[0]!.query).not.toContain('name');
      expect(captured[0]!.query).not.toContain('zip');
    });

    it('sends deeply nested selection', async () => {
      const getOrg = defineQuery({
        output: zodSchema(z.object({
          id: z.string(),
          owner: z.object({
            name: z.string(),
            address: z.object({
              city: z.string(),
              country: z.string(),
            }),
          }),
        })),
      });
      const schema = defineGraphQLSchema({ getOrg });

      const { client, captured } = createCapturingClient(schema);

      await client.getOrg(undefined, {
        select: { owner: { address: { city: true } } },
      });

      expect(captured[0]!.query).toContain('getOrg { owner { address { city } } }');
    });
  });

  describe('default selection (no select)', () => {
    it('sends all fields from output schema', async () => {
      const getUser = defineQuery({
        output: zodSchema(z.object({
          id: z.string(),
          name: z.string(),
          active: z.boolean(),
        })),
      });
      const schema = defineGraphQLSchema({ getUser });

      const { client, captured } = createCapturingClient(schema);

      await client.getUser();

      expect(captured[0]!.query).toContain('getUser { id name active }');
    });

    it('includes nested object fields by default', async () => {
      const getUser = defineQuery({
        output: zodSchema(z.object({
          id: z.string(),
          profile: z.object({
            bio: z.string(),
            avatar: z.string(),
          }),
        })),
      });
      const schema = defineGraphQLSchema({ getUser });

      const { client, captured } = createCapturingClient(schema);

      await client.getUser();

      expect(captured[0]!.query).toContain('profile { bio avatar }');
    });
  });

  describe('mutation with select', () => {
    it('sends selected fields for mutation response', async () => {
      const createUser = defineMutation({
        input: zodSchema(z.object({ name: z.string() })),
        output: zodSchema(z.object({
          id: z.string(),
          name: z.string(),
          createdAt: z.string(),
        })),
      });
      const schema = defineGraphQLSchema({ createUser });

      const { client, captured } = createCapturingClient(schema);

      await client.createUser({ name: 'Alice' }, { select: ['id'] });

      expect(captured[0]!.query).toContain('createUser(input: $input) { id }');
      expect(captured[0]!.query).not.toContain('name');
      expect(captured[0]!.query).not.toContain('createdAt');
    });
  });
});
