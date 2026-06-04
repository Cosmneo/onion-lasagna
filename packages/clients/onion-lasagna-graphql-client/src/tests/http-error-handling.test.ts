/**
 * @fileoverview Tests for HTTP error handling in executeGraphQLRequest (P03-2, P03-3).
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { defineQuery, defineGraphQLSchema } from '@cosmneo/onion-lasagna/graphql/field';
import { createGraphQLClient } from '../create-graphql-client';
import { GraphQLClientError } from '../client-types';

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

function makeClient(mockFetch: typeof fetch) {
  const getUser = defineQuery({
    output: zodSchema(z.object({ id: z.string(), name: z.string() })),
  });
  const schema = defineGraphQLSchema({ getUser });
  return createGraphQLClient(schema, {
    url: 'http://test/graphql',
    fetch: mockFetch,
  });
}

describe('HTTP error handling', () => {
  describe('P03-2: non-2xx response without GraphQL errors array', () => {
    it('throws GraphQLClientError carrying the HTTP status for a 500 response with no errors', async () => {
      const mockFetch = vi.fn(async () => {
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = makeClient(mockFetch as unknown as typeof fetch);

      await expect(
        (client as Record<string, () => Promise<unknown>>)['getUser']?.(),
      ).rejects.toThrow(GraphQLClientError);
    });

    it('thrown GraphQLClientError carries the HTTP status code for 500', async () => {
      const mockFetch = vi.fn(async () => {
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = makeClient(mockFetch as unknown as typeof fetch);

      let thrown: unknown;
      try {
        await (client as Record<string, () => Promise<unknown>>)['getUser']?.();
      } catch (e) {
        thrown = e;
      }

      expect(thrown).toBeInstanceOf(GraphQLClientError);
      expect((thrown as GraphQLClientError).response?.status).toBe(500);
    });

    it('throws GraphQLClientError for 401 unauthorized', async () => {
      const mockFetch = vi.fn(async () => {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = makeClient(mockFetch as unknown as typeof fetch);

      let thrown: unknown;
      try {
        await (client as Record<string, () => Promise<unknown>>)['getUser']?.();
      } catch (e) {
        thrown = e;
      }

      expect(thrown).toBeInstanceOf(GraphQLClientError);
      expect((thrown as GraphQLClientError).response?.status).toBe(401);
    });

    it('does NOT throw for a 200 response with no errors (happy path unchanged)', async () => {
      const mockFetch = vi.fn(async () => {
        return new Response(JSON.stringify({ data: { getUser: { id: '1', name: 'Alice' } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = makeClient(mockFetch as unknown as typeof fetch);

      const result = await (client as Record<string, () => Promise<unknown>>)['getUser']?.();
      expect(result).toEqual({ id: '1', name: 'Alice' });
    });
  });

  describe('P03-3: partial response (data AND errors) attaches partial data to error', () => {
    it('throws GraphQLClientError but attaches partial data when both data and errors are present', async () => {
      const partialData = { getUser: { id: '1', name: 'Alice' } };
      const mockFetch = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: partialData,
            errors: [{ message: 'Partial failure on field X' }],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      });

      const client = makeClient(mockFetch as unknown as typeof fetch);

      let thrown: unknown;
      try {
        await (client as Record<string, () => Promise<unknown>>)['getUser']?.();
      } catch (e) {
        thrown = e;
      }

      expect(thrown).toBeInstanceOf(GraphQLClientError);
      const err = thrown as GraphQLClientError;
      expect(err.errors).toHaveLength(1);
      expect(err.errors[0]!.message).toBe('Partial failure on field X');
      // Partial data must be accessible for batch callers to recover resolved aliases
      expect(err.partialData).toEqual(partialData);
    });

    it('partialData is undefined when response has only errors (no data)', async () => {
      const mockFetch = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            errors: [{ message: 'Completely failed' }],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      });

      const client = makeClient(mockFetch as unknown as typeof fetch);

      let thrown: unknown;
      try {
        await (client as Record<string, () => Promise<unknown>>)['getUser']?.();
      } catch (e) {
        thrown = e;
      }

      expect(thrown).toBeInstanceOf(GraphQLClientError);
      expect((thrown as GraphQLClientError).partialData).toBeUndefined();
    });
  });
});
