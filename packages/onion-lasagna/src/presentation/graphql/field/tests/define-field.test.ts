/**
 * @fileoverview Tests for defineQuery and defineMutation factory functions.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineQuery, defineMutation, defineSubscription } from '../define-field';
import { zodSchema } from '../../../http/__test-utils__/zod-schema';

describe('defineQuery', () => {
  describe('basic field creation', () => {
    it('creates a query with no schemas', () => {
      const field = defineQuery();

      expect(field.operation).toBe('query');
      expect(field.input).toBeUndefined();
      expect(field.output).toBeUndefined();
      expect(field.context).toBeUndefined();
      expect(field._isGraphQLField).toBe(true);
    });

    it('creates a query with input schema', () => {
      const field = defineQuery({
        input: zodSchema(z.object({ userId: z.string() })),
      });

      expect(field.operation).toBe('query');
      expect(field.input).toBeDefined();
      expect(field.output).toBeUndefined();
    });

    it('creates a query with input and output schemas', () => {
      const field = defineQuery({
        input: zodSchema(z.object({ userId: z.string() })),
        output: zodSchema(z.object({ name: z.string(), email: z.string() })),
      });

      expect(field.input).toBeDefined();
      expect(field.output).toBeDefined();
    });

    it('creates a query with context schema', () => {
      const field = defineQuery({
        input: zodSchema(z.object({ userId: z.string() })),
        output: zodSchema(z.object({ name: z.string() })),
        context: zodSchema(z.object({ requesterId: z.string() })),
      });

      expect(field.context).toBeDefined();
    });
  });

  describe('documentation', () => {
    it('sets description and summary', () => {
      const field = defineQuery({
        docs: {
          summary: 'Get a user',
          description: 'Retrieves a user by their ID',
        },
      });

      expect(field.docs.summary).toBe('Get a user');
      expect(field.docs.description).toBe('Retrieves a user by their ID');
    });

    it('sets tags', () => {
      const field = defineQuery({
        docs: { tags: ['Users', 'Public'] },
      });

      expect(field.docs.tags).toEqual(['Users', 'Public']);
    });

    it('defaults deprecated to false', () => {
      const field = defineQuery();

      expect(field.docs.deprecated).toBe(false);
    });

    it('sets deprecated flag and reason', () => {
      const field = defineQuery({
        docs: { deprecated: true, deprecationReason: 'Use getUserV2 instead' },
      });

      expect(field.docs.deprecated).toBe(true);
      expect(field.docs.deprecationReason).toBe('Use getUserV2 instead');
    });
  });

  describe('immutability', () => {
    it('freezes the field definition', () => {
      const field = defineQuery();

      expect(Object.isFrozen(field)).toBe(true);
    });
  });

  describe('schema validation', () => {
    it('validates input with the provided schema', () => {
      const field = defineQuery({
        input: zodSchema(z.object({ userId: z.string() })),
      });

      const validResult = field.input!.validate({ userId: 'abc' });
      expect(validResult.success).toBe(true);

      const invalidResult = field.input!.validate({ userId: 123 });
      expect(invalidResult.success).toBe(false);
    });

    it('validates output with the provided schema', () => {
      const field = defineQuery({
        output: zodSchema(z.object({ name: z.string() })),
      });

      const validResult = field.output!.validate({ name: 'Alice' });
      expect(validResult.success).toBe(true);

      const invalidResult = field.output!.validate({ name: 123 });
      expect(invalidResult.success).toBe(false);
    });
  });
});

describe('defineMutation', () => {
  it('creates a mutation with operation type "mutation"', () => {
    const field = defineMutation({
      input: zodSchema(z.object({ name: z.string() })),
      output: zodSchema(z.object({ id: z.string() })),
    });

    expect(field.operation).toBe('mutation');
    expect(field._isGraphQLField).toBe(true);
    expect(field.input).toBeDefined();
    expect(field.output).toBeDefined();
  });

  it('freezes the mutation definition', () => {
    const field = defineMutation();

    expect(Object.isFrozen(field)).toBe(true);
  });
});

describe('defineSubscription', () => {
  it('creates a subscription with operation type "subscription"', () => {
    const field = defineSubscription({
      input: zodSchema(z.object({ projectId: z.string() })),
      output: zodSchema(z.object({ ticketId: z.string(), title: z.string() })),
    });

    expect(field.operation).toBe('subscription');
    expect(field._isGraphQLField).toBe(true);
    expect(field.input).toBeDefined();
    expect(field.output).toBeDefined();
  });

  it('creates a subscription with no schemas', () => {
    const field = defineSubscription();

    expect(field.operation).toBe('subscription');
    expect(field.input).toBeUndefined();
    expect(field.output).toBeUndefined();
  });

  it('freezes the subscription definition', () => {
    const field = defineSubscription();

    expect(Object.isFrozen(field)).toBe(true);
  });
});
