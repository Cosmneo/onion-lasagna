/**
 * @fileoverview Tests for field selection (flat and nested).
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  defineQuery,
  defineMutation,
  defineGraphQLSchema,
} from '@cosmneo/onion-lasagna/graphql/field';
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
function createCapturingClient<T extends Record<string, unknown>>(schema: T) {
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
        output: zodSchema(
          z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              email: z.string(),
            }),
          ),
        ),
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
        output: zodSchema(
          z.object({
            id: z.string(),
            name: z.string(),
            address: z.object({
              city: z.string(),
              country: z.string(),
              zip: z.string(),
            }),
          }),
        ),
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
        output: zodSchema(
          z.object({
            id: z.string(),
            owner: z.object({
              name: z.string(),
              address: z.object({
                city: z.string(),
                country: z.string(),
              }),
            }),
          }),
        ),
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
        output: zodSchema(
          z.object({
            id: z.string(),
            name: z.string(),
            active: z.boolean(),
          }),
        ),
      });
      const schema = defineGraphQLSchema({ getUser });

      const { client, captured } = createCapturingClient(schema);

      await client.getUser();

      expect(captured[0]!.query).toContain('getUser { id name active }');
    });

    it('includes nested object fields by default', async () => {
      const getUser = defineQuery({
        output: zodSchema(
          z.object({
            id: z.string(),
            profile: z.object({
              bio: z.string(),
              avatar: z.string(),
            }),
          }),
        ),
      });
      const schema = defineGraphQLSchema({ getUser });

      const { client, captured } = createCapturingClient(schema);

      await client.getUser();

      expect(captured[0]!.query).toContain('profile { bio avatar }');
    });
  });

  describe('union/discriminatedUnion output (default selection)', () => {
    it('emits inline fragments for discriminatedUnion output', async () => {
      const f = defineQuery({
        output: zodSchema(
          z.discriminatedUnion('kind', [
            z.object({ kind: z.literal('a'), a: z.string() }),
            z.object({ kind: z.literal('b'), b: z.number() }),
          ]),
        ),
      });
      const schema = defineGraphQLSchema({ f });
      const { client, captured } = createCapturingClient(schema);

      await (client as Record<string, (i?: unknown) => Promise<unknown>>)['f']?.();

      const query = captured[0]!.query;
      expect(query).toContain('__typename');
      expect(query).toContain('... on FOutput_A');
      expect(query).toContain('... on FOutput_B');
      // Must not be an empty selection set
      expect(query).not.toMatch(/\bf\s*\}/);
      expect(query).not.toMatch(/query\s*\{\s*f\s*\}/);
    });

    it('emits inline fragments for plain union output (Member naming)', async () => {
      const getResult = defineQuery({
        output: zodSchema(z.union([z.object({ x: z.string() }), z.object({ y: z.string() })])),
      });
      const schema = defineGraphQLSchema({ getResult });
      const { client, captured } = createCapturingClient(schema);

      await (client as Record<string, (i?: unknown) => Promise<unknown>>)['getResult']?.();

      const query = captured[0]!.query;
      expect(query).toContain('__typename');
      expect(query).toContain('... on GetResultOutput_Member1');
      expect(query).toContain('... on GetResultOutput_Member2');
    });

    it('uses pascalized discriminator for UPPER_SNAKE discriminator values', async () => {
      const f = defineQuery({
        output: zodSchema(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('OPEN_ACCOUNT'), balance: z.number() }),
            z.object({ type: z.literal('CLOSE_ACCOUNT'), reason: z.string() }),
          ]),
        ),
      });
      const schema = defineGraphQLSchema({ f });
      const { client, captured } = createCapturingClient(schema);

      await (client as Record<string, (i?: unknown) => Promise<unknown>>)['f']?.();

      const query = captured[0]!.query;
      expect(query).toContain('... on FOutput_OpenAccount');
      expect(query).toContain('... on FOutput_CloseAccount');
    });

    it('explicit select still overrides default union selection', async () => {
      const f = defineQuery({
        output: zodSchema(
          z.discriminatedUnion('kind', [
            z.object({ kind: z.literal('a'), a: z.string() }),
            z.object({ kind: z.literal('b'), b: z.number() }),
          ]),
        ),
      });
      const schema = defineGraphQLSchema({ f });
      const { client, captured } = createCapturingClient(schema);

      await (
        client as Record<string, (i?: unknown, opts?: { select?: unknown }) => Promise<unknown>>
      )['f']?.(undefined, { select: ['__typename', 'a'] });

      const query = captured[0]!.query;
      expect(query).toContain('f { __typename a }');
      expect(query).not.toContain('... on');
    });

    it('plain object output still uses flat field selection', async () => {
      const getUser = defineQuery({
        output: zodSchema(z.object({ id: z.string(), name: z.string() })),
      });
      const schema = defineGraphQLSchema({ getUser });
      const { client, captured } = createCapturingClient(schema);

      await (client as Record<string, (i?: unknown) => Promise<unknown>>)['getUser']?.();

      const query = captured[0]!.query;
      expect(query).toContain('getUser { id name }');
      expect(query).not.toContain('__typename');
    });
  });

  describe('union nested inside an object property (P03-1)', () => {
    it('emits __typename and inline fragments for a union nested in an object property', async () => {
      // Schema: { result: { status: 'ok' | 'err' discriminated union } }
      // The SDL generator would name the nested union `GetDataOutput_Status`
      // (derived as `${parentTypeName}_${capitalize(propName)}`).
      // The client must produce the same name so inline fragments match.
      const getData = defineQuery({
        output: zodSchema(
          z.object({
            id: z.string(),
            status: z.discriminatedUnion('kind', [
              z.object({ kind: z.literal('ok'), value: z.number() }),
              z.object({ kind: z.literal('err'), reason: z.string() }),
            ]),
          }),
        ),
      });
      const schema = defineGraphQLSchema({ getData });
      const { client, captured } = createCapturingClient(schema);

      await (client as Record<string, (i?: unknown) => Promise<unknown>>)['getData']?.();

      const query = captured[0]!.query;
      // Must include __typename inside the nested union selection
      expect(query).toContain('__typename');
      // Member names must be derived as GetDataOutput_Status_Ok and GetDataOutput_Status_Err
      expect(query).toContain('... on GetDataOutput_Status_Ok');
      expect(query).toContain('... on GetDataOutput_Status_Err');
      // The status field must have a sub-selection (not bare scalar)
      expect(query).toMatch(/status\s*\{/);
    });

    it('handles a union nested in an array-of-objects property', async () => {
      const listItems = defineQuery({
        output: zodSchema(
          z.array(
            z.object({
              id: z.string(),
              payload: z.discriminatedUnion('type', [
                z.object({ type: z.literal('text'), content: z.string() }),
                z.object({ type: z.literal('image'), url: z.string() }),
              ]),
            }),
          ),
        ),
      });
      const schema = defineGraphQLSchema({ listItems });
      const { client, captured } = createCapturingClient(schema);

      await (client as Record<string, (i?: unknown) => Promise<unknown>>)['listItems']?.();

      const query = captured[0]!.query;
      expect(query).toContain('__typename');
      // Array items type name: ListItemsOutput_Item; property 'payload' → ListItemsOutput_Item_Payload
      expect(query).toContain('... on ListItemsOutput_Item_Payload_Text');
      expect(query).toContain('... on ListItemsOutput_Item_Payload_Image');
      expect(query).toMatch(/payload\s*\{/);
    });
  });

  describe('mutation with select', () => {
    it('sends selected fields for mutation response', async () => {
      const createUser = defineMutation({
        input: zodSchema(z.object({ name: z.string() })),
        output: zodSchema(
          z.object({
            id: z.string(),
            name: z.string(),
            createdAt: z.string(),
          }),
        ),
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
