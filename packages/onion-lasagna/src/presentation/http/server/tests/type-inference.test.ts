/**
 * @fileoverview Type inference tests for serverRoutes() builder.
 *
 * These tests verify that the builder provides 100% type inference
 * for all handler parameters without manual annotations.
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { serverRoutes } from '../server-routes-builder';
import { defineRoute, defineRouter } from '../../route';
import { zodSchema } from '../../__test-utils__/zod-schema';
import type { UseCasePort } from '../types';

// ============================================================================
// Test Fixtures
// ============================================================================

// Define test routes with schemas
const createItemRoute = defineRoute({
  method: 'POST',
  path: '/items',
  request: {
    body: {
      schema: zodSchema(z.object({ name: z.string(), quantity: z.number() })),
    },
    context: {
      schema: zodSchema(z.object({ userId: z.string(), role: z.enum(['admin', 'user']) })),
    },
  },
  responses: {
    201: {
      description: 'Created',
      schema: zodSchema(z.object({ itemId: z.string() })),
    },
  },
});

const listItemsRoute = defineRoute({
  method: 'GET',
  path: '/items',
  request: {
    query: {
      schema: zodSchema(z.object({ page: z.number(), limit: z.number() })),
    },
  },
  responses: {
    200: {
      description: 'List of items',
      schema: zodSchema(
        z.object({ items: z.array(z.object({ id: z.string(), name: z.string() })), total: z.number() }),
      ),
    },
  },
});

const getItemRoute = defineRoute({
  method: 'GET',
  path: '/items/:itemId',
  request: {
    params: {
      schema: zodSchema(z.object({ itemId: z.string() })),
    },
  },
  responses: {
    200: {
      description: 'Item details',
      schema: zodSchema(z.object({ id: z.string(), name: z.string(), quantity: z.number() })),
    },
  },
});

const testRouter = defineRouter({
  items: {
    create: createItemRoute,
    list: listItemsRoute,
    get: getItemRoute,
  },
});

// Mock use cases with specific input/output types
interface CreateItemInput {
  name: string;
  quantity: number;
  createdBy: string;
}

interface CreateItemOutput {
  itemId: string;
  createdAt: Date;
}

interface ListItemsInput {
  page: number;
  limit: number;
}

interface ListItemsOutput {
  items: { id: string; name: string }[];
  total: number;
}

interface GetItemInput {
  itemId: string;
}

interface GetItemOutput {
  id: string;
  name: string;
  quantity: number;
}

// Create mock use cases
const createItemUseCase: UseCasePort<CreateItemInput, CreateItemOutput> = {
  execute: async (_input) => ({
    itemId: 'test-id',
    createdAt: new Date(),
  }),
};

const listItemsUseCase: UseCasePort<ListItemsInput, ListItemsOutput> = {
  execute: async (_input) => ({
    items: [],
    total: 0,
  }),
};

const getItemUseCase: UseCasePort<GetItemInput, GetItemOutput> = {
  execute: async (input) => ({
    id: input?.itemId ?? '',
    name: 'Test Item',
    quantity: 10,
  }),
};

// ============================================================================
// Type Inference Tests
// ============================================================================

describe('serverRoutes() type inference', () => {
  describe('requestMapper parameter inference', () => {
    it('should infer body type from route schema', () => {
      serverRoutes(testRouter).handle('items.create', {
        requestMapper: (req) => {
          // These should be typed correctly
          expectTypeOf(req.body.name).toEqualTypeOf<string>();
          expectTypeOf(req.body.quantity).toEqualTypeOf<number>();

          return {
            name: req.body.name,
            quantity: req.body.quantity,
            createdBy: 'test',
          };
        },
        useCase: createItemUseCase,
        responseMapper: (output) => ({
          status: 201 as const,
          body: { itemId: output.itemId },
        }),
      });
    });

    it('should infer query type from route schema', () => {
      serverRoutes(testRouter).handle('items.list', {
        requestMapper: (req) => {
          // Query params should be typed
          expectTypeOf(req.query.page).toEqualTypeOf<number>();
          expectTypeOf(req.query.limit).toEqualTypeOf<number>();

          return {
            page: req.query.page,
            limit: req.query.limit,
          };
        },
        useCase: listItemsUseCase,
        responseMapper: (output) => ({
          status: 200 as const,
          body: output,
        }),
      });
    });

    it('should infer pathParams type from route schema', () => {
      serverRoutes(testRouter).handle('items.get', {
        requestMapper: (req) => {
          // Path params should be typed
          expectTypeOf(req.pathParams.itemId).toEqualTypeOf<string>();

          return {
            itemId: req.pathParams.itemId,
          };
        },
        useCase: getItemUseCase,
        responseMapper: (output) => ({
          status: 200 as const,
          body: output,
        }),
      });
    });
  });

  describe('context parameter inference', () => {
    it('should infer context type from route schema', () => {
      serverRoutes(testRouter).handle('items.create', {
        requestMapper: (req, ctx) => {
          // Context should be typed from route's context schema
          expectTypeOf(ctx.userId).toEqualTypeOf<string>();
          expectTypeOf(ctx.role).toEqualTypeOf<'admin' | 'user'>();

          return {
            name: req.body.name,
            quantity: req.body.quantity,
            createdBy: ctx.userId,
          };
        },
        useCase: createItemUseCase,
        responseMapper: (output) => ({
          status: 201 as const,
          body: { itemId: output.itemId },
        }),
      });
    });
  });

  describe('responseMapper output inference', () => {
    it('should infer output type from useCase', () => {
      serverRoutes(testRouter).handle('items.create', {
        requestMapper: (req, ctx) => ({
          name: req.body.name,
          quantity: req.body.quantity,
          createdBy: ctx.userId,
        }),
        useCase: createItemUseCase,
        responseMapper: (output) => {
          // Output should be typed from useCase's return type
          expectTypeOf(output.itemId).toEqualTypeOf<string>();
          expectTypeOf(output.createdAt).toEqualTypeOf<Date>();

          return {
            status: 201 as const,
            body: { itemId: output.itemId },
          };
        },
      });
    });

    it('should work with different output types per route', () => {
      serverRoutes(testRouter).handle('items.list', {
        requestMapper: (req) => ({
          page: req.query.page,
          limit: req.query.limit,
        }),
        useCase: listItemsUseCase,
        responseMapper: (output) => {
          // This output should be ListItemsOutput
          expectTypeOf(output.items).toEqualTypeOf<{ id: string; name: string }[]>();
          expectTypeOf(output.total).toEqualTypeOf<number>();

          return {
            status: 200 as const,
            body: output,
          };
        },
      });
    });
  });

  describe('build() method', () => {
    it('should return routes array when all handlers are registered', () => {
      const routes = serverRoutes(testRouter)
        .handle('items.create', {
          requestMapper: (req, ctx) => ({
            name: req.body.name,
            quantity: req.body.quantity,
            createdBy: ctx.userId,
          }),
          useCase: createItemUseCase,
          responseMapper: (output) => ({
            status: 201 as const,
            body: { itemId: output.itemId },
          }),
        })
        .handle('items.list', {
          requestMapper: (req) => ({
            page: req.query.page,
            limit: req.query.limit,
          }),
          useCase: listItemsUseCase,
          responseMapper: (output) => ({
            status: 200 as const,
            body: output,
          }),
        })
        .handle('items.get', {
          requestMapper: (req) => ({
            itemId: req.pathParams.itemId,
          }),
          useCase: getItemUseCase,
          responseMapper: (output) => ({
            status: 200 as const,
            body: output,
          }),
        })
        .build();

      expect(routes).toHaveLength(3);
    });

    it('should allow buildPartial() with incomplete handlers', () => {
      const routes = serverRoutes(testRouter)
        .handle('items.create', {
          requestMapper: (req, ctx) => ({
            name: req.body.name,
            quantity: req.body.quantity,
            createdBy: ctx.userId,
          }),
          useCase: createItemUseCase,
          responseMapper: (output) => ({
            status: 201 as const,
            body: { itemId: output.itemId },
          }),
        })
        .buildPartial();

      expect(routes).toHaveLength(1);
    });
  });
});
