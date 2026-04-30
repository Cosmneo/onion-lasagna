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

  describe('nested object outputs', () => {
    it('emits a named GraphQL type for a nested object property', () => {
      const get = defineQuery({
        input: zodSchema(z.object({ id: z.string() })),
        output: zodSchema(
          z.object({
            id: z.string(),
            address: z.object({
              country: z.string(),
              city: z.string().nullable(),
            }),
          }),
        ),
      });

      const schema = defineGraphQLSchema({ users: { get } });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('usersGet(input: UsersGetInput!): UsersGetOutput');
      expect(sdl).toContain('type UsersGetOutput {');
      expect(sdl).toContain('address: UsersGetOutput_Address!');
      expect(sdl).toContain('type UsersGetOutput_Address {');
      expect(sdl).toContain('country: String!');
      expect(sdl).not.toMatch(/address: JSON/);
    });

    it('names array-of-object element types after the array property', () => {
      const list = defineQuery({
        output: zodSchema(
          z.object({
            items: z.array(z.object({ id: z.string(), name: z.string() })),
          }),
        ),
      });

      const schema = defineGraphQLSchema({ list });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('items: [ListOutput_Item]!');
      expect(sdl).toContain('type ListOutput_Item {');
      expect(sdl).toContain('id: String!');
    });

    it('emits a nested input type for an object input field', () => {
      const create = defineMutation({
        input: zodSchema(
          z.object({
            name: z.string(),
            address: z.object({ country: z.string(), city: z.string() }),
          }),
        ),
        output: zodSchema(z.object({ id: z.string() })),
      });

      const schema = defineGraphQLSchema({ create });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('input CreateInput {');
      expect(sdl).toContain('address: CreateInput_Address!');
      expect(sdl).toContain('input CreateInput_Address {');
    });
  });

  describe('discriminated unions', () => {
    it('emits a GraphQL union with named branches and a literal-derived suffix', () => {
      const list = defineQuery({
        input: zodSchema(z.object({ workspaceId: z.string() })),
        output: zodSchema(
          z.array(
            z.discriminatedUnion('kind', [
              z.object({
                kind: z.literal('MEMBER'),
                membershipId: z.string(),
                userId: z.string(),
              }),
              z.object({
                kind: z.literal('INVITE'),
                inviteId: z.string(),
                email: z.string(),
              }),
            ]),
          ),
        ),
      });

      const schema = defineGraphQLSchema({ team: { list } });
      const sdl = generateGraphQLSDL(schema);

      // Union element type, named after the array property singularized.
      expect(sdl).toMatch(/teamList\(input: TeamListInput!\): \[TeamListOutput_Item\]!?/);
      // The union itself.
      expect(sdl).toMatch(
        /union TeamListOutput_Item = TeamListOutput_Item_Member \| TeamListOutput_Item_Invite/,
      );
      // Member type bodies.
      expect(sdl).toContain('type TeamListOutput_Item_Member {');
      expect(sdl).toContain('membershipId: String!');
      expect(sdl).toContain('type TeamListOutput_Item_Invite {');
      expect(sdl).toContain('inviteId: String!');
      // No silent JSON fallback for the field.
      expect(sdl).not.toMatch(/teamList[^\n]*: JSON/);
    });

    it('falls back to JSON for unions of mixed-type branches', () => {
      const get = defineQuery({
        output: zodSchema(z.union([z.string(), z.number()])),
      });

      const schema = defineGraphQLSchema({ get });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('get: JSON');
    });
  });
});
