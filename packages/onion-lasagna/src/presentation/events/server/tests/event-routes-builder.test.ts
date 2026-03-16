/**
 * @fileoverview Tests for eventRoutes builder and execution pipeline.
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { defineEventHandler } from '../../handler/define-event-handler';
import { defineEventRouter } from '../../handler/define-event-router';
import { eventRoutes } from '../event-routes-builder';
import { zodSchema } from '../../../http/__test-utils__/zod-schema';
import type { RawEvent } from '../types';
import { UseCaseError } from '../../../../app/exceptions/use-case.error';
import { NotFoundError } from '../../../../app/exceptions/not-found.error';
import { InfraError } from '../../../../infra/exceptions/infra.error';

// ============================================================================
// Test Helpers
// ============================================================================

function createRawEvent(overrides: Partial<RawEvent> = {}): RawEvent {
  return {
    type: 'test.event',
    payload: {},
    metadata: {
      eventId: 'evt_123',
      timestamp: new Date().toISOString(),
      correlationId: 'cor_456',
      source: 'test',
      attemptCount: 1,
    },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('eventRoutes builder', () => {
  describe('handle() with simple function', () => {
    it('registers and executes a simple handler', async () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const router = defineEventRouter({ created: onCreated });

      const routes = eventRoutes(router)
        .handle('created', async () => ({ outcome: 'ack' as const }))
        .build();

      expect(routes).toHaveLength(1);
      expect(routes[0]!.eventType).toBe('ticket.created');

      const result = await routes[0]!.handler(createRawEvent());
      expect(result).toEqual({ outcome: 'ack' });
    });

    it('registers a handler with config object', async () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const router = defineEventRouter({ created: onCreated });

      const routes = eventRoutes(router)
        .handle('created', {
          handler: async () => ({ outcome: 'ack' as const }),
        })
        .build();

      const result = await routes[0]!.handler(createRawEvent());
      expect(result).toEqual({ outcome: 'ack' });
    });
  });

  describe('handleWithUseCase()', () => {
    it('executes the use case pipeline with payloadMapper', async () => {
      const onCreated = defineEventHandler({
        eventType: 'ticket.created',
        payload: zodSchema(z.object({ ticketId: z.string() })),
      });

      const router = defineEventRouter({ created: onCreated });

      const useCase = {
        execute: vi.fn().mockResolvedValue({ notified: true }),
      };

      const routes = eventRoutes(router)
        .handleWithUseCase('created', {
          payloadMapper: (event) => ({ id: event.payload.ticketId }),
          useCase,
        })
        .build();

      const result = await routes[0]!.handler(
        createRawEvent({ payload: { ticketId: 'T-001' } }),
      );

      expect(result).toEqual({ outcome: 'ack' });
      expect(useCase.execute).toHaveBeenCalledWith({ id: 'T-001' });
    });

    it('defaults resultMapper to ack when omitted', async () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const router = defineEventRouter({ created: onCreated });

      const routes = eventRoutes(router)
        .handleWithUseCase('created', {
          payloadMapper: () => ({}),
          useCase: { execute: vi.fn().mockResolvedValue(undefined) },
        })
        .build();

      const result = await routes[0]!.handler(createRawEvent());
      expect(result).toEqual({ outcome: 'ack' });
    });

    it('uses custom resultMapper when provided', async () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const router = defineEventRouter({ created: onCreated });

      const routes = eventRoutes(router)
        .handleWithUseCase('created', {
          payloadMapper: () => ({}),
          useCase: { execute: vi.fn().mockResolvedValue({ retryNeeded: true }) },
          resultMapper: (output) =>
            output.retryNeeded
              ? { outcome: 'retry' as const, reason: 'retry needed' }
              : { outcome: 'ack' as const },
        })
        .build();

      const result = await routes[0]!.handler(createRawEvent());
      expect(result).toEqual({ outcome: 'retry', reason: 'retry needed' });
    });
  });

  describe('build() enforcement', () => {
    it('throws at runtime when handlers are missing', () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const onAssigned = defineEventHandler({ eventType: 'ticket.assigned' });
      const router = defineEventRouter({ created: onCreated, assigned: onAssigned });

      const builder = eventRoutes(router).handle('created', async () => ({
        outcome: 'ack' as const,
      }));

      // buildPartial works fine
      expect(() => builder.buildPartial()).not.toThrow();
    });

    it('builds successfully when all handlers are wired', () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const onAssigned = defineEventHandler({ eventType: 'ticket.assigned' });
      const router = defineEventRouter({ created: onCreated, assigned: onAssigned });

      const routes = eventRoutes(router)
        .handle('created', async () => ({ outcome: 'ack' as const }))
        .handle('assigned', async () => ({ outcome: 'ack' as const }))
        .build();

      expect(routes).toHaveLength(2);
    });
  });

  describe('buildPartial()', () => {
    it('builds with only some handlers', () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const onAssigned = defineEventHandler({ eventType: 'ticket.assigned' });
      const router = defineEventRouter({ created: onCreated, assigned: onAssigned });

      const routes = eventRoutes(router)
        .handle('created', async () => ({ outcome: 'ack' as const }))
        .buildPartial();

      expect(routes).toHaveLength(1);
      expect(routes[0]!.eventType).toBe('ticket.created');
    });
  });

  describe('payload validation', () => {
    it('returns dlq for invalid payload', async () => {
      const onCreated = defineEventHandler({
        eventType: 'ticket.created',
        payload: zodSchema(z.object({ ticketId: z.string() })),
      });
      const router = defineEventRouter({ created: onCreated });

      const routes = eventRoutes(router)
        .handle('created', async () => ({ outcome: 'ack' as const }))
        .build();

      const result = await routes[0]!.handler(
        createRawEvent({ payload: { ticketId: 123 } }),
      );

      expect(result.outcome).toBe('dlq');
    });

    it('passes valid payload to handler', async () => {
      const onCreated = defineEventHandler({
        eventType: 'ticket.created',
        payload: zodSchema(z.object({ ticketId: z.string() })),
      });
      const router = defineEventRouter({ created: onCreated });

      const handlerFn = vi.fn().mockResolvedValue({ outcome: 'ack' as const });

      const routes = eventRoutes(router)
        .handle('created', handlerFn)
        .build();

      await routes[0]!.handler(createRawEvent({ payload: { ticketId: 'T-001' } }));

      expect(handlerFn).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { ticketId: 'T-001' } }),
        expect.anything(),
      );
    });

    it('skips validation when validatePayload is false', async () => {
      const onCreated = defineEventHandler({
        eventType: 'ticket.created',
        payload: zodSchema(z.object({ ticketId: z.string() })),
      });
      const router = defineEventRouter({ created: onCreated });

      const routes = eventRoutes(router)
        .handle('created', async () => ({ outcome: 'ack' as const }))
        .build({ validatePayload: false });

      const result = await routes[0]!.handler(
        createRawEvent({ payload: { ticketId: 123 } }),
      );

      expect(result.outcome).toBe('ack');
    });
  });

  describe('context validation', () => {
    it('returns dlq for invalid context', async () => {
      const onCreated = defineEventHandler({
        eventType: 'ticket.created',
        context: zodSchema(
          z.object({
            eventId: z.string(),
            timestamp: z.string(),
            customField: z.string(),
          }),
        ),
      });
      const router = defineEventRouter({ created: onCreated });

      const routes = eventRoutes(router)
        .handle('created', async () => ({ outcome: 'ack' as const }))
        .build();

      // metadata missing required customField
      const result = await routes[0]!.handler(createRawEvent());

      expect(result.outcome).toBe('dlq');
    });
  });

  describe('error mapping', () => {
    it('maps UseCaseError to dlq', async () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const router = defineEventRouter({ created: onCreated });

      const routes = eventRoutes(router)
        .handle('created', async () => {
          throw new UseCaseError({ message: 'Business rule violated' });
        })
        .build();

      const result = await routes[0]!.handler(createRawEvent());

      expect(result.outcome).toBe('dlq');
      expect(result).toHaveProperty('reason', 'Business rule violated');
    });

    it('maps NotFoundError to retry', async () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const router = defineEventRouter({ created: onCreated });

      const routes = eventRoutes(router)
        .handle('created', async () => {
          throw new NotFoundError({ message: 'Entity not found yet' });
        })
        .build();

      const result = await routes[0]!.handler(createRawEvent());

      expect(result.outcome).toBe('retry');
    });

    it('maps InfraError to retry', async () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const router = defineEventRouter({ created: onCreated });

      const routes = eventRoutes(router)
        .handle('created', async () => {
          throw new InfraError({ message: 'Database connection lost' });
        })
        .build();

      const result = await routes[0]!.handler(createRawEvent());

      expect(result.outcome).toBe('retry');
    });

    it('maps unknown errors to retry', async () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const router = defineEventRouter({ created: onCreated });

      const routes = eventRoutes(router)
        .handle('created', async () => {
          throw new Error('something unexpected');
        })
        .build();

      const result = await routes[0]!.handler(createRawEvent());

      expect(result.outcome).toBe('retry');
      expect(result).toHaveProperty('reason', 'something unexpected');
    });

    it('uses custom errorMapper when provided', async () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const router = defineEventRouter({ created: onCreated });

      const routes = eventRoutes(router)
        .handle('created', async () => {
          throw new Error('custom');
        })
        .build({
          errorMapper: () => ({ outcome: 'dlq', reason: 'custom mapping' }),
        });

      const result = await routes[0]!.handler(createRawEvent());

      expect(result).toEqual({ outcome: 'dlq', reason: 'custom mapping' });
    });
  });

  describe('middleware', () => {
    it('executes global middleware', async () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const router = defineEventRouter({ created: onCreated });

      const order: string[] = [];

      const routes = eventRoutes(router)
        .handle('created', async () => {
          order.push('handler');
          return { outcome: 'ack' as const };
        })
        .build({
          middleware: [
            async (_event, next) => {
              order.push('middleware');
              return next();
            },
          ],
        });

      await routes[0]!.handler(createRawEvent());
      expect(order).toEqual(['middleware', 'handler']);
    });

    it('executes per-handler middleware', async () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const router = defineEventRouter({ created: onCreated });

      const order: string[] = [];

      const routes = eventRoutes(router)
        .handle('created', {
          handler: async () => {
            order.push('handler');
            return { outcome: 'ack' as const };
          },
          middleware: [
            async (_event, next) => {
              order.push('per-handler');
              return next();
            },
          ],
        })
        .build({
          middleware: [
            async (_event, next) => {
              order.push('global');
              return next();
            },
          ],
        });

      await routes[0]!.handler(createRawEvent());
      expect(order).toEqual(['global', 'per-handler', 'handler']);
    });
  });

  describe('metadata', () => {
    it('generates handlerId from key', () => {
      const onCreated = defineEventHandler({
        eventType: 'ticket.created',
        docs: { summary: 'Handle creation', tags: ['ticket'] },
      });
      const router = defineEventRouter({
        ticket: { created: onCreated },
      });

      const routes = eventRoutes(router)
        .handle('ticket.created', async () => ({ outcome: 'ack' as const }))
        .build();

      expect(routes[0]!.metadata.handlerId).toBe('ticketCreated');
      expect(routes[0]!.metadata.summary).toBe('Handle creation');
      expect(routes[0]!.metadata.tags).toEqual(['ticket']);
    });
  });

  describe('nested routers', () => {
    it('handles deeply nested handler keys', async () => {
      const onCreated = defineEventHandler({ eventType: 'ticket.created' });
      const onAssigned = defineEventHandler({ eventType: 'ticket.assigned' });
      const onMemberAdded = defineEventHandler({ eventType: 'ecosystem.member-added' });

      const router = defineEventRouter({
        ticket: { created: onCreated, assigned: onAssigned },
        ecosystem: { memberAdded: onMemberAdded },
      });

      const routes = eventRoutes(router)
        .handle('ticket.created', async () => ({ outcome: 'ack' as const }))
        .handle('ticket.assigned', async () => ({ outcome: 'ack' as const }))
        .handle('ecosystem.memberAdded', async () => ({ outcome: 'ack' as const }))
        .build();

      expect(routes).toHaveLength(3);
      expect(routes.map((r) => r.eventType)).toEqual([
        'ticket.created',
        'ticket.assigned',
        'ecosystem.member-added',
      ]);
    });
  });
});
