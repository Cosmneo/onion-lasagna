/**
 * @fileoverview Builder pattern for creating type-safe event routes.
 *
 * The `eventRoutes` function returns a builder that provides 100% type inference
 * for all handler parameters — no manual type annotations required.
 *
 * @module events/server/event-routes-builder
 */

import type {
  EventRouterConfig,
  EventRouterDefinition,
  GetEventHandler,
  EventRouterKeys,
  EventHandlerDefinition,
} from '../handler/types';
import type { EventResult } from '../shared/types';
import type {
  AnyEventHandlerConfig,
  CreateEventRoutesOptions,
  EventHandlerConfig,
  EventMiddlewareFunction,
  SimpleEventHandlerConfig,
  SimpleEventHandlerFn,
  TypedEventContext,
  UnifiedEventInput,
  ValidatedEvent,
} from './types';
import { createEventRoutesInternal } from './create-event-routes';

// ============================================================================
// Builder Types
// ============================================================================

/**
 * Error type displayed when attempting to build() with missing handlers.
 * The `___missingHandlers` property shows which handlers are missing.
 */
export interface MissingHandlersError<TMissing extends string> {
  /**
   * This error indicates that not all event handlers have been wired.
   * Use buildPartial() to build with only the defined handlers,
   * or add handlers for the missing events.
   */
  (options?: never): never;
  /** Event handlers that are missing. */
  readonly ___missingHandlers: TMissing;
}

/**
 * Handler configuration for the builder pattern.
 */
export interface BuilderEventHandlerConfig<
  THandler extends EventHandlerDefinition,
  TInput,
  TOutput,
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
 * Builder interface for creating type-safe event routes.
 *
 * Each `.handle()` call captures the specific handler type and provides
 * full type inference for payloadMapper and useCase.
 *
 * @typeParam T - The event router configuration type
 * @typeParam THandled - Union of handler keys that have been wired (accumulates)
 *
 * @example
 * ```typescript
 * const routes = eventRoutes(ticketEvents)
 *   .handleWithUseCase('created', {
 *     payloadMapper: (event, ctx) => ({
 *       ticketId: event.payload.ticketId,  // Fully typed!
 *       correlationId: ctx.correlationId,  // Fully typed!
 *     }),
 *     useCase: sendNotificationUseCase,
 *   })
 *   .handle('assigned', async (event) => {
 *     await notifyAssignee(event.payload);
 *     return { outcome: 'ack' as const };
 *   })
 *   .build();
 * ```
 */
export interface EventRoutesBuilder<T extends EventRouterConfig, THandled extends string = never> {
  /**
   * Register a simple handler for an event.
   * The handler receives validated event and context, returns EventResult directly.
   */
  handle<K extends Exclude<EventRouterKeys<T>, THandled>>(
    key: K,
    handlerOrConfig:
      | SimpleEventHandlerFn<GetEventHandler<T, K>>
      | SimpleEventHandlerConfig<GetEventHandler<T, K>>,
  ): EventRoutesBuilder<T, THandled | K>;

  /**
   * Register a handler using the use case pattern.
   * Follows: payloadMapper → useCase.execute() → resultMapper (or ack)
   */
  handleWithUseCase<K extends Exclude<EventRouterKeys<T>, THandled>, TInput, TOutput>(
    key: K,
    config: BuilderEventHandlerConfig<GetEventHandler<T, K>, TInput, TOutput>,
  ): EventRoutesBuilder<T, THandled | K>;

  /**
   * Build the event routes array for messaging adapter registration.
   *
   * This method is only available when ALL handlers have been wired.
   * If some handlers are missing, use `buildPartial()` instead.
   */
  build: [Exclude<EventRouterKeys<T>, THandled>] extends [never]
    ? (options?: CreateEventRoutesOptions) => UnifiedEventInput[]
    : MissingHandlersError<Exclude<EventRouterKeys<T>, THandled>>;

  /**
   * Build event routes for only the defined handlers.
   * No compile-time enforcement of completeness.
   */
  buildPartial(options?: CreateEventRoutesOptions): UnifiedEventInput[];
}

