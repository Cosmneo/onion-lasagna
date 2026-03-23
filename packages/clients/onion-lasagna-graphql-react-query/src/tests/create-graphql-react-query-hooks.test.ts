/**
 * @fileoverview Tests for GraphQL React Query hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  defineQuery,
  defineMutation,
  defineGraphQLSchema,
} from '@cosmneo/onion-lasagna/graphql/field';

// Mock React Query hooks
const mockUseQuery = vi.fn().mockReturnValue({ data: undefined, isLoading: false });
const mockUseMutation = vi.fn().mockReturnValue({ mutate: vi.fn(), isLoading: false });

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
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
const createTodo = defineMutation({
  input: zodSchema(z.object({ title: z.string() })),
  output: zodSchema(z.object({ id: z.string() })),
});
const getTodo = defineQuery({
  input: zodSchema(z.object({ id: z.string() })),
  output: zodSchema(z.object({ id: z.string(), title: z.string() })),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createGraphQLReactQueryHooks', () => {
  describe('hook structure', () => {
    it('generates useQuery for query fields', () => {
      const schema = defineGraphQLSchema({ listTodos });
      const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

      expect(hooks.listTodos).toHaveProperty('useQuery');
      expect(hooks.listTodos).not.toHaveProperty('useMutation');
    });

    it('generates useMutation for mutation fields', () => {
      const schema = defineGraphQLSchema({ createTodo });
      const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

      expect(hooks.createTodo).toHaveProperty('useMutation');
      expect(hooks.createTodo).not.toHaveProperty('useQuery');
    });

    it('preserves nested schema structure', () => {
      const schema = defineGraphQLSchema({
        todos: { list: listTodos, create: createTodo },
      });
      const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

      expect(hooks.todos.list).toHaveProperty('useQuery');
      expect(hooks.todos.create).toHaveProperty('useMutation');
    });
  });

  describe('useQuery behavior', () => {
    it('passes queryKey from path', () => {
      const schema = defineGraphQLSchema({ todos: { list: listTodos } });
      const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

      hooks.todos.list.useQuery();

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['queryKey']).toEqual(['todos', 'list']);
    });

    it('appends input to queryKey', () => {
      const schema = defineGraphQLSchema({ getTodo });
      const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

      hooks.getTodo.useQuery({ id: 'T-001' });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['queryKey']).toEqual(['getTodo', { id: 'T-001' }]);
    });

    it('passes options through to useQuery', () => {
      const schema = defineGraphQLSchema({ listTodos });
      const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

      hooks.listTodos.useQuery(undefined, { staleTime: 5000 });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['staleTime']).toBe(5000);
    });
  });

  describe('useMutation behavior', () => {
    it('wraps client method as mutationFn', () => {
      const schema = defineGraphQLSchema({ createTodo });
      const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

      hooks.createTodo.useMutation();

      const callArgs = mockUseMutation.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['mutationFn']).toBeDefined();
    });

    it('passes options through to useMutation', () => {
      const schema = defineGraphQLSchema({ createTodo });
      const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

      const onSuccess = vi.fn();
      hooks.createTodo.useMutation({ onSuccess });

      const callArgs = mockUseMutation.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['onSuccess']).toBe(onSuccess);
    });
  });

  describe('useEnabled', () => {
    it('ANDs global enabled with per-query enabled', () => {
      const useEnabled = vi.fn().mockReturnValue(false);
      const schema = defineGraphQLSchema({ listTodos });
      const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql', useEnabled });

      hooks.listTodos.useQuery();

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['enabled']).toBe(false);
    });

    it('allows per-query enabled to override', () => {
      const useEnabled = vi.fn().mockReturnValue(true);
      const schema = defineGraphQLSchema({ listTodos });
      const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql', useEnabled });

      hooks.listTodos.useQuery(undefined, { enabled: false });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['enabled']).toBe(false);
    });

    it('does not affect mutations', () => {
      const useEnabled = vi.fn().mockReturnValue(false);
      const schema = defineGraphQLSchema({ createTodo });
      const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql', useEnabled });

      hooks.createTodo.useMutation();

      // useEnabled should NOT have been called for mutations
      expect(useEnabled).not.toHaveBeenCalled();
    });
  });

  describe('queryKeyPrefix', () => {
    it('prepends prefix to all keys', () => {
      const schema = defineGraphQLSchema({ todos: { list: listTodos } });
      const { hooks } = createGraphQLReactQueryHooks(schema, {
        url: '/graphql',
        queryKeyPrefix: 'my-api',
      });

      hooks.todos.list.useQuery();

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['queryKey']).toEqual(['my-api', 'todos', 'list']);
    });
  });

  describe('queryKeys', () => {
    it('generates matching query keys', () => {
      const schema = defineGraphQLSchema({ todos: { list: listTodos } });
      const { queryKeys } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

      const todosKeys = queryKeys.todos as (() => readonly string[]) & Record<string, unknown>;
      expect(todosKeys()).toEqual(['todos']);
      expect((todosKeys['list'] as Function)()).toEqual(['todos', 'list']);
    });
  });

  describe('select', () => {
    it('passes select to client method', () => {
      const schema = defineGraphQLSchema({ listTodos });
      const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

      hooks.listTodos.useQuery(undefined, { select: ['id'] });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      const queryFn = callArgs['queryFn'] as Function;
      // queryFn will call clientMethod — we just verify it was set up
      expect(queryFn).toBeDefined();
    });
  });
});
