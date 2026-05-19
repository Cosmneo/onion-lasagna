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
  queryOptions: (opts: unknown) => opts,
}));

// Must import AFTER mock
import { createGraphQLReactQueryHooks, buildQueryKey } from '../create-graphql-react-query-hooks';

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

describe('buildQueryKey', () => {
  it('returns only keyPath when scope and select are absent', () => {
    expect(buildQueryKey(undefined, ['todos', 'list'], undefined, undefined)).toEqual([
      'todos',
      'list',
    ]);
  });

  it('returns keyPath + input when select and scope absent', () => {
    expect(buildQueryKey(undefined, ['getTodo'], { id: '1' }, undefined)).toEqual([
      'getTodo',
      { id: '1' },
    ]);
  });

  it('appends select segment when select is provided', () => {
    expect(buildQueryKey(undefined, ['todos', 'list'], undefined, ['id'])).toEqual([
      'todos',
      'list',
      { __select: ['id'] },
    ]);
  });

  it('prepends scope segment when scope is provided', () => {
    expect(buildQueryKey('userA', ['todos', 'list'], undefined, undefined)).toEqual([
      { __scope: 'userA' },
      'todos',
      'list',
    ]);
  });

  it('includes all segments in correct order: scope, keyPath, input, select', () => {
    expect(buildQueryKey('userA', ['getTodo'], { id: '1' }, ['id', 'title'])).toEqual([
      { __scope: 'userA' },
      'getTodo',
      { id: '1' },
      { __select: ['id', 'title'] },
    ]);
  });

  it('omits scope segment for null scope', () => {
    expect(buildQueryKey(null, ['todos', 'list'], undefined, undefined)).toEqual(['todos', 'list']);
  });

  it('two calls with different select produce different keys', () => {
    const keyA = buildQueryKey(undefined, ['todos', 'list'], undefined, ['id']);
    const keyB = buildQueryKey(undefined, ['todos', 'list'], undefined, undefined);
    expect(keyA).not.toEqual(keyB);
  });

  it('two calls with different scope produce different keys', () => {
    const keyA = buildQueryKey('userA', ['todos', 'list'], undefined, undefined);
    const keyB = buildQueryKey('userB', ['todos', 'list'], undefined, undefined);
    expect(keyA).not.toEqual(keyB);
  });
});

describe('queryKeyScope in useQuery', () => {
  it('scopes query key by auth scope value', () => {
    const queryKeyScope = vi.fn().mockReturnValue('user-123');
    const schema = defineGraphQLSchema({ listTodos });
    const { hooks } = createGraphQLReactQueryHooks(schema, {
      url: '/graphql',
      queryKeyScope,
    });

    hooks.listTodos.useQuery();

    const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs['queryKey']).toEqual([{ __scope: 'user-123' }, 'listTodos']);
  });

  it('different scope values produce different keys', () => {
    const queryKeyScope = vi.fn().mockReturnValueOnce('userA').mockReturnValueOnce('userB');
    const schema = defineGraphQLSchema({ listTodos });
    const { hooks } = createGraphQLReactQueryHooks(schema, {
      url: '/graphql',
      queryKeyScope,
    });

    hooks.listTodos.useQuery();
    const callArgsA = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;

    hooks.listTodos.useQuery();
    const callArgsB = mockUseQuery.mock.calls[1]![0] as Record<string, unknown>;

    expect(callArgsA['queryKey']).not.toEqual(callArgsB['queryKey']);
  });

  it('no queryKeyScope produces same key as before (regression guard)', () => {
    const schema = defineGraphQLSchema({ todos: { list: listTodos } });
    const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    hooks.todos.list.useQuery();

    const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs['queryKey']).toEqual(['todos', 'list']);
  });

  it('no select produces same key as before (regression guard)', () => {
    const schema = defineGraphQLSchema({ getTodo });
    const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    hooks.getTodo.useQuery({ id: 'T-001' });

    const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs['queryKey']).toEqual(['getTodo', { id: 'T-001' }]);
  });

  it('same input with different select produces different keys', () => {
    const schema = defineGraphQLSchema({ listTodos });
    const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    hooks.listTodos.useQuery(undefined, { select: ['id'] });
    const callArgsA = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;

    hooks.listTodos.useQuery(undefined, {});
    const callArgsB = mockUseQuery.mock.calls[1]![0] as Record<string, unknown>;

    expect(callArgsA['queryKey']).not.toEqual(callArgsB['queryKey']);
  });
});

describe('queryOptions factory with scope and select', () => {
  it('key with scope and select matches buildQueryKey output', () => {
    const schema = defineGraphQLSchema({ listTodos });
    const { queryOptions: qo } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    const result = (qo.listTodos as Function)(undefined, {
      scope: 'user-99',
      select: ['id'],
    }) as Record<string, unknown>;

    expect(result['queryKey']).toEqual(buildQueryKey('user-99', ['listTodos'], undefined, ['id']));
  });

  it('key without scope/select matches hook key (cache hit)', () => {
    const schema = defineGraphQLSchema({ getTodo });
    const { queryOptions: qo } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    const result = (qo.getTodo as Function)({ id: '5' }) as Record<string, unknown>;

    expect(result['queryKey']).toEqual(
      buildQueryKey(undefined, ['getTodo'], { id: '5' }, undefined),
    );
    expect(result['queryKey']).toEqual(['getTodo', { id: '5' }]);
  });

  it('key with scope matches hook scope key', () => {
    const schema = defineGraphQLSchema({ listTodos });
    const { queryOptions: qo } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    const result = (qo.listTodos as Function)(undefined, { scope: 'tenant-42' }) as Record<
      string,
      unknown
    >;

    expect(result['queryKey']).toEqual([{ __scope: 'tenant-42' }, 'listTodos']);
  });
});
