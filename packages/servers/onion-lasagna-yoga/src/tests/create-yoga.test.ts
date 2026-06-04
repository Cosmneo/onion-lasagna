/**
 * @fileoverview Tests for the onion-lasagna Yoga adapter.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createOnionYoga } from '../create-yoga';
import { buildSchemaFromFields, relaxOutputNonNull } from '../build-schema';
import { mapErrorToResponse, mapToGraphQLError } from '../error-handler';
import type { UnifiedGraphQLField } from '@cosmneo/onion-lasagna/graphql/server';
import {
  UseCaseError,
  NotFoundError,
  DomainError,
  UnauthorizedError,
  ForbiddenError,
} from '@cosmneo/onion-lasagna';
import {
  defineQuery,
  defineMutation,
  defineSubscription,
  defineGraphQLSchema,
} from '@cosmneo/onion-lasagna/graphql/field';

// ============================================================================
// Inline zodSchema helper (no @cosmneo/onion-lasagna-zod dep needed in tests)
// ============================================================================

function zodSchema<T extends z.ZodType>(schema: T) {
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
      void $schema;
      return rest;
    },
    _output: undefined as T['_output'],
    _input: undefined as T['_input'],
    _schema: schema,
  };
}

// ============================================================================
// Test Helpers
// ============================================================================

function createField(overrides: Partial<UnifiedGraphQLField> = {}): UnifiedGraphQLField {
  return {
    key: 'test',
    operation: 'query',
    handler: async () => ({ result: 'ok' }),
    metadata: {
      fieldId: 'test',
    },
    ...overrides,
  };
}

async function executeQuery(
  yoga: ReturnType<typeof createOnionYoga>,
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ data?: unknown; errors?: Array<{ message: string; extensions?: unknown }> }> {
  const response = await yoga.fetch('http://localhost:4000/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  return response.json();
}

// ============================================================================
// JSON mode tests (existing — must stay green)
// ============================================================================

describe('buildSchemaFromFields', () => {
  it('builds schema with query fields', () => {
    const field = createField({
      key: 'users.get',
      operation: 'query',
      metadata: { fieldId: 'usersGet' },
    });

    const { typeDefs, resolvers } = buildSchemaFromFields([field]);

    expect(typeDefs).toContain('type Query {');
    expect(typeDefs).toContain('usersGet(input: JSON): JSON');
    expect(resolvers['Query']).toBeDefined();
    expect(resolvers['Query']['usersGet']).toBeDefined();
  });

  it('builds schema with mutation fields', () => {
    const field = createField({
      key: 'users.create',
      operation: 'mutation',
      metadata: { fieldId: 'usersCreate' },
    });

    const { typeDefs, resolvers } = buildSchemaFromFields([field]);

    expect(typeDefs).toContain('type Mutation {');
    expect(typeDefs).toContain('usersCreate(input: JSON): JSON');
    expect(resolvers['Mutation']).toBeDefined();
  });

  it('builds schema with mixed queries and mutations', () => {
    const query = createField({
      operation: 'query',
      metadata: { fieldId: 'getUser' },
    });
    const mutation = createField({
      key: 'createUser',
      operation: 'mutation',
      metadata: { fieldId: 'createUser' },
    });

    const { typeDefs } = buildSchemaFromFields([query, mutation]);

    expect(typeDefs).toContain('type Query {');
    expect(typeDefs).toContain('type Mutation {');
  });

  it('includes JSON scalar definition', () => {
    const { typeDefs, resolvers } = buildSchemaFromFields([createField()]);

    expect(typeDefs).toContain('scalar JSON');
    expect(resolvers['JSON']).toBeDefined();
  });
});

describe('createOnionYoga', () => {
  it('creates a yoga instance that responds to queries', async () => {
    const yoga = createOnionYoga({
      fields: [
        createField({
          operation: 'query',
          metadata: { fieldId: 'hello' },
          handler: async () => 'world',
        }),
      ],
    });

    const result = await executeQuery(yoga, '{ hello }');

    expect(result.data).toEqual({ hello: 'world' });
  });

  it('passes input args to handler', async () => {
    const yoga = createOnionYoga({
      fields: [
        createField({
          operation: 'query',
          metadata: { fieldId: 'getUser' },
          handler: async (args) => ({ id: args as string, name: 'Alice' }),
        }),
      ],
    });

    const result = await executeQuery(yoga, 'query ($input: JSON) { getUser(input: $input) }', {
      input: 'U-001',
    });

    expect(result.data).toEqual({ getUser: { id: 'U-001', name: 'Alice' } });
  });

  it('passes context to handler', async () => {
    const yoga = createOnionYoga({
      fields: [
        createField({
          operation: 'query',
          metadata: { fieldId: 'whoami' },
          handler: async (_args, ctx) => ({
            userId: (ctx as { userId: string }).userId,
          }),
        }),
      ],
      createContext: async () => ({ userId: 'U-123' }),
    });

    const result = await executeQuery(yoga, '{ whoami }');

    expect(result.data).toEqual({ whoami: { userId: 'U-123' } });
  });

  it('handles mutations', async () => {
    const yoga = createOnionYoga({
      fields: [
        createField({
          key: 'createProject',
          operation: 'mutation',
          metadata: { fieldId: 'createProject' },
          handler: async (args) => ({
            id: 'P-001',
            name: (args as { name: string }).name,
          }),
        }),
      ],
    });

    const result = await executeQuery(
      yoga,
      'mutation CreateProject($input: JSON) { createProject(input: $input) }',
      { input: { name: 'My Project' } },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      createProject: { id: 'P-001', name: 'My Project' },
    });
  });

  it('returns errors for handler exceptions', async () => {
    const yoga = createOnionYoga({
      fields: [
        createField({
          operation: 'query',
          metadata: { fieldId: 'failing' },
          handler: async () => {
            throw new NotFoundError({ message: 'User not found' });
          },
        }),
      ],
    });

    const result = await executeQuery(yoga, '{ failing }');

    expect(result.errors).toBeDefined();
    expect(result.errors![0]!.message).toBe('User not found');
    expect(result.errors![0]!.extensions).toEqual(expect.objectContaining({ code: 'NOT_FOUND' }));
  });

  it('masks domain errors', async () => {
    const yoga = createOnionYoga({
      fields: [
        createField({
          operation: 'query',
          metadata: { fieldId: 'internal' },
          handler: async () => {
            throw new DomainError({ message: 'secret internal detail' });
          },
        }),
      ],
    });

    const result = await executeQuery(yoga, '{ internal }');

    expect(result.errors).toBeDefined();
    expect(result.errors![0]!.message).toBe('An unexpected error occurred');
    expect(result.errors![0]!.extensions).toEqual(
      expect.objectContaining({ code: 'INTERNAL_ERROR' }),
    );
  });
});

describe('createOnionYoga — context resolver errors', () => {
  function rawFetch(yoga: ReturnType<typeof createOnionYoga>): Promise<Response> {
    return yoga.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
    });
  }

  it('maps UnauthorizedError thrown in createContext to HTTP 401', async () => {
    const yoga = createOnionYoga({
      fields: [createField({ operation: 'query', metadata: { fieldId: 'hello' } })],
      createContext: async () => {
        throw new UnauthorizedError({ message: 'Invalid token' });
      },
    });

    const response = await rawFetch(yoga);
    expect(response.status).toBe(401);

    const body = (await response.json()) as {
      errors?: Array<{ message: string; extensions?: { code?: string } }>;
    };
    expect(body.errors?.[0]?.message).toBe('Invalid token');
    expect(body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  it('maps ForbiddenError thrown in createContext to HTTP 403', async () => {
    const yoga = createOnionYoga({
      fields: [createField({ operation: 'query', metadata: { fieldId: 'hello' } })],
      createContext: async () => {
        throw new ForbiddenError({ message: 'Not allowed' });
      },
    });

    const response = await rawFetch(yoga);
    expect(response.status).toBe(403);
  });

  it('maps NotFoundError thrown in createContext to HTTP 404', async () => {
    const yoga = createOnionYoga({
      fields: [createField({ operation: 'query', metadata: { fieldId: 'hello' } })],
      createContext: async () => {
        throw new NotFoundError({ message: 'Tenant not found' });
      },
    });

    const response = await rawFetch(yoga);
    expect(response.status).toBe(404);
  });

  it('masks DomainError thrown in createContext as HTTP 500', async () => {
    const yoga = createOnionYoga({
      fields: [createField({ operation: 'query', metadata: { fieldId: 'hello' } })],
      createContext: async () => {
        throw new DomainError({ message: 'secret internal detail' });
      },
    });

    const response = await rawFetch(yoga);
    expect(response.status).toBe(500);

    const body = (await response.json()) as {
      errors?: Array<{ message: string; extensions?: { code?: string } }>;
    };
    expect(body.errors?.[0]?.message).toBe('An unexpected error occurred');
    expect(body.errors?.[0]?.extensions?.code).toBe('INTERNAL_ERROR');
  });

  it('still returns HTTP 200 when createContext succeeds', async () => {
    const yoga = createOnionYoga({
      fields: [
        createField({
          operation: 'query',
          metadata: { fieldId: 'whoami' },
          handler: async (_args, ctx) => (ctx as { userId: string }).userId,
        }),
      ],
      createContext: async () => ({ userId: 'U-1' }),
    });

    const response = await yoga.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ whoami }' }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { whoami: 'U-1' } });
  });

  it('invokes onResolverError before mapping the context error', async () => {
    const seen: Array<{ key: string }> = [];
    const yoga = createOnionYoga({
      fields: [createField({ operation: 'query', metadata: { fieldId: 'hello' } })],
      createContext: async () => {
        throw new UnauthorizedError({ message: 'nope' });
      },
      onResolverError: (_error, fieldKey) => {
        seen.push({ key: fieldKey });
      },
    });

    await rawFetch(yoga);
    expect(seen).toEqual([{ key: 'context' }]);
  });
});

describe('mapErrorToResponse', () => {
  it('maps UseCaseError to BAD_REQUEST', () => {
    const result = mapErrorToResponse(new UseCaseError({ message: 'Bad input' }));

    expect(result.message).toBe('Bad input');
    expect(result.extensions.code).toBe('BAD_REQUEST');
  });

  it('masks DomainError', () => {
    const result = mapErrorToResponse(new DomainError({ message: 'secret' }));

    expect(result.message).toBe('An unexpected error occurred');
    expect(result.extensions.code).toBe('INTERNAL_ERROR');
  });
});

describe('mapToGraphQLError', () => {
  it('returns GraphQLError instance', () => {
    const error = mapToGraphQLError(new NotFoundError({ message: 'Not found' }));

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Not found');
    expect(error.extensions).toEqual(expect.objectContaining({ code: 'NOT_FOUND' }));
  });
});

// ============================================================================
// Typed mode tests
// ============================================================================

describe('buildSchemaFromFields — typed mode', () => {
  it('CRITICAL #5: root field returning null does not cause non-nullable error', async () => {
    // Output schema is a required object but handler returns null
    const schema = defineGraphQLSchema({
      usersGet: defineQuery({
        output: zodSchema(z.object({ id: z.string() })),
      }),
    });

    const field = createField({
      key: 'usersGet',
      operation: 'query',
      metadata: { fieldId: 'usersGet' },
      handler: async () => null,
    });

    const yoga = createOnionYoga({ fields: [field], schema });
    const result = await executeQuery(yoga, '{ usersGet { id } }');

    // Must resolve to null without a non-nullable field error
    expect(result.errors).toBeUndefined();
    expect((result.data as Record<string, unknown>)['usersGet']).toBeNull();
  });

  it('CRITICAL #6: required nested prop omitted does not crash parent', async () => {
    const schema = defineGraphQLSchema({
      usersGet: defineQuery({
        output: zodSchema(z.object({ id: z.string(), name: z.string() })),
      }),
    });

    const field = createField({
      key: 'usersGet',
      operation: 'query',
      metadata: { fieldId: 'usersGet' },
      // name is omitted — handler only returns id
      handler: async () => ({ id: '1' }),
    });

    const yoga = createOnionYoga({ fields: [field], schema });
    const result = await executeQuery(yoga, '{ usersGet { id name } }');

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ usersGet: { id: '1', name: null } });
  });

  it('HIGH #20: union output emits union SDL, not JSON', () => {
    const schema = defineGraphQLSchema({
      statusGet: defineQuery({
        output: zodSchema(
          z.discriminatedUnion('kind', [
            z.object({ kind: z.literal('a'), a: z.string() }),
            z.object({ kind: z.literal('b'), b: z.number() }),
          ]),
        ),
      }),
    });

    const field = createField({
      key: 'statusGet',
      operation: 'query',
      metadata: { fieldId: 'statusGet' },
      handler: async () => ({ kind: 'a', a: 'hello' }),
    });

    const { typeDefs } = buildSchemaFromFields([field], schema);

    expect(typeDefs).toContain('union ');
    // Should NOT fall back to JSON for the field type
    expect(typeDefs).not.toMatch(/statusGet\s*:\s*JSON/);
  });

  it('HIGH #20: union output SDL is correct (union type present, not JSON)', () => {
    // Runtime union resolution requires __resolveType which is a user-space concern
    // (the resolver must set __typename). This test validates the SDL is correct.
    const schema = defineGraphQLSchema({
      statusGet: defineQuery({
        output: zodSchema(
          z.discriminatedUnion('kind', [
            z.object({ kind: z.literal('a'), a: z.string() }),
            z.object({ kind: z.literal('b'), b: z.number() }),
          ]),
        ),
      }),
    });

    const field = createField({
      key: 'statusGet',
      operation: 'query',
      metadata: { fieldId: 'statusGet' },
      handler: async () => ({ kind: 'a', a: 'hello' }),
    });

    const { typeDefs } = buildSchemaFromFields([field], schema);

    // SDL must contain a union definition, not a JSON fallback
    expect(typeDefs).toContain('union ');
    expect(typeDefs).not.toMatch(/statusGet\s*:\s*JSON/);
    // Member types should be registered
    expect(typeDefs).toContain('type StatusGetOutput_A');
    expect(typeDefs).toContain('type StatusGetOutput_B');
  });

  it('HIGH #21: custom fieldId ≠ generateFieldId(key) — typed SDL and resolver agree', async () => {
    // Field key is 'users.get' → generateFieldId → 'usersGet'
    // metadata.fieldId is deliberately different ('usersGetCustom')
    // In typed mode the SDL is keyed by generateFieldId, so the resolver must also
    // use generateFieldId(key) to match.
    const schema = defineGraphQLSchema({
      'users.get': defineQuery({
        output: zodSchema(z.object({ id: z.string() })),
      }),
    });

    const field = createField({
      key: 'users.get',
      operation: 'query',
      // metadata.fieldId deliberately differs from generateFieldId('users.get')='usersGet'
      metadata: { fieldId: 'usersGetCustom' },
      handler: async () => ({ id: 'typed-42' }),
    });

    const yoga = createOnionYoga({ fields: [field], schema });
    // SDL field name = generateFieldId('users.get') = 'usersGet'
    const result = await executeQuery(yoga, '{ usersGet { id } }');

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ usersGet: { id: 'typed-42' } });
  });

  it('HIGH #22: enum prop emits String (not JSON), query works', async () => {
    const schema = defineGraphQLSchema({
      ticketGet: defineQuery({
        output: zodSchema(z.object({ status: z.enum(['OPEN', 'CLOSED']), id: z.string() })),
      }),
    });

    const field = createField({
      key: 'ticketGet',
      operation: 'query',
      metadata: { fieldId: 'ticketGet' },
      handler: async () => ({ status: 'OPEN', id: 'T-1' }),
    });

    const { typeDefs } = buildSchemaFromFields([field], schema);

    // status field should be String (core maps enum→String), not JSON
    expect(typeDefs).toMatch(/status:\s*String/);

    // Also verify it executes correctly
    const yoga = createOnionYoga({ fields: [field], schema });
    const result = await executeQuery(yoga, '{ ticketGet { id status } }');
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ ticketGet: { id: 'T-1', status: 'OPEN' } });
  });

  it('e2e typed mode: mutation with input and output, null field safe', async () => {
    const schema = defineGraphQLSchema({
      project: {
        create: defineMutation({
          input: zodSchema(z.object({ name: z.string() })),
          output: zodSchema(z.object({ id: z.string(), name: z.string() })),
        }),
      },
    });

    const field = createField({
      key: 'project.create',
      operation: 'mutation',
      metadata: { fieldId: 'projectCreate' },
      handler: async (args) => ({ id: 'P-001', name: (args as { name: string }).name }),
    });

    const yoga = createOnionYoga({ fields: [field], schema });
    const result = await executeQuery(
      yoga,
      'mutation ($input: ProjectCreateInput!) { projectCreate(input: $input) { id name } }',
      { input: { name: 'Alpha' } },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ projectCreate: { id: 'P-001', name: 'Alpha' } });
  });
});

// ============================================================================
// relaxOutputNonNull unit tests
// ============================================================================

describe('relaxOutputNonNull', () => {
  it('drops trailing ! from output type fields', () => {
    const sdl = `type UsersGetOutput {
  id: String!
  name: String!
}`;
    const relaxed = relaxOutputNonNull(sdl);
    expect(relaxed).toContain('id: String');
    expect(relaxed).not.toContain('id: String!');
    expect(relaxed).toContain('name: String');
    expect(relaxed).not.toContain('name: String!');
  });

  it('does NOT touch input type fields', () => {
    const sdl = `input UsersGetInput {
  id: String!
  name: String!
}`;
    const relaxed = relaxOutputNonNull(sdl);
    expect(relaxed).toContain('id: String!');
    expect(relaxed).toContain('name: String!');
  });

  it('does NOT touch root Query / Mutation / Subscription fields', () => {
    const sdl = `type Query {
  usersGet: UsersGetOutput
}
type Mutation {
  usersCreate(input: UsersCreateInput!): UsersCreateOutput
}`;
    const relaxed = relaxOutputNonNull(sdl);
    // Root field types are already nullable (no ! to strip); verify input arg ! is preserved
    expect(relaxed).toContain('usersCreate(input: UsersCreateInput!): UsersCreateOutput');
  });

  it('preserves inline arg ! while dropping return type !', () => {
    const sdl = `type SomeOutput {
  nested(arg: Int!): String!
}`;
    const relaxed = relaxOutputNonNull(sdl);
    expect(relaxed).toContain('(arg: Int!)');
    expect(relaxed).not.toContain('): String!');
    expect(relaxed).toContain('): String');
  });

  it('preserves ! on list item type inside output type', () => {
    // tags: [String!] — the ! is on the list item, not the field itself
    // The outer list is nullable (no trailing !) so nothing to strip for the field,
    // but [String!] item non-null must be preserved.
    const sdl = `type ArticleOutput {
  tags: [String!]
  title: String!
}`;
    const relaxed = relaxOutputNonNull(sdl);
    expect(relaxed).toContain('tags: [String!]');
    expect(relaxed).toContain('title: String');
    expect(relaxed).not.toContain('title: String!');
  });
});

// ============================================================================
// P01-1: Union __resolveType end-to-end (BLOCKER)
// ============================================================================

describe('P01-1: union __resolveType — end-to-end', () => {
  it('resolves a discriminated union query without "must resolve to Object type" error', async () => {
    const schema = defineGraphQLSchema({
      statusGet: defineQuery({
        output: zodSchema(
          z.discriminatedUnion('kind', [
            z.object({ kind: z.literal('a'), a: z.string() }),
            z.object({ kind: z.literal('b'), b: z.number() }),
          ]),
        ),
      }),
    });

    const field = createField({
      key: 'statusGet',
      operation: 'query',
      metadata: { fieldId: 'statusGet' },
      handler: async () => ({ kind: 'a', a: 'hello' }),
    });

    const yoga = createOnionYoga({ fields: [field], schema });

    // Inline fragment on the correct member type
    const result = await executeQuery(
      yoga,
      '{ statusGet { ... on StatusGetOutput_A { a } ... on StatusGetOutput_B { b } } }',
    );

    expect(result.errors).toBeUndefined();
    expect((result.data as Record<string, unknown>)['statusGet']).toEqual({ a: 'hello' });
  });

  it('resolves to the B member when handler returns kind: b', async () => {
    const schema = defineGraphQLSchema({
      statusGet: defineQuery({
        output: zodSchema(
          z.discriminatedUnion('kind', [
            z.object({ kind: z.literal('a'), a: z.string() }),
            z.object({ kind: z.literal('b'), b: z.number() }),
          ]),
        ),
      }),
    });

    const field = createField({
      key: 'statusGet',
      operation: 'query',
      metadata: { fieldId: 'statusGet' },
      handler: async () => ({ kind: 'b', b: 42 }),
    });

    const yoga = createOnionYoga({ fields: [field], schema });

    const result = await executeQuery(
      yoga,
      '{ statusGet { ... on StatusGetOutput_A { a } ... on StatusGetOutput_B { b } } }',
    );

    expect(result.errors).toBeUndefined();
    expect((result.data as Record<string, unknown>)['statusGet']).toEqual({ b: 42 });
  });
});

// ============================================================================
// P01-2: Typed subscriptions end-to-end (CRITICAL)
// ============================================================================

async function* subscriptionQuery(
  yoga: ReturnType<typeof createOnionYoga>,
  query: string,
): AsyncGenerator<{ data?: unknown; errors?: Array<{ message: string; extensions?: unknown }> }> {
  const response = await yoga.fetch('http://localhost:4000/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ query }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim();
        if (payload && payload !== '') {
          yield JSON.parse(payload) as {
            data?: unknown;
            errors?: Array<{ message: string; extensions?: unknown }>;
          };
        }
      }
    }
  }
}

describe('P01-2: typed subscriptions — end-to-end', () => {
  it('delivers yielded items without "Output validation failed on the iterable" error', async () => {
    const schema = defineGraphQLSchema({
      counter: defineSubscription({
        output: zodSchema(z.object({ n: z.number() })),
      }),
    });

    const field = createField({
      key: 'counter',
      operation: 'subscription',
      metadata: { fieldId: 'counter' },
      handler: async function* () {
        yield { n: 1 };
        yield { n: 2 };
      },
    });

    const yoga = createOnionYoga({ fields: [field], schema });

    const received: unknown[] = [];
    for await (const event of subscriptionQuery(yoga, 'subscription { counter { n } }')) {
      if (event.errors) {
        throw new Error(`Unexpected subscription error: ${event.errors[0]?.message}`);
      }
      received.push(event.data);
    }

    expect(received).toEqual([{ counter: { n: 1 } }, { counter: { n: 2 } }]);
  });

  it('rejects an invalid yielded item per-item (masked, not leaking field path)', async () => {
    const schema = defineGraphQLSchema({
      counter: defineSubscription({
        output: zodSchema(z.object({ n: z.number() })),
      }),
    });

    const field = createField({
      key: 'counter',
      operation: 'subscription',
      metadata: { fieldId: 'counter' },
      handler: async function* () {
        yield { n: 1 }; // valid
        yield { n: 'not-a-number' }; // invalid — should be rejected per-item
      },
    });

    const yoga = createOnionYoga({ fields: [field], schema });

    const received: Array<{
      data?: unknown;
      errors?: Array<{ message: string; extensions?: unknown }>;
    }> = [];
    for await (const event of subscriptionQuery(yoga, 'subscription { counter { n } }')) {
      received.push(event);
    }

    // First item delivered ok
    const first = received[0];
    expect(first).toBeDefined();
    expect(first!.errors).toBeUndefined();
    expect(first!.data).toEqual({ counter: { n: 1 } });

    // Second item rejected — must NOT leak "output.n: ..." path details
    const second = received[1];
    expect(second).toBeDefined();
    expect(second!.errors).toBeDefined();
    const errMsg = (second!.errors as Array<{ message: string }>)[0]?.message ?? '';
    expect(errMsg).not.toContain('output.');
    expect(errMsg).not.toContain('counter');
  });
});
