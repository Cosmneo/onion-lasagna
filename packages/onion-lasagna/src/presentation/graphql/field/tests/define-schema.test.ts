/**
 * @fileoverview Tests for defineGraphQLSchema and mergeGraphQLSchemas.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineQuery, defineMutation } from '../define-field';
import { defineGraphQLSchema, mergeGraphQLSchemas } from '../define-schema';
import { zodSchema } from '../../../http/__test-utils__/zod-schema';

describe('defineGraphQLSchema', () => {
  it('creates a schema from flat fields', () => {
    const getUser = defineQuery({ input: zodSchema(z.object({ id: z.string() })) });
    const createUser = defineMutation({ input: zodSchema(z.object({ name: z.string() })) });

    const schema = defineGraphQLSchema({ getUser, createUser });

    expect(schema._isGraphQLSchema).toBe(true);
    expect(schema.fields.getUser).toBe(getUser);
    expect(schema.fields.createUser).toBe(createUser);
  });

  it('creates a schema from nested fields', () => {
    const getUser = defineQuery();
    const createUser = defineMutation();

    const schema = defineGraphQLSchema({
      users: { get: getUser, create: createUser },
    });

    expect((schema.fields.users as any).get).toBeDefined();
    expect((schema.fields.users as any).create).toBeDefined();
  });

  it('freezes the schema definition', () => {
    const schema = defineGraphQLSchema({ getUser: defineQuery() });

    expect(Object.isFrozen(schema)).toBe(true);
  });

  describe('defaults', () => {
    it('applies context defaults to fields without context', () => {
      const contextSchema = zodSchema(z.object({ userId: z.string() }));
      const getUser = defineQuery();

      const schema = defineGraphQLSchema({ getUser }, { defaults: { context: contextSchema } });

      expect(schema.fields.getUser.context).toBe(contextSchema);
    });

    it('does not override existing field context', () => {
      const defaultContext = zodSchema(z.object({ userId: z.string() }));
      const fieldContext = zodSchema(z.object({ adminId: z.string() }));
      const getUser = defineQuery({ context: fieldContext });

      const schema = defineGraphQLSchema({ getUser }, { defaults: { context: defaultContext } });

      expect(schema.fields.getUser.context).toBe(fieldContext);
    });

    it('applies tag defaults', () => {
      const getUser = defineQuery({ docs: { tags: ['Public'] } });

      const schema = defineGraphQLSchema({ getUser }, { defaults: { tags: ['Users'] } });

      expect(schema.fields.getUser.docs.tags).toEqual(['Users', 'Public']);
    });
  });
});

describe('mergeGraphQLSchemas', () => {
  it('merges two schemas', () => {
    const schema1 = defineGraphQLSchema({ getUser: defineQuery() });
    const schema2 = defineGraphQLSchema({ createUser: defineMutation() });

    const merged = mergeGraphQLSchemas(schema1, schema2);

    expect(merged._isGraphQLSchema).toBe(true);
    expect(merged.fields.getUser).toBeDefined();
    expect(merged.fields.createUser).toBeDefined();
  });

  it('deep-merges nested schemas', () => {
    const schema1 = defineGraphQLSchema({ users: { get: defineQuery() } });
    const schema2 = defineGraphQLSchema({ users: { create: defineMutation() } });

    const merged = mergeGraphQLSchemas(schema1, schema2);

    expect((merged.fields.users as any).get).toBeDefined();
    expect((merged.fields.users as any).create).toBeDefined();
  });

  it('later schema overwrites on collision', () => {
    const query1 = defineQuery({ docs: { description: 'v1' } });
    const query2 = defineQuery({ docs: { description: 'v2' } });

    const merged = mergeGraphQLSchemas({ getUser: query1 }, { getUser: query2 });

    expect(merged.fields.getUser.docs.description).toBe('v2');
  });

  it('merges three schemas', () => {
    const s1 = { a: defineQuery() };
    const s2 = { b: defineMutation() };
    const s3 = { c: defineQuery() };

    const merged = mergeGraphQLSchemas(s1, s2, s3);

    expect(merged.fields.a).toBeDefined();
    expect(merged.fields.b).toBeDefined();
    expect(merged.fields.c).toBeDefined();
  });
});
