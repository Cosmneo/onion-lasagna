/**
 * @fileoverview Tests for GraphQL SDL generation.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineQuery, defineMutation } from '../../field/define-field';
import { defineGraphQLSchema } from '../../field/define-schema';
import { generateGraphQLSDL } from '../generate';
import { zodSchema } from '../../../http/__test-utils__/zod-schema';

describe('generateGraphQLSDL', () => {
  describe('basic generation', () => {
    it('generates SDL for a single query', () => {
      const getUser = defineQuery({
        input: zodSchema(z.object({ userId: z.string() })),
        output: zodSchema(z.object({ id: z.string(), name: z.string() })),
      });

      const schema = defineGraphQLSchema({ getUser });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('type Query {');
      expect(sdl).toContain('getUser(input: GetUserInput!): GetUserOutput');
      expect(sdl).toContain('input GetUserInput {');
      expect(sdl).toContain('userId: String!');
      expect(sdl).toContain('type GetUserOutput {');
      expect(sdl).toContain('id: String!');
      expect(sdl).toContain('name: String!');
    });

    it('generates SDL for a single mutation', () => {
      const createUser = defineMutation({
        input: zodSchema(z.object({ name: z.string(), email: z.string() })),
        output: zodSchema(z.object({ id: z.string() })),
      });

      const schema = defineGraphQLSchema({ createUser });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('type Mutation {');
      expect(sdl).toContain('createUser(input: CreateUserInput!): CreateUserOutput');
      expect(sdl).toContain('input CreateUserInput {');
      expect(sdl).toContain('name: String!');
      expect(sdl).toContain('email: String!');
    });

    it('generates SDL for mixed queries and mutations', () => {
      const getUser = defineQuery({
        output: zodSchema(z.object({ id: z.string() })),
      });
      const createUser = defineMutation({
        input: zodSchema(z.object({ name: z.string() })),
        output: zodSchema(z.object({ id: z.string() })),
      });

      const schema = defineGraphQLSchema({ getUser, createUser });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('type Query {');
      expect(sdl).toContain('type Mutation {');
    });
  });

  describe('nested schemas', () => {
    it('generates fieldIds from dotted keys', () => {
      const get = defineQuery({
        input: zodSchema(z.object({ userId: z.string() })),
        output: zodSchema(z.object({ name: z.string() })),
      });

      const schema = defineGraphQLSchema({ users: { get } });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('usersGet(input: UsersGetInput!): UsersGetOutput');
      expect(sdl).toContain('input UsersGetInput {');
      expect(sdl).toContain('type UsersGetOutput {');
    });
  });

  describe('fields without schemas', () => {
    it('uses JSON for fields without output schema', () => {
      const getUser = defineQuery();
      const schema = defineGraphQLSchema({ getUser });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('getUser: JSON');
    });

    it('omits args for fields without input schema', () => {
      const listUsers = defineQuery({
        output: zodSchema(z.object({ items: z.array(z.string()) })),
      });
      const schema = defineGraphQLSchema({ listUsers });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('listUsers: ListUsersOutput');
      expect(sdl).not.toContain('listUsers(');
    });
  });

  describe('type mapping', () => {
    it('maps string to String', () => {
      const q = defineQuery({
        output: zodSchema(z.object({ name: z.string() })),
      });
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));
      expect(sdl).toContain('name: String!');
    });

    it('maps number to Float', () => {
      const q = defineQuery({
        output: zodSchema(z.object({ score: z.number() })),
      });
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));
      expect(sdl).toContain('score: Float!');
    });

    it('maps boolean to Boolean', () => {
      const q = defineQuery({
        output: zodSchema(z.object({ active: z.boolean() })),
      });
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));
      expect(sdl).toContain('active: Boolean!');
    });

    it('maps array to list type', () => {
      const q = defineQuery({
        output: zodSchema(z.object({ tags: z.array(z.string()) })),
      });
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));
      expect(sdl).toContain('tags: [String]!');
    });

    it('marks optional fields without !', () => {
      const q = defineQuery({
        output: zodSchema(z.object({ name: z.string(), bio: z.string().optional() })),
      });
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));
      expect(sdl).toContain('name: String!');
      expect(sdl).toContain('bio: String');
      // bio should NOT have !
      expect(sdl).not.toContain('bio: String!');
    });
  });

  describe('descriptions', () => {
    it('includes field descriptions', () => {
      const getUser = defineQuery({
        docs: { description: 'Retrieves a user by ID' },
      });
      const schema = defineGraphQLSchema({ getUser });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('"""Retrieves a user by ID"""');
    });

    it('omits descriptions when includeDescriptions is false', () => {
      const getUser = defineQuery({
        docs: { description: 'Retrieves a user by ID' },
      });
      const schema = defineGraphQLSchema({ getUser });
      const sdl = generateGraphQLSDL(schema, { includeDescriptions: false });

      expect(sdl).not.toContain('"""');
    });
  });

  describe('deprecations', () => {
    it('includes @deprecated directive', () => {
      const getUser = defineQuery({
        docs: { deprecated: true },
      });
      const schema = defineGraphQLSchema({ getUser });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('@deprecated');
    });

    it('includes deprecation reason', () => {
      const getUser = defineQuery({
        docs: { deprecated: true, deprecationReason: 'Use getUserV2' },
      });
      const schema = defineGraphQLSchema({ getUser });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('@deprecated(reason: "Use getUserV2")');
    });

    it('omits deprecations when includeDeprecations is false', () => {
      const getUser = defineQuery({
        docs: { deprecated: true },
      });
      const schema = defineGraphQLSchema({ getUser });
      const sdl = generateGraphQLSDL(schema, { includeDeprecations: false });

      expect(sdl).not.toContain('@deprecated');
    });
  });

  describe('preamble', () => {
    it('prepends preamble to SDL', () => {
      const getUser = defineQuery();
      const schema = defineGraphQLSchema({ getUser });
      const sdl = generateGraphQLSDL(schema, { preamble: 'scalar DateTime' });

      expect(sdl.startsWith('scalar DateTime\n')).toBe(true);
    });
  });

  describe('accepts raw config', () => {
    it('works with plain GraphQLSchemaConfig (not wrapped)', () => {
      const getUser = defineQuery({
        output: zodSchema(z.object({ id: z.string() })),
      });

      const sdl = generateGraphQLSDL({ getUser });

      expect(sdl).toContain('type Query {');
      expect(sdl).toContain('getUser: GetUserOutput');
    });
  });

  describe('empty schemas', () => {
    it('omits Query type when no queries exist', () => {
      const createUser = defineMutation();
      const schema = defineGraphQLSchema({ createUser });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).not.toContain('type Query');
      expect(sdl).toContain('type Mutation');
    });

    it('omits Mutation type when no mutations exist', () => {
      const getUser = defineQuery();
      const schema = defineGraphQLSchema({ getUser });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('type Query');
      expect(sdl).not.toContain('type Mutation');
    });
  });
});
