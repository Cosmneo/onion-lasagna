/**
 * @fileoverview Core event handler definition types.
 *
 * An event handler definition captures all information needed for:
 * - Type-safe event payload validation
 * - Server-side event routing and dispatching
 * - AsyncAPI / documentation generation
 *
 * @module events/handler/types/event-handler-definition
 */

import type { SchemaAdapter } from '../../../http/schema/types';

// ============================================================================
// Documentation Types
// ============================================================================

/**
 * Event handler documentation for AsyncAPI / docs generation.
 */
export interface EventHandlerDocumentation {
  /** Short summary of the handler. */
  readonly summary?: string;

  /** Detailed description. Supports Markdown. */
  readonly description?: string;

  /** Tags for grouping event handlers. */
  readonly tags?: readonly string[];

  /** Whether this handler is deprecated. @default false */
  readonly deprecated?: boolean;
}

// ============================================================================
// Event Handler Definition
// ============================================================================

/**
 * A fully defined event handler with computed types.
 * This is the output of `defineEventHandler()`.
 */
export interface EventHandlerDefinition<
  TEventType extends string = string,
  TPayload = undefined,
  TContext = undefined,
> {
  /** Event type string used for routing (e.g., 'ticket.created'). */
  readonly eventType: TEventType;

  /** Payload validation schema. */
  readonly payload: SchemaAdapter | undefined;

  /** Context validation schema (validates event metadata). */
  readonly context: SchemaAdapter | undefined;

  /** Handler documentation. */
  readonly docs: EventHandlerDocumentation;

  /**
   * Phantom types for TypeScript inference.
   * Never accessed at runtime.
   * @internal
   */
  readonly _types: {
    readonly eventType: TEventType;
    readonly payload: TPayload;
    readonly context: TContext;
  };
}

// ============================================================================
// Type Helpers
// ============================================================================

/** Infers the event type string from a handler definition. */
export type InferEventType<T> =
  T extends EventHandlerDefinition<infer TEventType, unknown, unknown> ? TEventType : never;

/** Infers the payload type from a handler definition. */
export type InferEventPayload<T> =
  T extends EventHandlerDefinition<string, infer TPayload, unknown> ? TPayload : never;

/** Infers the context type from a handler definition. */
export type InferEventContext<T> =
  T extends EventHandlerDefinition<string, unknown, infer TContext> ? TContext : never;
