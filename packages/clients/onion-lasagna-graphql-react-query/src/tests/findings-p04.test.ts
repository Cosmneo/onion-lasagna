/**
 * @fileoverview Repro tests for P04 findings (subscription handling + option clobber).
 *
 * P04-1: subscription fields must NOT silently become useMutation — they must be omitted
 *        from the hooks proxy and InferGraphQLHooks type.
 * P04-2: queryFn must forward the React Query AbortSignal into the client method.
 * P04-3: library-controlled fields (queryKey/queryFn/mutationFn) must not be clobberable
 *        via user options spread.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  defineQuery,
  defineMutation,
  defineSubscription,
  defineGraphQLSchema,
} from '@cosmneo/onion-lasagna/graphql/field';

// --- React Query mock setup ---
const mockUseQuery = vi.fn().mockReturnValue({ data: undefined, isLoading: false });
const mockUseMutation = vi.fn().mockReturnValue({ mutate: vi.fn(), isLoading: false });

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  queryOptions: (opts: unknown) => opts,
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
const onTodoCreated = defineSubscription({
  input: zodSchema(z.object({ projectId: z.string() })),
  output: zodSchema(z.object({ id: z.string(), title: z.string() })),
});

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// P04-1: Subscription fields must NOT silently become useMutation
// =============================================================================

describe('P04-1: subscription fields', () => {
  it('subscription field must NOT appear in the hooks proxy as useMutation', () => {
    const schema = defineGraphQLSchema({ listTodos, onTodoCreated });
    const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    // onTodoCreated is a subscription — it MUST NOT silently masquerade as a mutation.
    // The hooks proxy omits the key entirely (undefined), so it cannot have useMutation.
    const subHook = (hooks as Record<string, unknown>)['onTodoCreated'];
    // Either the key is absent/undefined, or if present it must not expose useMutation
    if (subHook != null) {
      expect(subHook).not.toHaveProperty('useMutation');
    } else {
      expect(subHook).toBeUndefined();
    }
  });

  it('subscription field must NOT have useQuery either (not supported by RQ)', () => {
    const schema = defineGraphQLSchema({ listTodos, onTodoCreated });
    const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    const subHook = (hooks as Record<string, unknown>)['onTodoCreated'];
    if (subHook != null) {
      expect(subHook).not.toHaveProperty('useQuery');
    } else {
      expect(subHook).toBeUndefined();
    }
  });

  it('subscription field must be undefined or null in the hooks proxy (omitted)', () => {
    const schema = defineGraphQLSchema({ listTodos, onTodoCreated });
    const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    // The subscription key should not be a hook object — it should be absent or undefined
    const subHook = (hooks as Record<string, unknown>)['onTodoCreated'];
    expect(subHook == null || subHook === undefined).toBe(true);
  });

  it('query and mutation fields still work alongside a subscription field', () => {
    const schema = defineGraphQLSchema({ listTodos, createTodo, onTodoCreated });
    const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    // Query and mutation should still be present
    expect(hooks.listTodos).toHaveProperty('useQuery');
    expect(hooks.createTodo).toHaveProperty('useMutation');
  });

  it('calling useMutation is not triggered for a subscription field', () => {
    const schema = defineGraphQLSchema({ listTodos, onTodoCreated });
    // If hooks proxy silently returned a mutation hook, useMutation would be called
    createGraphQLReactQueryHooks(schema, { url: '/graphql' });
    // useMutation should NOT be called during proxy construction
    expect(mockUseMutation).not.toHaveBeenCalled();
  });
});

// =============================================================================
// P04-2: AbortSignal threading
// =============================================================================

describe('P04-2: AbortSignal threading', () => {
  it('queryFn receives and forwards the AbortSignal from React Query', async () => {
    // Create a client with a custom fetch so we can inspect the request init
    const capturedInits: RequestInit[] = [];
    const mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedInits.push(init ?? {});
      return new Response(JSON.stringify({ data: { listTodos: [] } }));
    });

    const schema = defineGraphQLSchema({ listTodos });
    const { hooks } = createGraphQLReactQueryHooks(schema, {
      url: '/graphql',
      fetch: mockFetch as typeof fetch,
    });

    hooks.listTodos.useQuery();

    // React Query passes an object with { signal } to queryFn
    const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
    const queryFn = callArgs['queryFn'] as (ctx: { signal: AbortSignal }) => Promise<unknown>;
    expect(typeof queryFn).toBe('function');

    // Call queryFn with a signal and verify it is forwarded to fetch
    const controller = new AbortController();
    await queryFn({ signal: controller.signal });

    expect(capturedInits.length).toBe(1);
    expect(capturedInits[0]!.signal).toBe(controller.signal);
  });
});

// =============================================================================
// P04-3: Options must NOT clobber library-controlled fields
// =============================================================================

describe('P04-3: options cannot clobber queryKey/queryFn/mutationFn', () => {
  it('user-provided queryKey in options does NOT override library queryKey', () => {
    const schema = defineGraphQLSchema({ listTodos });
    const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    const userQueryKey = ['hacker', 'key'];
    // Pass queryKey in options — it must be ignored / overridden by the library
    hooks.listTodos.useQuery(undefined, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryKey: userQueryKey as any,
    });

    const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
    // The library's queryKey must win
    expect(callArgs['queryKey']).not.toEqual(userQueryKey);
    expect(callArgs['queryKey']).toEqual(['listTodos']);
  });

  it('user-provided queryFn in options does NOT override library queryFn', () => {
    const schema = defineGraphQLSchema({ listTodos });
    const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    const userQueryFn = vi.fn();
    hooks.listTodos.useQuery(undefined, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryFn: userQueryFn as any,
    });

    const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
    // The library's queryFn must win (not the user-supplied one)
    expect(callArgs['queryFn']).not.toBe(userQueryFn);
  });

  it('user-provided mutationFn in options does NOT override library mutationFn', () => {
    const schema = defineGraphQLSchema({ createTodo });
    const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    const userMutationFn = vi.fn();
    hooks.createTodo.useMutation({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mutationFn: userMutationFn as any,
    });

    const callArgs = mockUseMutation.mock.calls[0]![0] as Record<string, unknown>;
    // The library's mutationFn must win
    expect(callArgs['mutationFn']).not.toBe(userMutationFn);
  });

  it('legitimate user options (staleTime, onSuccess) still pass through', () => {
    const schema = defineGraphQLSchema({ listTodos, createTodo });
    const { hooks } = createGraphQLReactQueryHooks(schema, { url: '/graphql' });

    hooks.listTodos.useQuery(undefined, { staleTime: 9999 });
    const queryCallArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
    expect(queryCallArgs['staleTime']).toBe(9999);

    const onSuccess = vi.fn();
    hooks.createTodo.useMutation({ onSuccess });
    const mutCallArgs = mockUseMutation.mock.calls[0]![0] as Record<string, unknown>;
    expect(mutCallArgs['onSuccess']).toBe(onSuccess);
  });
});
