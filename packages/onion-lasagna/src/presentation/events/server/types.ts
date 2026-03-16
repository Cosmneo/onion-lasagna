/**
 * @fileoverview Server types for the event handler system.
 *
 * @module events/server/types
 */

import type { EventHandlerDefinition, EventRouterConfig, EventRouterKeys } from '../handler/types';
import type { EventResult } from '../shared/types';

// Re-export UseCasePort from HTTP — same interface, no duplication
export type { UseCasePort } from '../../http/server/types';

// ============================================================================
// Raw Event (from messaging system)
// ============================================================================

/**
 * Event metadata provided by the messaging system.
 */
export interface EventMetadata {
  /** Unique event identifier for idempotency checks. */
  readonly eventId: string;

  /** ISO 8601 timestamp of when the event occurred. */
  readonly timestamp: string;

  /** Correlation ID for distributed tracing. */
  readonly correlationId?: string;

  /** Source system or bounded context that emitted the event. */
  readonly source?: string;

  /** Number of delivery attempts (1-based). */
  readonly attemptCount?: number;

  /** Additional metadata from the messaging system. */
  readonly [key: string]: unknown;
}

/**
 * Raw event from the messaging system.
 * This is the input to event handlers before validation.
 */
export interface RawEvent {
  /** Event type string for routing. */
  readonly type: string;

  /** Event payload (unvalidated). */
  readonly payload: unknown;

  /** Event metadata from the messaging system. */
  readonly metadata: EventMetadata;
}

// ============================================================================
// Validated Event
// ============================================================================

/**
 * A validated event with typed payload.
 * This is what handlers receive after validation passes.
 */
export interface ValidatedEvent<THandler extends EventHandlerDefinition> {
  /** Validated event payload. */
  readonly payload: THandler['_types']['payload'];

  /** Raw event object for advanced use cases. */
  readonly raw: RawEvent;
}

/**
 * Typed event context based on handler definition.
 * If the handler defines a context schema, this will be the validated type.
 * Otherwise, it falls back to the generic EventMetadata.
 */
export type TypedEventContext<THandler extends EventHandlerDefinition> =
  THandler['_types']['context'] extends undefined ? EventMetadata : THandler['_types']['context'];

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Handler configuration using the use case pattern.
 *
 * @typeParam THandler - The event handler definition type
 * @typeParam TInput - Use case input type
 * @typeParam TOutput - Use case output type
 */
export interface EventHandlerConfig<
  THandler extends EventHandlerDefinition,
  TInput = void,
  TOutput = void,
> {
  /**
   * Maps the validated event payload to use case input.
   * Both `event` and `ctx` are fully typed based on handler schemas.
   */
  readonly payloadMapper: (
    event: ValidatedEvent<THandler>,
    ctx: TypedEventContext<THandler>,
  ) => TInput;

  /** The use case to execute. */
  readonly useCase: { execute(input?: TInput): Promise<TOutput> };

  /**
   * Maps the use case output to an EventResult.
   * If omitted, defaults to `{ outcome: 'ack' }`.
   */
  readonly resultMapper?: (output: TOutput) => EventResult;

  /** Middleware to run before the handler. */
  readonly middleware?: readonly EventMiddlewareFunction[];
}

/**
 * Simple handler function that directly returns an EventResult.
 */
export type SimpleEventHandlerFn<THandler extends EventHandlerDefinition> = (
  event: ValidatedEvent<THandler>,
  ctx: TypedEventContext<THandler>,
) => Promise<EventResult> | EventResult;

/**
 * Configuration for a simple handler (no use case).
 */
export interface SimpleEventHandlerConfig<THandler extends EventHandlerDefinition> {
  readonly handler: SimpleEventHandlerFn<THandler>;
  readonly middleware?: readonly EventMiddlewareFunction[];
}

/**
 * Union of all event handler config types.
 * Used internally to store handlers in the builder.
 */
export type AnyEventHandlerConfig<
  THandler extends EventHandlerDefinition,
  TInput = unknown,
  TOutput = unknown,
> = EventHandlerConfig<THandler, TInput, TOutput> | SimpleEventHandlerConfig<THandler>;

/**
 * Type guard to check if config is a simple event handler.
 */
export function isSimpleEventHandlerConfig(
  config: AnyEventHandlerConfig<EventHandlerDefinition, unknown, unknown>,
): config is SimpleEventHandlerConfig<EventHandlerDefinition> {
  return 'handler' in config && typeof config.handler === 'function';
}

/**
 * Event middleware function type.
 */
export type EventMiddlewareFunction = (
  event: RawEvent,
  next: () => Promise<EventResult>,
) => Promise<EventResult>;

// ============================================================================
// Server Configuration
// ============================================================================

/**
 * Configuration mapping handler keys to handler configs.
 */
// TInput/TOutput are user-defined per handler - any is required for heterogeneous configs
export type EventRoutesConfig<T extends EventRouterConfig> = Record<
  EventRouterKeys<T>,
  EventHandlerConfig<any, any, any>
>;

/**
 * Options for creating event routes.
 */
export interface CreateEventRoutesOptions {
  /** Global middleware to run before all handlers. */
  readonly middleware?: readonly EventMiddlewareFunction[];

  /**
   * Whether to validate incoming event payloads against handler schemas.
   * When enabled, invalid payloads result in a `dlq` outcome.
   * @default true
   */
  readonly validatePayload?: boolean;

  /**
   * Custom error mapper to override default error-to-EventResult mapping.
   * If not provided, uses the built-in `mapErrorToEventResult`.
   */
  readonly errorMapper?: (error: unknown) => EventResult;

  /**
   * Allow partial handler configuration (not all handlers need to be wired).
   * @default false
   * @internal Used by builder pattern's buildPartial()
   */
  readonly allowPartial?: boolean;
}

// ============================================================================
// Unified Event Input (for messaging adapters)
// ============================================================================

/**
 * Event input compatible with messaging adapters.
 * This is the output of eventRoutes().build().
 */
export interface UnifiedEventInput {
  /** Event type string for routing. */
  readonly eventType: string;

  /** Handler function. */
  readonly handler: (rawEvent: RawEvent) => Promise<EventResult>;

  /** Handler metadata for documentation. */
  readonly metadata: {
    readonly handlerId?: string;
    readonly summary?: string;
    readonly description?: string;
    readonly tags?: readonly string[];
    readonly deprecated?: boolean;
  };
}
