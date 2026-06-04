/**
 * @fileoverview Tests for AsyncAPI specification generation.
 *
 * Covers:
 * - C07-5: Duplicate handlerId collision detection (operation key)
 * - MISSED AsyncAPI context: context/metadata schema included in message
 * - C07-8: RFC6901 escaping of channel keys used in $ref pointers
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { generateAsyncAPI } from '../generate';
import { defineEventHandler } from '../../handler/define-event-handler';
import { zodSchema } from '../../../http/__test-utils__/zod-schema';

// ============================================================================
// Helpers
// ============================================================================

const ticketPayloadSchema = zodSchema(z.object({ ticketId: z.string() }));
const contextSchema = zodSchema(z.object({ correlationId: z.string(), eventId: z.string() }));

// ============================================================================
// Basic generation
// ============================================================================

describe('generateAsyncAPI', () => {
  describe('specification structure', () => {
    it('generates a valid AsyncAPI 3.0.0 spec', () => {
      const handler = defineEventHandler({
        eventType: 'ticket.created',
        payload: ticketPayloadSchema,
        docs: { summary: 'Ticket created' },
      });

      const spec = generateAsyncAPI(
        { ticketCreated: handler },
        { info: { title: 'Events', version: '1.0.0' } },
      );

      expect(spec.asyncapi).toBe('3.0.0');
      expect(spec.info.title).toBe('Events');
      expect(spec.channels).toBeDefined();
      expect(spec.operations).toBeDefined();
    });

    it('populates channel with eventType as address', () => {
      const handler = defineEventHandler({ eventType: 'ticket.created' });
      const spec = generateAsyncAPI(
        { ticketCreated: handler },
        { info: { title: 'Events', version: '1.0.0' } },
      );

      expect(spec.channels?.['ticket.created']?.address).toBe('ticket.created');
    });

    it('populates operation with handlerId as key', () => {
      const handler = defineEventHandler({ eventType: 'ticket.created' });
      const spec = generateAsyncAPI(
        { ticketCreated: handler },
        { info: { title: 'Events', version: '1.0.0' } },
      );

      expect(spec.operations?.['ticketCreated']).toBeDefined();
    });
  });

  // ==========================================================================
  // C07-5: Duplicate handlerId collision detection
  // ==========================================================================

  describe('C07-5: duplicate handlerId collision detection', () => {
    it('throws when two router keys produce the same handlerId', () => {
      // Both "ticket.created" and "ticket.Created" collapse to "ticketCreated"
      // via generateHandlerId (dot-collapsed camelCase)
      // Use a nested router structure that maps to same camelCase
      const handlerA = defineEventHandler({
        eventType: 'order.placed',
        docs: { summary: 'Handler A' },
      });
      const handlerB = defineEventHandler({
        eventType: 'order.shipped',
        docs: { summary: 'Handler B' },
      });

      // Both keys "order.placed" and "order.placed" would collide — but realistic
      // collision: same dotted key in different router groups that flatten to same ID
      // Simulate by wrapping in a router where collectEventHandlers gives same key:
      // The real collision scenario is two nested routes that produce the same handlerId.
      // We can trigger it by having both "a.b" and "a.b" — but JS objects dedupe keys.
      // The actual collision happens when two different paths produce the same camelCase.
      // e.g., key "ticketCreated" (no dots) vs key "ticket.created" -> both -> "ticketCreated"
      const routerConfig = {
        ticketCreated: handlerA, // key "ticketCreated" → handlerId "ticketCreated"
        ticket: {
          created: handlerB, // key "ticket.created" → handlerId "ticketCreated" (same!)
        },
      };

      expect(() =>
        generateAsyncAPI(routerConfig, { info: { title: 'Events', version: '1.0.0' } }),
      ).toThrow(/duplicate.*handlerId.*ticketCreated/i);
    });
  });

  // ==========================================================================
  // MISSED: AsyncAPI context/metadata schema in message
  // ==========================================================================

  describe('MISSED: context schema included in message', () => {
    it('includes context schema as message headers when handler has context', () => {
      const handler = defineEventHandler({
        eventType: 'order.shipped',
        payload: zodSchema(z.object({ orderId: z.string() })),
        context: contextSchema,
        docs: { summary: 'Order shipped' },
      });

      const spec = generateAsyncAPI(
        { orderShipped: handler },
        { info: { title: 'Events', version: '1.0.0' } },
      );

      const channel = spec.channels?.['order.shipped'];
      const message = channel?.messages?.['orderShipped'];

      // context schema should be present as message headers
      expect((message as Record<string, unknown> | undefined)?.headers).toBeDefined();
    });

    it('omits headers field when handler has no context schema', () => {
      const handler = defineEventHandler({
        eventType: 'ticket.created',
        payload: ticketPayloadSchema,
      });

      const spec = generateAsyncAPI(
        { ticketCreated: handler },
        { info: { title: 'Events', version: '1.0.0' } },
      );

      const channel = spec.channels?.['ticket.created'];
      const message = channel?.messages?.['ticketCreated'];

      expect((message as Record<string, unknown> | undefined)?.headers).toBeUndefined();
    });
  });

  // ==========================================================================
  // C07-8: RFC6901 escaping in $ref pointers
  // ==========================================================================

  describe('C07-8: RFC6901 escaping for channel keys containing / or ~', () => {
    it('escapes ~ as ~0 in $ref when eventType contains ~', () => {
      const handler = defineEventHandler({
        eventType: 'event~type', // ~ must become ~0 in JSON Pointer
      });

      const spec = generateAsyncAPI(
        { eventTilde: handler },
        { info: { title: 'Events', version: '1.0.0' } },
      );

      const operation = spec.operations?.['eventTilde'];
      // channel $ref: #/channels/event~0type (~ escaped as ~0)
      expect(operation?.channel.$ref).toBe('#/channels/event~0type');
      // message $ref: #/channels/event~0type/messages/eventTilde
      expect(operation?.messages?.[0]?.$ref).toBe('#/channels/event~0type/messages/eventTilde');
    });

    it('escapes / as ~1 in $ref when eventType contains /', () => {
      const handler = defineEventHandler({
        eventType: 'event/type', // / must become ~1 in JSON Pointer
      });

      const spec = generateAsyncAPI(
        { eventSlash: handler },
        { info: { title: 'Events', version: '1.0.0' } },
      );

      const operation = spec.operations?.['eventSlash'];
      // channel $ref: #/channels/event~1type (/ escaped as ~1)
      expect(operation?.channel.$ref).toBe('#/channels/event~1type');
      expect(operation?.messages?.[0]?.$ref).toBe('#/channels/event~1type/messages/eventSlash');
    });

    it('uses raw eventType as channel address (not escaped)', () => {
      // The address field is a semantic value, not a JSON Pointer — no escaping
      const handler = defineEventHandler({ eventType: 'org/user~created' });

      const spec = generateAsyncAPI(
        { handler: handler },
        { info: { title: 'Events', version: '1.0.0' } },
      );

      const channelKey = 'org/user~created';
      expect(spec.channels?.[channelKey]?.address).toBe('org/user~created');
    });
  });

  // ==========================================================================
  // Tags
  // ==========================================================================

  describe('tags', () => {
    it('collects tags from handler docs into spec info', () => {
      const handler = defineEventHandler({
        eventType: 'ticket.created',
        docs: { tags: ['ticket', 'notifications'] },
      });

      const spec = generateAsyncAPI(
        { ticketCreated: handler },
        { info: { title: 'Events', version: '1.0.0' } },
      );

      const infoTags = (spec.info as { tags?: { name: string }[] }).tags ?? [];
      expect(infoTags.map((t) => t.name)).toContain('ticket');
      expect(infoTags.map((t) => t.name)).toContain('notifications');
    });

    it('does not duplicate custom tags from config', () => {
      const handler = defineEventHandler({
        eventType: 'ticket.created',
        docs: { tags: ['ticket'] },
      });

      const spec = generateAsyncAPI(
        { ticketCreated: handler },
        {
          info: { title: 'Events', version: '1.0.0' },
          tags: [{ name: 'ticket', description: 'Ticket events' }],
        },
      );

      const infoTags =
        (spec.info as { tags?: { name: string; description?: string }[] }).tags ?? [];
      expect(infoTags.filter((t) => t.name === 'ticket')).toHaveLength(1);
      expect(infoTags.find((t) => t.name === 'ticket')?.description).toBe('Ticket events');
    });
  });

  // ==========================================================================
  // Payload schema in message
  // ==========================================================================

  describe('payload schema', () => {
    it('includes payload JSON schema in message', () => {
      const handler = defineEventHandler({
        eventType: 'ticket.created',
        payload: ticketPayloadSchema,
      });

      const spec = generateAsyncAPI(
        { ticketCreated: handler },
        { info: { title: 'Events', version: '1.0.0' } },
      );

      const channel = spec.channels?.['ticket.created'];
      const message = channel?.messages?.['ticketCreated'];
      expect(message?.payload).toBeDefined();
    });

    it('omits payload field when handler has no payload schema', () => {
      const handler = defineEventHandler({ eventType: 'ping' });
      const spec = generateAsyncAPI(
        { ping: handler },
        { info: { title: 'Events', version: '1.0.0' } },
      );

      const channel = spec.channels?.['ping'];
      const message = channel?.messages?.['ping'];
      expect(message?.payload).toBeUndefined();
    });
  });

  // ==========================================================================
  // Deprecated / summary / description
  // ==========================================================================

  describe('operation metadata', () => {
    it('sets deprecated on operation', () => {
      const handler = defineEventHandler({
        eventType: 'old.event',
        docs: { deprecated: true },
      });

      const spec = generateAsyncAPI(
        { oldEvent: handler },
        { info: { title: 'Events', version: '1.0.0' } },
      );

      expect(spec.operations?.['oldEvent']?.deprecated).toBe(true);
    });

    it('sets summary and description on operation', () => {
      const handler = defineEventHandler({
        eventType: 'user.registered',
        docs: { summary: 'User registered', description: 'Fired when a new user registers' },
      });

      const spec = generateAsyncAPI(
        { userRegistered: handler },
        { info: { title: 'Events', version: '1.0.0' } },
      );

      const operation = spec.operations?.['userRegistered'];
      expect(operation?.summary).toBe('User registered');
      expect(operation?.description).toBe('Fired when a new user registers');
    });
  });

  // ==========================================================================
  // Multiple handlers on same channel
  // ==========================================================================

  describe('multiple handlers on same channel', () => {
    it('groups two handlers with same eventType under one channel', () => {
      const handlerA = defineEventHandler({
        eventType: 'order.created',
        docs: { summary: 'Send notification' },
      });
      const handlerB = defineEventHandler({
        eventType: 'order.created',
        docs: { summary: 'Update inventory' },
      });

      const spec = generateAsyncAPI(
        { notifyOrder: handlerA, updateInventory: handlerB },
        { info: { title: 'Events', version: '1.0.0' } },
      );

      const channel = spec.channels?.['order.created'];
      expect(channel?.messages?.['notifyOrder']).toBeDefined();
      expect(channel?.messages?.['updateInventory']).toBeDefined();
    });
  });
});
