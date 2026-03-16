/**
 * @fileoverview Tests for defineEventRouter and mergeEventRouters.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineEventHandler } from '../define-event-handler';
import { defineEventRouter, mergeEventRouters } from '../define-event-router';
import { collectEventHandlers, isEventRouterDefinition } from '../types';
import { zodSchema } from '../../../http/__test-utils__/zod-schema';

const onCreated = defineEventHandler({ eventType: 'ticket.created' });
const onAssigned = defineEventHandler({ eventType: 'ticket.assigned' });
const onTransferred = defineEventHandler({ eventType: 'ticket.transferred' });
const onMemberAdded = defineEventHandler({ eventType: 'ecosystem.member-added' });

describe('defineEventRouter', () => {
  describe('basic router creation', () => {
    it('creates a flat router', () => {
      const router = defineEventRouter({
        created: onCreated,
        assigned: onAssigned,
      });

      expect(isEventRouterDefinition(router)).toBe(true);
      expect(router._isEventRouter).toBe(true);
      expect(router.handlers.created).toBe(onCreated);
      expect(router.handlers.assigned).toBe(onAssigned);
    });

    it('creates a nested router', () => {
      const router = defineEventRouter({
        ticket: {
          created: onCreated,
          assigned: onAssigned,
        },
        ecosystem: {
          memberAdded: onMemberAdded,
        },
      });

      const collected = collectEventHandlers(router.handlers);
      expect(collected).toHaveLength(3);
      expect(collected.map((c) => c.key)).toEqual([
        'ticket.created',
        'ticket.assigned',
        'ecosystem.memberAdded',
      ]);
    });

    it('creates a deeply nested router', () => {
      const router = defineEventRouter({
        domain: {
          ticket: {
            created: onCreated,
          },
        },
      });

      const collected = collectEventHandlers(router.handlers);
      expect(collected).toHaveLength(1);
      expect(collected[0]!.key).toBe('domain.ticket.created');
    });
  });

  describe('defaults', () => {
    it('applies default context to handlers without context', () => {
      const contextSchema = zodSchema(z.object({ eventId: z.string() }));

      const router = defineEventRouter(
        { created: onCreated },
        { defaults: { context: contextSchema } },
      );

      const collected = collectEventHandlers(router.handlers);
      expect(collected[0]!.handler.context).toBe(contextSchema);
    });

    it('does not override handler-specific context', () => {
      const routerContext = zodSchema(z.object({ eventId: z.string() }));
      const handlerContext = zodSchema(z.object({ custom: z.string() }));

      const handlerWithContext = defineEventHandler({
        eventType: 'ticket.created',
        context: handlerContext,
      });

      const router = defineEventRouter(
        { created: handlerWithContext },
        { defaults: { context: routerContext } },
      );

      const collected = collectEventHandlers(router.handlers);
      expect(collected[0]!.handler.context).toBe(handlerContext);
    });

    it('merges default tags with handler tags', () => {
      const handlerWithTags = defineEventHandler({
        eventType: 'ticket.created',
        docs: { tags: ['notifications'] },
      });

      const router = defineEventRouter(
        { created: handlerWithTags },
        { defaults: { tags: ['ticket'] } },
      );

      const collected = collectEventHandlers(router.handlers);
      expect(collected[0]!.handler.docs.tags).toEqual(['ticket', 'notifications']);
    });
  });

  describe('immutability', () => {
    it('deep-freezes the router definition', () => {
      const router = defineEventRouter({
        created: onCreated,
        nested: { assigned: onAssigned },
      });

      expect(Object.isFrozen(router)).toBe(true);
      expect(Object.isFrozen(router.handlers)).toBe(true);
    });
  });
});

describe('mergeEventRouters', () => {
  it('merges two routers', () => {
    const r1 = defineEventRouter({ created: onCreated });
    const r2 = defineEventRouter({ assigned: onAssigned });

    const merged = mergeEventRouters(r1, r2);
    const collected = collectEventHandlers(merged.handlers);

    expect(collected).toHaveLength(2);
    expect(collected.map((c) => c.key)).toEqual(['created', 'assigned']);
  });

  it('merges three routers', () => {
    const r1 = defineEventRouter({ created: onCreated });
    const r2 = defineEventRouter({ assigned: onAssigned });
    const r3 = defineEventRouter({ transferred: onTransferred });

    const merged = mergeEventRouters(r1, r2, r3);
    const collected = collectEventHandlers(merged.handlers);

    expect(collected).toHaveLength(3);
  });

  it('deep-merges nested sub-routers', () => {
    const r1 = defineEventRouter({
      ticket: { created: onCreated },
    });
    const r2 = defineEventRouter({
      ticket: { assigned: onAssigned },
    });

    const merged = mergeEventRouters(r1, r2);
    const collected = collectEventHandlers(merged.handlers);

    expect(collected).toHaveLength(2);
    expect(collected.map((c) => c.key)).toEqual(['ticket.created', 'ticket.assigned']);
  });

  it('overwrites leaf handlers on conflict', () => {
    const replacement = defineEventHandler({ eventType: 'ticket.replaced' });
    const r1 = defineEventRouter({ created: onCreated });
    const r2 = defineEventRouter({ created: replacement });

    const merged = mergeEventRouters(r1, r2);
    const collected = collectEventHandlers(merged.handlers);

    expect(collected[0]!.handler.eventType).toBe('ticket.replaced');
  });

  it('accepts plain configs alongside router definitions', () => {
    const r1 = { created: onCreated };
    const r2 = defineEventRouter({ assigned: onAssigned });

    const merged = mergeEventRouters(r1, r2);
    const collected = collectEventHandlers(merged.handlers);

    expect(collected).toHaveLength(2);
  });
});
