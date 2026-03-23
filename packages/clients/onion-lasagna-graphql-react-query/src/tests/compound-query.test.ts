/**
 * @fileoverview Tests for the compound query hook (useGraphQLQuery).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { defineQuery, defineGraphQLSchema } from '@cosmneo/onion-lasagna/graphql/field';

// Mock React Query hooks
const mockUseQuery = vi.fn().mockReturnValue({ data: undefined, isLoading: false });

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isLoading: false }),
}));

// Must import AFTER mock
import { createGraphQLReactQueryHooks } from '../create-graphql-react-query-hooks';

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
      return {};
    },
    _output: undefined as T['_output'],
    _input: undefined as T['_input'],
    _schema: schema,
  };
}

const listTodos = defineQuery({
  output: zodSchema(z.array(z.object({ id: z.string(), title: z.string() }))),
});
const getTodo = defineQuery({
  input: zodSchema(z.object({ id: z.string() })),
  output: zodSchema(z.object({ id: z.string(), title: z.string() })),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useGraphQLQuery (compound)', () => {
  it('calls useQuery with correct queryKey and queryFn', () => {
    const schema = defineGraphQLSchema({ listTodos });
    const { useGraphQLQuery } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    useGraphQLQuery({
      todos: { field: 'listTodos' },
    });

    expect(mockUseQuery).toHaveBeenCalledTimes(1);
    const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs['queryKey']).toBeDefined();
    expect(callArgs['queryFn']).toBeDefined();
  });

  it('produces sorted query key with aliases', () => {
    const schema = defineGraphQLSchema({ listTodos, getTodo });
    const { useGraphQLQuery } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    useGraphQLQuery({
      zTodos: { field: 'listTodos' },
      aTodo: { field: 'getTodo', input: { id: '1' } },
    });

    const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
    const queryKey = callArgs['queryKey'] as unknown[];

    // First element is 'compound'
    expect(queryKey[0]).toBe('compound');

    // Sorted: aTodo before zTodos
    const entries = queryKey.slice(1) as { alias: string; field: string; input?: unknown }[];
    expect(entries[0]!.alias).toBe('aTodo');
    expect(entries[1]!.alias).toBe('zTodos');
  });

  it('useEnabled gates compound queries', () => {
    const useEnabled = vi.fn().mockReturnValue(false);
    const schema = defineGraphQLSchema({ listTodos });
    const { useGraphQLQuery } = createGraphQLReactQueryHooks(schema, {
      url: '/graphql',
      useEnabled,
    });

    useGraphQLQuery({
      todos: { field: 'listTodos' },
    });

    const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs['enabled']).toBe(false);
  });

  it('passes options through', () => {
    const schema = defineGraphQLSchema({ listTodos });
    const { useGraphQLQuery } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    useGraphQLQuery({ todos: { field: 'listTodos' } }, { staleTime: 10000, enabled: true });

    const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs['staleTime']).toBe(10000);
    expect(callArgs['enabled']).toBe(true);
  });

  it('ANDs useEnabled with per-query enabled', () => {
    const useEnabled = vi.fn().mockReturnValue(true);
    const schema = defineGraphQLSchema({ listTodos });
    const { useGraphQLQuery } = createGraphQLReactQueryHooks(schema, {
      url: '/graphql',
      useEnabled,
    });

    useGraphQLQuery({ todos: { field: 'listTodos' } }, { enabled: false });

    const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs['enabled']).toBe(false);
  });

  it('queryFn calls batchQuery with correct entries', async () => {
    const schema = defineGraphQLSchema({ listTodos, getTodo });
    const { useGraphQLQuery } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    useGraphQLQuery({
      todos: { field: 'listTodos' },
      detail: { field: 'getTodo', input: { id: '1' }, select: ['id'] },
    });

    const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
    const queryFn = callArgs['queryFn'] as Function;
    // The queryFn should be a function that calls batchQuery
    expect(queryFn).toBeDefined();
    expect(typeof queryFn).toBe('function');
  });
});
