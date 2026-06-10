/**
 * @fileoverview Tests for GraphQL SDL generation.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineQuery, defineMutation } from '../../field/define-field';
import { defineGraphQLSchema } from '../../field/define-schema';
import { generateGraphQLSDL, generateGraphQLSDLWithMeta, type GraphQLSDLResult } from '../generate';
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

    it('names array-of-object element types after the array property (using _Item suffix)', () => {
      const list = defineQuery({
        output: zodSchema(
          z.object({
            items: z.array(z.object({ id: z.string(), name: z.string() })),
          }),
        ),
      });

      const schema = defineGraphQLSchema({ list });
      const sdl = generateGraphQLSDL(schema);

      // The element type is named <ParentType>_<PropName>_Item
      expect(sdl).toContain('items: [ListOutput_Items_Item]!');
      expect(sdl).toContain('type ListOutput_Items_Item {');
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

    it('falls back to JSON for a zero-element tuple property instead of emitting a memberless union', () => {
      // Zod v4 emits `{ type: 'array', items: { anyOf: [] } }` for
      // `z.tuple([])` (the "always-empty array" modelling idiom). A
      // memberless union (`union X = `) is unparseable SDL and used to
      // break the ENTIRE generated schema at parse time, surfacing as a
      // syntax error on whatever definition happened to follow it.
      const get = defineQuery({
        input: zodSchema(z.object({ workspaceId: z.string() })),
        output: zodSchema(
          z.object({
            greetingName: z.string(),
            todaySlots: z.tuple([]),
          }),
        ),
      });

      const schema = defineGraphQLSchema({ dashboard: { get } });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toContain('todaySlots: [JSON]');
      // No dangling `union X = ` with an empty right-hand side anywhere.
      expect(sdl).not.toMatch(/union \w+ =\s*$/m);
    });

    it('falls back to [JSON] for a zero-element tuple at the output root', () => {
      const get = defineQuery({
        output: zodSchema(z.tuple([])),
      });

      const schema = defineGraphQLSchema({ get });
      const sdl = generateGraphQLSDL(schema);

      expect(sdl).toMatch(/get: \[JSON\]/);
      expect(sdl).not.toMatch(/union \w+ =\s*$/m);
    });
  });

  // -------------------------------------------------------------------------
  // C07-1: fieldId collision detection
  // -------------------------------------------------------------------------
  describe('C07-1: fieldId collision detection', () => {
    it('throws when two routes produce the same fieldId', () => {
      // "users.get" → "usersGet", and a top-level "usersGet" also → "usersGet"
      const get = defineQuery({ output: zodSchema(z.object({ id: z.string() })) });

      // Both generate fieldId "usersGet"
      const schema = defineGraphQLSchema({
        users: { get },
        usersGet: get,
      });

      expect(() => generateGraphQLSDL(schema)).toThrow(/duplicate.*fieldId.*usersGet/i);
    });
  });

  // -------------------------------------------------------------------------
  // C07-2: sibling array property name collision
  // -------------------------------------------------------------------------
  describe('C07-2: sibling array name collision', () => {
    it('generates distinct item-type names for sibling arrays (item vs items)', () => {
      const q = defineQuery({
        output: zodSchema(
          z.object({
            items: z.array(z.object({ id: z.string() })),
            item: z.array(z.object({ name: z.string() })),
          }),
        ),
      });
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));

      // Both item types must be distinct
      expect(sdl).toContain('items: [QOutput_Items_Item]!');
      expect(sdl).toContain('type QOutput_Items_Item {');
      expect(sdl).toContain('item: [QOutput_Item_Item]!');
      expect(sdl).toContain('type QOutput_Item_Item {');
    });
  });

  // -------------------------------------------------------------------------
  // C07-4: invalid GraphQL identifier sanitization
  // -------------------------------------------------------------------------
  describe('C07-4: identifier sanitization', () => {
    it('sanitizes kebab-case property names to valid GraphQL identifiers', () => {
      const q = defineQuery({
        output: zodSchema(z.object({ 'content-type': z.string() })),
      });
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));

      // Must NOT emit verbatim 'content-type' as a field name
      expect(sdl).not.toContain('content-type:');
      // Must emit a valid GraphQL identifier instead
      expect(sdl).toMatch(/contentType: String/);
    });

    it('sanitizes property names with dots to valid GraphQL identifiers', () => {
      const q = defineQuery({
        output: zodSchema(z.object({ 'meta.version': z.string() })),
      });
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));

      expect(sdl).not.toContain('meta.version:');
      expect(sdl).toMatch(/metaVersion: String/);
    });
  });

  // -------------------------------------------------------------------------
  // C07 nullability: honor nullable flag
  // -------------------------------------------------------------------------
  describe('C07 nullability', () => {
    it('does not mark required-but-nullable fields as non-null', () => {
      // z.string().nullable() is in 'required' but has nullable:true
      const q = defineQuery({
        output: zodSchema(z.object({ bio: z.string().nullable() })),
      });
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));

      // 'bio' is in required but nullable — should NOT have '!'
      expect(sdl).toContain('bio: String');
      expect(sdl).not.toContain('bio: String!');
    });

    it('honors anyOf-with-null nullability (JSON Schema draft style)', () => {
      // Simulate anyOf: [{type:string},{type:null}] which some serializers emit
      const q = defineQuery({
        output: zodSchema(z.object({ value: z.string().nullable() })),
      });
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));

      expect(sdl).not.toContain('value: String!');
    });
  });

  // -------------------------------------------------------------------------
  // C07 JSON scalar: auto-declare scalar JSON
  // -------------------------------------------------------------------------
  describe('C07 JSON scalar auto-declaration', () => {
    it('declares scalar JSON automatically when JSON is referenced without preamble', () => {
      // A field with no output schema falls back to JSON
      const q = defineQuery();
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));

      expect(sdl).toContain('scalar JSON');
    });

    it('does not duplicate scalar JSON if preamble already includes it', () => {
      const q = defineQuery();
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }), {
        preamble: 'scalar JSON',
      });

      const count = (sdl.match(/scalar JSON/g) ?? []).length;
      expect(count).toBe(1);
    });

    it('does not emit scalar JSON when no JSON references exist', () => {
      const q = defineQuery({
        output: zodSchema(z.object({ id: z.string() })),
      });
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));

      expect(sdl).not.toContain('scalar JSON');
    });
  });

  // -------------------------------------------------------------------------
  // C07 empty input: guard empty input objects
  // -------------------------------------------------------------------------
  describe('C07 empty input guard', () => {
    it('falls back to JSON scalar for empty input objects instead of emitting invalid SDL', () => {
      const q = defineMutation({
        input: zodSchema(z.object({})),
        output: zodSchema(z.object({ id: z.string() })),
      });
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));

      // Must NOT emit 'input QInput { }' (empty input is invalid SDL)
      expect(sdl).not.toMatch(/input\s+QInput\s*\{[\s\n]*\}/);
      // The field should still be usable
      expect(sdl).toContain('type Mutation {');
    });
  });

  // -------------------------------------------------------------------------
  // C06-1: union member empty-object consistency
  // -------------------------------------------------------------------------
  describe('C06-1: union member with empty object', () => {
    it('falls back to JSON when a union member is an empty object', () => {
      const q = defineQuery({
        output: zodSchema(
          z.discriminatedUnion('kind', [
            z.object({ kind: z.literal('A'), name: z.string() }),
            z.object({ kind: z.literal('B') }), // only discriminator, no other fields
          ]),
        ),
      });
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));

      // Since one branch has no non-discriminator fields, the whole union falls
      // back to JSON rather than producing an invalid member type
      // OR the B member uses JSON inline. Either way, no empty type {} emitted.
      expect(sdl).not.toMatch(/type\s+\w+\s*\{\s*\}/);
    });
  });

  // -------------------------------------------------------------------------
  // KEY ENABLER: union metadata via generateGraphQLSDLWithMeta
  // -------------------------------------------------------------------------
  describe('KEY ENABLER: union metadata', () => {
    it('generateGraphQLSDLWithMeta returns a result object with sdl string and unions metadata', () => {
      const list = defineQuery({
        output: zodSchema(
          z.array(
            z.discriminatedUnion('kind', [
              z.object({ kind: z.literal('MEMBER'), membershipId: z.string() }),
              z.object({ kind: z.literal('INVITE'), email: z.string() }),
            ]),
          ),
        ),
      });

      const schema = defineGraphQLSchema({ team: { list } });
      const result: GraphQLSDLResult = generateGraphQLSDLWithMeta(schema);

      // sdl property is a string
      expect(typeof result.sdl).toBe('string');
      expect(result.sdl).toContain('type Query {');

      // unions metadata maps union type name → member names + discriminator
      expect(result.unions).toBeDefined();
      const unionEntry = result.unions['TeamListOutput_Item'];
      expect(unionEntry).toBeDefined();
      expect(unionEntry?.members).toContain('TeamListOutput_Item_Member');
      expect(unionEntry?.members).toContain('TeamListOutput_Item_Invite');
      expect(unionEntry?.discriminatorField).toBe('kind');
    });

    it('generateGraphQLSDL still returns a plain string (backward compat)', () => {
      const q = defineQuery({ output: zodSchema(z.object({ id: z.string() })) });
      const sdl = generateGraphQLSDL(defineGraphQLSchema({ q }));

      expect(typeof sdl).toBe('string');
      expect(sdl).toContain('type Query {');
    });

    it('unions metadata is empty when schema has no unions', () => {
      const q = defineQuery({ output: zodSchema(z.object({ id: z.string() })) });
      const result = generateGraphQLSDLWithMeta(defineGraphQLSchema({ q }));

      expect(result.unions).toEqual({});
    });
  });
});
