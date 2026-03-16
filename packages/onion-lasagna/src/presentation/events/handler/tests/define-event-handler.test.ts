/**
 * @fileoverview Tests for defineEventHandler factory function.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineEventHandler } from '../define-event-handler';
import { zodSchema } from '../../../http/__test-utils__/zod-schema';

describe('defineEventHandler', () => {
  describe('basic handler creation', () => {
    it('creates a handler with only eventType', () => {
      const handler = defineEventHandler({
        eventType: 'ticket.created',
      });

      expect(handler.eventType).toBe('ticket.created');
      expect(handler.payload).toBeUndefined();
      expect(handler.context).toBeUndefined();
    });

    it('creates a handler with payload schema', () => {
      const handler = defineEventHandler({
        eventType: 'ticket.created',
        payload: zodSchema(z.object({ ticketId: z.string() })),
      });

      expect(handler.eventType).toBe('ticket.created');
      expect(handler.payload).toBeDefined();
      expect(handler.context).toBeUndefined();
    });

    it('creates a handler with context schema', () => {
      const handler = defineEventHandler({
        eventType: 'ticket.created',
        payload: zodSchema(z.object({ ticketId: z.string() })),
        context: zodSchema(
          z.object({
            eventId: z.string(),
            correlationId: z.string(),
          }),
        ),
      });

      expect(handler.payload).toBeDefined();
      expect(handler.context).toBeDefined();
    });
  });

  describe('documentation', () => {
    it('sets summary and description', () => {
      const handler = defineEventHandler({
        eventType: 'ticket.created',
        docs: {
          summary: 'Handle ticket creation',
          description: 'Sends notifications when a ticket is created',
        },
      });

      expect(handler.docs.summary).toBe('Handle ticket creation');
      expect(handler.docs.description).toBe('Sends notifications when a ticket is created');
    });

    it('sets tags', () => {
      const handler = defineEventHandler({
        eventType: 'ticket.created',
        docs: { tags: ['ticket', 'notifications'] },
      });

      expect(handler.docs.tags).toEqual(['ticket', 'notifications']);
    });

    it('defaults deprecated to false', () => {
      const handler = defineEventHandler({
        eventType: 'ticket.created',
      });

      expect(handler.docs.deprecated).toBe(false);
    });

    it('sets deprecated flag', () => {
      const handler = defineEventHandler({
        eventType: 'ticket.created',
        docs: { deprecated: true },
      });

      expect(handler.docs.deprecated).toBe(true);
    });
  });

  describe('immutability', () => {
    it('freezes the handler definition', () => {
      const handler = defineEventHandler({
        eventType: 'ticket.created',
      });

      expect(Object.isFrozen(handler)).toBe(true);
    });
  });

  describe('schema validation', () => {
    it('validates payload with the provided schema', () => {
      const handler = defineEventHandler({
        eventType: 'ticket.created',
        payload: zodSchema(z.object({ ticketId: z.string() })),
      });

      const validResult = handler.payload!.validate({ ticketId: 'abc' });
      expect(validResult.success).toBe(true);

      const invalidResult = handler.payload!.validate({ ticketId: 123 });
      expect(invalidResult.success).toBe(false);
    });
  });
});
