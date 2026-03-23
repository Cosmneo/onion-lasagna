/**
 * @fileoverview Tests for GraphQL query key generation.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  defineQuery,
  defineMutation,
  defineGraphQLSchema,
} from '@cosmneo/onion-lasagna/graphql/field';
import { buildGraphQLQueryKeys } from '../query-keys';

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

describe('buildGraphQLQueryKeys', () => {
  it('generates keys for flat schema', () => {
    const getUser = defineQuery();
    const createUser = defineMutation();
    const schema = defineGraphQLSchema({ getUser, createUser });

    const keys = buildGraphQLQueryKeys(schema);

    expect((keys['getUser'] as Function)()).toEqual(['getUser']);
    expect((keys['createUser'] as Function)()).toEqual(['createUser']);
  });

  it('generates namespace keys for nested schemas', () => {
    const list = defineQuery();
    const create = defineMutation();
    const schema = defineGraphQLSchema({
      todos: { list, create },
    });

    const keys = buildGraphQLQueryKeys(schema);
    const todosKeys = keys['todos'] as (() => readonly string[]) & Record<string, unknown>;

    // Namespace is callable
    expect(todosKeys()).toEqual(['todos']);
    // Children exist
    expect((todosKeys['list'] as Function)()).toEqual(['todos', 'list']);
    expect((todosKeys['create'] as Function)()).toEqual(['todos', 'create']);
  });

  it('generates deeply nested keys', () => {
    const get = defineQuery();
    const schema = defineGraphQLSchema({
      org: { members: { get } },
    });

    const keys = buildGraphQLQueryKeys(schema);
    const orgKeys = keys['org'] as (() => readonly string[]) & Record<string, unknown>;
    const membersKeys = orgKeys['members'] as (() => readonly string[]) & Record<string, unknown>;

    expect(orgKeys()).toEqual(['org']);
    expect(membersKeys()).toEqual(['org', 'members']);
    expect((membersKeys['get'] as Function)()).toEqual(['org', 'members', 'get']);
  });

  it('appends input to key when provided', () => {
    const getUser = defineQuery({
      input: zodSchema(z.object({ id: z.string() })),
    });
    const schema = defineGraphQLSchema({ getUser });

    const keys = buildGraphQLQueryKeys(schema);
    const getKey = keys['getUser'] as Function;

    expect(getKey({ id: 'U-001' })).toEqual(['getUser', { id: 'U-001' }]);
  });

  it('does not append empty input to key', () => {
    const listUsers = defineQuery();
    const schema = defineGraphQLSchema({ listUsers });

    const keys = buildGraphQLQueryKeys(schema);
    const listKey = keys['listUsers'] as Function;

    expect(listKey()).toEqual(['listUsers']);
    expect(listKey(undefined)).toEqual(['listUsers']);
    expect(listKey(null)).toEqual(['listUsers']);
    expect(listKey({})).toEqual(['listUsers']);
  });

  it('supports queryKeyPrefix', () => {
    const list = defineQuery();
    const schema = defineGraphQLSchema({ todos: { list } });

    const keys = buildGraphQLQueryKeys(schema, ['my-api']);
    const todosKeys = keys['todos'] as (() => readonly string[]) & Record<string, unknown>;

    expect(todosKeys()).toEqual(['my-api', 'todos']);
    expect((todosKeys['list'] as Function)()).toEqual(['my-api', 'todos', 'list']);
  });

  it('works with raw config (not wrapped in defineGraphQLSchema)', () => {
    const getUser = defineQuery();
    const keys = buildGraphQLQueryKeys({ getUser });

    expect((keys['getUser'] as Function)()).toEqual(['getUser']);
  });
});
