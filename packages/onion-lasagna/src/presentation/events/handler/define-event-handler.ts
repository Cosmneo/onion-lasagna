/**
 * @fileoverview Factory function for creating event handler definitions.
 *
 * The `defineEventHandler` function is the main entry point for defining
 * event handlers. It mirrors `defineRoute` from the HTTP layer but is
 * tailored for asynchronous event processing.
 *
 * @module events/handler/define-event-handler
 */

import type { SchemaAdapter, InferOutput } from '../../http/schema/types';
import type { EventHandlerDefinition } from './types';

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for defineEventHandler.
 *
 * @example Basic handler with payload schema
 * ```typescript
 * defineEventHandler({
 *   eventType: 'ticket.created',
 *   payload: zodSchema(z.object({ ticketId: z.string() })),
 *   docs: { summary: 'Handle ticket creation', tags: ['ticket'] },
 * })
 * ```
 *
 * @example With context schema
 * ```typescript
 * defineEventHandler({
 *   eventType: 'order.shipped',
 *   payload: zodSchema(orderShippedSchema),
 *   context: zodSchema(eventMetadataSchema),
 * })
 * ```
 */
interface DefineEventHandlerInput<
  TEventType extends string,
  TPayload extends SchemaAdapter | undefined = undefined,
  TContext extends SchemaAdapter | undefined = undefined,
> {
  /** Event type string used for routing (e.g., 'ticket.created'). */
  readonly eventType: TEventType;

  /** Payload validation schema. */
  readonly payload?: TPayload;

  /** Context validation schema (validates event metadata). */
  readonly context?: TContext;

  /** Handler documentation. */
  readonly docs?: {
    readonly summary?: string;
    readonly description?: string;
    readonly tags?: readonly string[];
    readonly deprecated?: boolean;
  };
}

// ============================================================================
// Return type helpers
// ============================================================================

type ResolvePayload<T> = T extends SchemaAdapter ? InferOutput<T> : undefined;
type ResolveContext<T> = T extends SchemaAdapter ? InferOutput<T> : undefined;

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates an event handler definition from the provided configuration.
 *
 * This is the main entry point for defining event handlers. The resulting
 * definition can be used for type-safe handler registration, payload
 * validation, and documentation generation.
 *
 * @param input - Event handler configuration with optional schemas
 * @returns A frozen EventHandlerDefinition object with full type information
 */
export function defineEventHandler<
  TEventType extends string,
  TPayload extends SchemaAdapter | undefined = undefined,
  TContext extends SchemaAdapter | undefined = undefined,
>(
  input: DefineEventHandlerInput<TEventType, TPayload, TContext>,
): EventHandlerDefinition<
  TEventType,
  ResolvePayload<TPayload>,
  ResolveContext<TContext>
> {
  const definition = {
    eventType: input.eventType,
    payload: input.payload ?? undefined,
    context: input.context ?? undefined,
    docs: {
      summary: input.docs?.summary,
      description: input.docs?.description,
      tags: input.docs?.tags,
      deprecated: input.docs?.deprecated ?? false,
    },
    _types: undefined as unknown,
  };

  return Object.freeze(definition) as EventHandlerDefinition<
    TEventType,
    ResolvePayload<TPayload>,
    ResolveContext<TContext>
  >;
}
