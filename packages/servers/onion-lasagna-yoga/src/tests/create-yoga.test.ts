/**
 * @fileoverview Tests for the onion-lasagna Yoga adapter.
 */

import { describe, it, expect } from 'vitest';
import { createOnionYoga } from '../create-yoga';
import { buildSchemaFromFields } from '../build-schema';
import { mapErrorToResponse, mapToGraphQLError } from '../error-handler';
import type { UnifiedGraphQLField } from '@cosmneo/onion-lasagna/graphql/server';
import { UseCaseError, NotFoundError, DomainError } from '@cosmneo/onion-lasagna';

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
// Tests
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

    const result = await executeQuery(
      yoga,
      'query ($input: JSON) { getUser(input: $input) }',
      { input: 'U-001' },
    );

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
    expect(result.errors![0]!.extensions).toEqual(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    );
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