// ============================================================================
// Builder Implementation
// ============================================================================

/**
 * Internal builder implementation.
 *
 * Uses an immutable pattern where each handle() call returns a new
 * builder instance with the updated handlers map.
 */
class EventRoutesBuilderImpl<T extends EventRouterConfig, THandled extends string = never> {
  private readonly router: T | EventRouterDefinition<T>;
  private readonly handlers: Map<
    string,
    AnyEventHandlerConfig<EventHandlerDefinition, unknown, unknown>
  >;

  constructor(
    router: T | EventRouterDefinition<T>,
    handlers?: Map<string, AnyEventHandlerConfig<EventHandlerDefinition, unknown, unknown>>,
  ) {
    this.router = router;
    this.handlers = handlers ?? new Map();
  }

  handle<K extends Exclude<EventRouterKeys<T>, THandled>>(
    key: K,
    handlerOrConfig:
      | SimpleEventHandlerFn<GetEventHandler<T, K>>
      | SimpleEventHandlerConfig<GetEventHandler<T, K>>,
  ): EventRoutesBuilder<T, THandled | K> {
    const config: SimpleEventHandlerConfig<EventHandlerDefinition> =
      typeof handlerOrConfig === 'function'
        ? { handler: handlerOrConfig as SimpleEventHandlerFn<EventHandlerDefinition> }
        : (handlerOrConfig as SimpleEventHandlerConfig<EventHandlerDefinition>);

    const newHandlers = new Map(this.handlers);
    newHandlers.set(key as string, config);

    return new EventRoutesBuilderImpl<T, THandled | K>(
      this.router,
      newHandlers,
    ) as unknown as EventRoutesBuilder<T, THandled | K>;
  }

  handleWithUseCase<K extends Exclude<EventRouterKeys<T>, THandled>, TInput, TOutput>(
    key: K,
    config: BuilderEventHandlerConfig<GetEventHandler<T, K>, TInput, TOutput>,
  ): EventRoutesBuilder<T, THandled | K> {
    const newHandlers = new Map(this.handlers);
    newHandlers.set(
      key as string,
      config as EventHandlerConfig<EventHandlerDefinition, unknown, unknown>,
    );

    return new EventRoutesBuilderImpl<T, THandled | K>(
      this.router,
      newHandlers,
    ) as unknown as EventRoutesBuilder<T, THandled | K>;
  }

  build(options?: CreateEventRoutesOptions): UnifiedEventInput[] {
    return createEventRoutesInternal(this.router, Object.fromEntries(this.handlers), options);
  }

  buildPartial(options?: CreateEventRoutesOptions): UnifiedEventInput[] {
    return createEventRoutesInternal(this.router, Object.fromEntries(this.handlers), {
      ...options,
      allowPartial: true,
    });
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Creates a type-safe event routes builder for an event router.
 *
 * The builder pattern provides 100% type inference for all handler parameters:
 * - `event.payload` is typed from the handler's payload schema
 * - `ctx` is typed from the handler's context schema (or EventMetadata)
 * - `output` in resultMapper is typed from the use case
 *
 * @param router - Event router definition or event router config
 * @returns Builder for registering handlers
 *
 * @example Basic usage
 * ```typescript
 * import { eventRoutes } from '@cosmneo/onion-lasagna/events/server';
 * import { ticketEvents } from './router';
 *
 * const routes = eventRoutes(ticketEvents)
 *   .handleWithUseCase('created', {
 *     payloadMapper: (event, ctx) => ({
 *       ticketId: event.payload.ticketId,
 *       correlationId: ctx.correlationId,
 *     }),
 *     useCase: sendNotificationUseCase,
 *   })
 *   .handle('assigned', async (event) => {
 *     await notifyAssignee(event.payload);
 *     return { outcome: 'ack' as const };
 *   })
 *   .build();
 * ```
 */
export function eventRoutes<T extends EventRouterConfig>(
  router: T | EventRouterDefinition<T>,
): EventRoutesBuilder<T, never> {
  return new EventRoutesBuilderImpl(router) as unknown as EventRoutesBuilder<T, never>;
}
