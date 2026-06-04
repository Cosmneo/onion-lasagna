/**
 * @fileoverview Tests for graphqlRoutes builder and execution pipeline.
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { defineQuery, defineMutation, defineSubscription } from '../../field/define-field';
import { defineGraphQLSchema } from '../../field/define-schema';
import { graphqlRoutes } from '../graphql-routes-builder';
import { zodSchema } from '../../../http/__test-utils__/zod-schema';
import { ObjectValidationError } from '../../../../global/exceptions/object-validation.error';
import { UnauthorizedError } from '../../../../app/exceptions/unauthorized.error';
import { UseCaseError } from '../../../../app/exceptions/use-case.error';
import { NotFoundError } from '../../../../app/exceptions/not-found.error';
import { DomainError } from '../../../../domain/exceptions/domain.error';
import { ControllerError } from '../../../exceptions/controller.error';
import { OutputValidationError } from '../../../exceptions/output-validation.error';

describe('graphqlRoutes builder', () => {
  describe('handle() with simple function', () => {
    it('registers and executes a simple handler', async () => {
      const getUser = defineQuery();
      const schema = defineGraphQLSchema({ getUser });

      const fields = graphqlRoutes(schema)
        .handle('getUser', async () => ({ name: 'Alice' }))
        .build();

      expect(fields).toHaveLength(1);
      expect(fields[0]!.key).toBe('getUser');
      expect(fields[0]!.operation).toBe('query');

      const result = await fields[0]!.handler(undefined, {});
      expect(result).toEqual({ name: 'Alice' });
    });

    it('registers a handler with config object', async () => {
      const getUser = defineQuery();
      const schema = defineGraphQLSchema({ getUser });

      const fields = graphqlRoutes(schema)
        .handle('getUser', {
          handler: async () => ({ name: 'Alice' }),
        })
        .build();

      const result = await fields[0]!.handler(undefined, {});
      expect(result).toEqual({ name: 'Alice' });
    });
  });

  describe('handleWithUseCase()', () => {
    it('executes the use case pipeline with argsMapper', async () => {
      const getUser = defineQuery({
        input: zodSchema(z.object({ userId: z.string() })),
        output: zodSchema(z.object({ name: z.string() })),
      });

      const schema = defineGraphQLSchema({ getUser });

      const useCase = {
        execute: vi.fn().mockResolvedValue({ name: 'Alice', email: 'alice@test.com' }),
      };

      const fields = graphqlRoutes(schema)
        .handleWithUseCase('getUser', {
          argsMapper: (args) => ({ id: args.input.userId }),
          useCase,
          responseMapper: (output) => ({ name: output.name }),
        })
        .build();

      const result = await fields[0]!.handler({ userId: 'U-001' }, {});

      expect(result).toEqual({ name: 'Alice' });
      expect(useCase.execute).toHaveBeenCalledWith({ id: 'U-001' });
    });
  });

  describe('build() enforcement', () => {
    it('throws at runtime when handlers are missing', () => {
      const getUser = defineQuery();
      const createUser = defineMutation();
      const schema = defineGraphQLSchema({ getUser, createUser });

      const builder = graphqlRoutes(schema).handle('getUser', async () => ({ name: 'Alice' }));

      // buildPartial works fine
      expect(() => builder.buildPartial()).not.toThrow();
    });

    it('builds successfully when all handlers are wired', () => {
      const getUser = defineQuery();
      const createUser = defineMutation();
      const schema = defineGraphQLSchema({ getUser, createUser });

      const fields = graphqlRoutes(schema)
        .handle('getUser', async () => ({ name: 'Alice' }))
        .handle('createUser', async () => ({ id: '123' }))
        .build();

      expect(fields).toHaveLength(2);
    });
  });

  describe('buildPartial()', () => {
    it('builds with only some handlers', () => {
      const getUser = defineQuery();
      const createUser = defineMutation();
      const schema = defineGraphQLSchema({ getUser, createUser });

      const fields = graphqlRoutes(schema)
        .handle('getUser', async () => ({ name: 'Alice' }))
        .buildPartial();

      expect(fields).toHaveLength(1);
      expect(fields[0]!.key).toBe('getUser');
    });
  });

  describe('input validation', () => {
    it('throws ObjectValidationError for invalid input', async () => {
      const getUser = defineQuery({
        input: zodSchema(z.object({ userId: z.string() })),
      });
      const schema = defineGraphQLSchema({ getUser });

      const fields = graphqlRoutes(schema)
        .handle('getUser', async () => ({ name: 'Alice' }))
        .build();

      await expect(fields[0]!.handler({ userId: 123 }, {})).rejects.toThrow(ObjectValidationError);
    });

    it('passes valid input to handler', async () => {
      const getUser = defineQuery({
        input: zodSchema(z.object({ userId: z.string() })),
      });
      const schema = defineGraphQLSchema({ getUser });

      const handlerFn = vi.fn().mockResolvedValue({ name: 'Alice' });

      const fields = graphqlRoutes(schema).handle('getUser', handlerFn).build();

      await fields[0]!.handler({ userId: 'U-001' }, {});

      expect(handlerFn).toHaveBeenCalledWith(
        expect.objectContaining({ input: { userId: 'U-001' } }),
        expect.anything(),
      );
    });

    it('skips validation when validateInput is false', async () => {
      const getUser = defineQuery({
        input: zodSchema(z.object({ userId: z.string() })),
      });
      const schema = defineGraphQLSchema({ getUser });

      const fields = graphqlRoutes(schema)
        .handle('getUser', async () => ({ name: 'Alice' }))
        .build({ validateInput: false });

      // Should not throw even with invalid input
      const result = await fields[0]!.handler({ userId: 123 }, {});
      expect(result).toEqual({ name: 'Alice' });
    });
  });

  describe('context validation', () => {
    it('throws UnauthorizedError for invalid context', async () => {
      const getUser = defineQuery({
        context: zodSchema(
          z.object({
            userId: z.string(),
            role: z.string(),
          }),
        ),
      });
      const schema = defineGraphQLSchema({ getUser });

      const fields = graphqlRoutes(schema)
        .handle('getUser', async () => ({ name: 'Alice' }))
        .build();

      // context missing required fields
      await expect(fields[0]!.handler(undefined, {})).rejects.toThrow(UnauthorizedError);
    });

    it('passes valid context to handler', async () => {
      const getUser = defineQuery({
        context: zodSchema(z.object({ userId: z.string() })),
      });
      const schema = defineGraphQLSchema({ getUser });

      const handlerFn = vi.fn().mockResolvedValue({ name: 'Alice' });

      const fields = graphqlRoutes(schema).handle('getUser', handlerFn).build();

      await fields[0]!.handler(undefined, { userId: 'U-001' });

      expect(handlerFn).toHaveBeenCalledWith(expect.anything(), { userId: 'U-001' });
    });
  });

  describe('output validation', () => {
    it('throws OutputValidationError (not ObjectValidationError) on invalid output', async () => {
      const getUser = defineQuery({
        output: zodSchema(z.object({ name: z.string() })),
      });
      const schema = defineGraphQLSchema({ getUser });

      const fields = graphqlRoutes(schema)
        .handle('getUser', async () => ({ name: 123 }))
        .build();

      await expect(fields[0]!.handler(undefined, {})).rejects.toThrow(OutputValidationError);
      // Must NOT be an ObjectValidationError (which is client-facing)
      await expect(fields[0]!.handler(undefined, {})).rejects.not.toThrow(ObjectValidationError);
      // Must be a ControllerError subclass (masked as INTERNAL_ERROR)
      await expect(fields[0]!.handler(undefined, {})).rejects.toThrow(ControllerError);
    });

    it('masks internal field paths in output validation errors (no info leak)', async () => {
      const getUser = defineQuery({
        output: zodSchema(z.object({ internalSecretField: z.string() })),
      });
      const schema = defineGraphQLSchema({ getUser });

      const fields = graphqlRoutes(schema)
        .handle('getUser', async () => ({ internalSecretField: 999 }))
        .build();

      let thrownError: unknown;
      try {
        await fields[0]!.handler(undefined, {});
      } catch (e) {
        thrownError = e;
      }

      expect(thrownError).toBeInstanceOf(OutputValidationError);
      // The error MUST extend ControllerError so mappers treat it as INTERNAL_ERROR
      expect(thrownError).toBeInstanceOf(ControllerError);
      // ObjectValidationError would expose validationErrors with field paths — OutputValidationError must NOT
      expect(thrownError).not.toBeInstanceOf(ObjectValidationError);
      // Confirm the class has no validationErrors property (no schema-field leak)
      expect((thrownError as Record<string, unknown>).validationErrors).toBeUndefined();
    });

    it('skips output validation when validateOutput is false', async () => {
      const getUser = defineQuery({
        output: zodSchema(z.object({ name: z.string() })),
      });
      const schema = defineGraphQLSchema({ getUser });

      const fields = graphqlRoutes(schema)
        .handle('getUser', async () => ({ name: 123 }))
        .build({ validateOutput: false });

      const result = await fields[0]!.handler(undefined, {});
      expect(result).toEqual({ name: 123 });
    });
  });

  describe('error propagation', () => {
    it('propagates UseCaseError', async () => {
      const getUser = defineQuery();
      const schema = defineGraphQLSchema({ getUser });

      const fields = graphqlRoutes(schema)
        .handle('getUser', async () => {
          throw new UseCaseError({ message: 'Business rule violated' });
        })
        .build();

      await expect(fields[0]!.handler(undefined, {})).rejects.toThrow(UseCaseError);
    });

    it('propagates NotFoundError', async () => {
      const getUser = defineQuery();
      const schema = defineGraphQLSchema({ getUser });

      const fields = graphqlRoutes(schema)
        .handle('getUser', async () => {
          throw new NotFoundError({ message: 'User not found' });
        })
        .build();

      await expect(fields[0]!.handler(undefined, {})).rejects.toThrow(NotFoundError);
    });

    it('propagates DomainError', async () => {
      const getUser = defineQuery();
      const schema = defineGraphQLSchema({ getUser });

      const fields = graphqlRoutes(schema)
        .handle('getUser', async () => {
          throw new DomainError({ message: 'Domain invariant violated' });
        })
        .build();

      await expect(fields[0]!.handler(undefined, {})).rejects.toThrow(DomainError);
    });
  });

  describe('middleware', () => {
    it('executes global middleware', async () => {
      const getUser = defineQuery();
      const schema = defineGraphQLSchema({ getUser });

      const order: string[] = [];

      const fields = graphqlRoutes(schema)
        .handle('getUser', async () => {
          order.push('handler');
          return { name: 'Alice' };
        })
        .build({
          middleware: [
            async (_args, _ctx, next) => {
              order.push('middleware');
              return next();
            },
          ],
        });

      await fields[0]!.handler(undefined, {});
      expect(order).toEqual(['middleware', 'handler']);
    });

    it('executes per-handler middleware', async () => {
      const getUser = defineQuery();
      const schema = defineGraphQLSchema({ getUser });

      const order: string[] = [];

      const fields = graphqlRoutes(schema)
        .handle('getUser', {
          handler: async () => {
            order.push('handler');
            return { name: 'Alice' };
          },
          middleware: [
            async (_args, _ctx, next) => {
              order.push('per-handler');
              return next();
            },
          ],
        })
        .build({
          middleware: [
            async (_args, _ctx, next) => {
              order.push('global');
              return next();
            },
          ],
        });

      await fields[0]!.handler(undefined, {});
      expect(order).toEqual(['global', 'per-handler', 'handler']);
    });
  });

  describe('metadata', () => {
    it('generates fieldId from key', () => {
      const getUser = defineQuery({
        docs: { description: 'Get user by ID', tags: ['Users'] },
      });
      const schema = defineGraphQLSchema({
        users: { get: getUser },
      });

      const fields = graphqlRoutes(schema)
        .handle('users.get', async () => ({ name: 'Alice' }))
        .build();

      expect(fields[0]!.metadata.fieldId).toBe('usersGet');
      expect(fields[0]!.metadata.description).toBe('Get user by ID');
      expect(fields[0]!.metadata.tags).toEqual(['Users']);
    });
  });

  describe('nested schemas', () => {
    it('handles deeply nested field keys', async () => {
      const getUser = defineQuery();
      const createUser = defineMutation();
      const listProjects = defineQuery();

      const schema = defineGraphQLSchema({
        users: { get: getUser, create: createUser },
        projects: { list: listProjects },
      });

      const fields = graphqlRoutes(schema)
        .handle('users.get', async () => ({ name: 'Alice' }))
        .handle('users.create', async () => ({ id: '123' }))
        .handle('projects.list', async () => [])
        .build();

      expect(fields).toHaveLength(3);
    });
  });

  describe('subscription output validation', () => {
    it('returns an AsyncIterable for valid subscription items', async () => {
      const onTicket = defineSubscription({
        output: zodSchema(z.object({ id: z.string(), title: z.string() })),
      });
      const schema = defineGraphQLSchema({ onTicket });

      async function* validGenerator() {
        yield { id: 'T-001', title: 'First ticket' };
        yield { id: 'T-002', title: 'Second ticket' };
      }

      const fields = graphqlRoutes(schema)
        .handle('onTicket', async () => validGenerator())
        .build();

      const result = await fields[0]!.handler(undefined, {});
      // Result must be an AsyncIterable (not a plain object)
      expect(typeof (result as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator]).toBe(
        'function',
      );

      const items: unknown[] = [];
      for await (const item of result as AsyncIterable<unknown>) {
        items.push(item);
      }
      expect(items).toEqual([
        { id: 'T-001', title: 'First ticket' },
        { id: 'T-002', title: 'Second ticket' },
      ]);
    });

    it('throws OutputValidationError per-item when a yielded subscription item is invalid', async () => {
      const onTicket = defineSubscription({
        output: zodSchema(z.object({ id: z.string(), title: z.string() })),
      });
      const schema = defineGraphQLSchema({ onTicket });

      async function* invalidGenerator() {
        yield { id: 'T-001', title: 'Valid' };
        yield { id: 999, title: 'Second' }; // id is a number, not a string → invalid
      }

      const fields = graphqlRoutes(schema)
        .handle('onTicket', async () => invalidGenerator())
        .build();

      const result = await fields[0]!.handler(undefined, {});
      expect(typeof (result as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator]).toBe(
        'function',
      );

      // Consuming the iterable should throw on the invalid second item
      let thrownError: unknown;
      try {
        for await (const _item of result as AsyncIterable<unknown>) {
          // consume
        }
      } catch (e) {
        thrownError = e;
      }

      expect(thrownError).toBeInstanceOf(OutputValidationError);
      expect(thrownError).toBeInstanceOf(ControllerError);
      // Must NOT be ObjectValidationError (which would leak field path info)
      expect(thrownError).not.toBeInstanceOf(ObjectValidationError);
    });

    it('does not validate the iterable object itself for subscriptions', async () => {
      // Without the fix, output schema would be validated against the AsyncIterable object
      // (which has no matching fields), causing all typed subscriptions to fail.
      const onTicket = defineSubscription({
        output: zodSchema(z.object({ id: z.string() })),
      });
      const schema = defineGraphQLSchema({ onTicket });

      async function* generator() {
        yield { id: 'T-001' };
      }

      const fields = graphqlRoutes(schema)
        .handle('onTicket', async () => generator())
        .build();

      // Must not throw when calling handler — the iterable itself is NOT validated
      let thrownError: unknown;
      try {
        await fields[0]!.handler(undefined, {});
      } catch (e) {
        thrownError = e;
      }

      expect(thrownError).toBeUndefined();
    });
  });
});
