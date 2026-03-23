/**
 * @fileoverview Tests for batch query functionality.
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { defineQuery, defineGraphQLSchema } from '@cosmneo/onion-lasagna/graphql/field';
import { createBatchQuery } from '../create-graphql-client';
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

function createMockFetch(responseData: Record<string, unknown>) {
  const captured: { query: string; variables?: unknown }[] = [];
  const mockFetch = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    captured.push(body);
    return new Response(JSON.stringify({ data: responseData }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return { mockFetch, captured };
}

const listTodos = defineQuery({
  output: zodSchema(z.array(z.object({ id: z.string(), title: z.string(), completed: z.boolean() }))),
});

const getTodo = defineQuery({
  input: zodSchema(z.object({ id: z.string() })),
  output: zodSchema(z.object({ id: z.string(), title: z.string(), completed: z.boolean() })),
});

const listUsers = defineQuery({
  output: zodSchema(z.array(z.object({ id: z.string(), name: z.string(), email: z.string() }))),
});

describe('createBatchQuery', () => {
  describe('single entry', () => {
    it('produces correct aliased query', async () => {
      const schema = defineGraphQLSchema({ listTodos });
      const { mockFetch, captured } = createMockFetch({ todos: [{ id: '1', title: 'Test' }] });

      const batchQuery = createBatchQuery(schema, {
        url: 'http://test/graphql',
        fetch: mockFetch as unknown as typeof fetch,
      });

      await batchQuery({
        todos: { fieldKey: 'listTodos' },
      });

      expect(captured[0]!.query).toContain('todos: listTodos');
      expect(captured[0]!.query).toContain('query BatchQuery');
    });

    it('returns data keyed by alias', async () => {
      const todoData = [{ id: '1', title: 'Test', completed: false }];
      const schema = defineGraphQLSchema({ listTodos });
      const { mockFetch } = createMockFetch({ todos: todoData });

      const batchQuery = createBatchQuery(schema, {
        url: 'http://test/graphql',
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await batchQuery({
        todos: { fieldKey: 'listTodos' },
      });

      expect(result['todos']).toEqual(todoData);
    });
  });

  describe('multiple entries', () => {
    it('produces correct multi-field query with aliases', async () => {
      const schema = defineGraphQLSchema({ listTodos, listUsers });
      const { mockFetch, captured } = createMockFetch({ myTodos: [], myUsers: [] });

      const batchQuery = createBatchQuery(schema, {
        url: 'http://test/graphql',
        fetch: mockFetch as unknown as typeof fetch,
      });

      await batchQuery({
        myTodos: { fieldKey: 'listTodos' },
        myUsers: { fieldKey: 'listUsers' },
      });

      expect(captured[0]!.query).toContain('myTodos: listTodos');
      expect(captured[0]!.query).toContain('myUsers: listUsers');
    });

    it('returns data for all aliases', async () => {
      const schema = defineGraphQLSchema({ listTodos, listUsers });
      const todoData = [{ id: '1', title: 'Test', completed: false }];
      const userData = [{ id: '1', name: 'Alice', email: 'a@b.c' }];
      const { mockFetch } = createMockFetch({ myTodos: todoData, myUsers: userData });

      const batchQuery = createBatchQuery(schema, {
        url: 'http://test/graphql',
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await batchQuery({
        myTodos: { fieldKey: 'listTodos' },
        myUsers: { fieldKey: 'listUsers' },
      });

      expect(result['myTodos']).toEqual(todoData);
      expect(result['myUsers']).toEqual(userData);
    });
  });

  describe('selection', () => {
    it('narrows requested fields in query string', async () => {
      const schema = defineGraphQLSchema({ listTodos });
      const { mockFetch, captured } = createMockFetch({ todos: [] });

      const batchQuery = createBatchQuery(schema, {
        url: 'http://test/graphql',
        fetch: mockFetch as unknown as typeof fetch,
      });

      await batchQuery({
        todos: { fieldKey: 'listTodos', select: ['id', 'title'] },
      });

      expect(captured[0]!.query).toContain('todos: listTodos { id title }');
      expect(captured[0]!.query).not.toContain('completed');
    });
  });

  describe('input handling', () => {
    it('uses alias-prefixed variable names to avoid collisions', async () => {
      const schema = defineGraphQLSchema({ getTodo });
      const { mockFetch, captured } = createMockFetch({
        first: { id: '1', title: 'First', completed: false },
        second: { id: '2', title: 'Second', completed: true },
      });

      const batchQuery = createBatchQuery(schema, {
        url: 'http://test/graphql',
        fetch: mockFetch as unknown as typeof fetch,
      });

      await batchQuery({
        first: { fieldKey: 'getTodo', input: { id: '1' } },
        second: { fieldKey: 'getTodo', input: { id: '2' } },
      });

      expect(captured[0]!.query).toContain('$first_input: GetTodoInput!');
      expect(captured[0]!.query).toContain('$second_input: GetTodoInput!');
      expect(captured[0]!.query).toContain('first: getTodo(input: $first_input)');
      expect(captured[0]!.query).toContain('second: getTodo(input: $second_input)');
      expect(captured[0]!.variables).toEqual({
        first_input: { id: '1' },
        second_input: { id: '2' },
      });
    });

    it('omits variable definitions for entries without input', async () => {
      const schema = defineGraphQLSchema({ listTodos, getTodo });
      const { mockFetch, captured } = createMockFetch({ todos: [], detail: null });

      const batchQuery = createBatchQuery(schema, {
        url: 'http://test/graphql',
        fetch: mockFetch as unknown as typeof fetch,
      });

      await batchQuery({
        todos: { fieldKey: 'listTodos' },
        detail: { fieldKey: 'getTodo', input: { id: '1' } },
      });

      expect(captured[0]!.query).toContain('$detail_input: GetTodoInput!');
      expect(captured[0]!.query).not.toContain('$todos_input');
      expect(captured[0]!.query).toContain('todos: listTodos');
    });
  });

  describe('nested schema', () => {
    it('resolves dotted field keys', async () => {
      const schema = defineGraphQLSchema({
        todos: { list: listTodos, get: getTodo },
      });
      const { mockFetch, captured } = createMockFetch({ allTodos: [], oneTodo: null });

      const batchQuery = createBatchQuery(schema, {
        url: 'http://test/graphql',
        fetch: mockFetch as unknown as typeof fetch,
      });

      await batchQuery({
        allTodos: { fieldKey: 'todos.list' },
        oneTodo: { fieldKey: 'todos.get', input: { id: '1' } },
      });

      expect(captured[0]!.query).toContain('allTodos: todosList');
      expect(captured[0]!.query).toContain('oneTodo: todosGet(input: $oneTodo_input)');
    });
  });

  describe('error handling', () => {
    it('throws when batching a mutation field', async () => {
      const createTodo = (await import('@cosmneo/onion-lasagna/graphql/field')).defineMutation({
        input: zodSchema(z.object({ title: z.string() })),
        output: zodSchema(z.object({ id: z.string() })),
      });
      const schema = defineGraphQLSchema({ listTodos, createTodo });

      const batchQuery = createBatchQuery(schema, {
        url: 'http://test/graphql',
        fetch: vi.fn() as unknown as typeof fetch,
      });

      await expect(
        batchQuery({ x: { fieldKey: 'createTodo' } }),
      ).rejects.toThrow('Cannot batch mutation "createTodo". batchQuery only supports query fields.');
    });

    it('throws on unknown field key', async () => {
      const schema = defineGraphQLSchema({ listTodos });

      const batchQuery = createBatchQuery(schema, {
        url: 'http://test/graphql',
        fetch: vi.fn() as unknown as typeof fetch,
      });

      await expect(
        batchQuery({ x: { fieldKey: 'nonExistent' } }),
      ).rejects.toThrow('Unknown field key: "nonExistent"');
    });

    it('throws GraphQLClientError on GraphQL errors', async () => {
      const schema = defineGraphQLSchema({ listTodos });
      const mockFetch = vi.fn(async () =>
        new Response(
          JSON.stringify({ errors: [{ message: 'Something went wrong' }] }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const batchQuery = createBatchQuery(schema, {
        url: 'http://test/graphql',
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(
        batchQuery({ todos: { fieldKey: 'listTodos' } }),
      ).rejects.toThrow(GraphQLClientError);
    });

    it('throws GraphQLClientError on network error', async () => {
      const schema = defineGraphQLSchema({ listTodos });
      const mockFetch = vi.fn(async () => {
        throw new Error('Connection refused');
      });

      const batchQuery = createBatchQuery(schema, {
        url: 'http://test/graphql',
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(
        batchQuery({ todos: { fieldKey: 'listTodos' } }),
      ).rejects.toThrow('Connection refused');
    });
  });
});
