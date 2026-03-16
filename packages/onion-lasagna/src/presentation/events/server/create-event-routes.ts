/**
 * @fileoverview Internal implementation for creating event routes with auto-validation.
 *
 * Generates event handlers from an event router definition.
 * Each handler automatically validates incoming event payloads and context
 * against the handler's schemas.
 *
 * @module events/server/create-event-routes
 * @internal
 */

import type { SchemaAdapter, ValidationIssue } from '../../http/schema/types';
import type {
  EventRouterConfig,
  EventRouterDefinition,
  EventHandlerDefinition,
} from '../handler/types';
import { isEventRouterDefinition, collectEventHandlers } from '../handler/types';
import { generateHandlerId } from '../handler/utils';
import { mapErrorToEventResult } from '../shared/error-mapping';
import type { EventResult } from '../shared/types';
import type {
  AnyEventHandlerConfig,
  CreateEventRoutesOptions,
  EventMetadata,
  RawEvent,
  UnifiedEventInput,
  ValidatedEvent,
} from './types';
import { isSimpleEventHandlerConfig } from './types';

/**
 * Internal implementation for creating event routes.
 * Used by the builder pattern (eventRoutes).
 *
 * @internal
 */
export function createEventRoutesInternal<T extends EventRouterConfig>(
  router: T | EventRouterDefinition<T>,
  handlers: Record<string, AnyEventHandlerConfig<EventHandlerDefinition, unknown, unknown>>,
  options?: CreateEventRoutesOptions,
): UnifiedEventInput[] {
  const config = isEventRouterDefinition(router) ? router.handlers : router;
  const collectedHandlers = collectEventHandlers(config);

  const result: UnifiedEventInput[] = [];

  const resolvedOptions: CreateEventRoutesOptions = {
    ...options,
    validatePayload: options?.validatePayload ?? true,
    allowPartial: options?.allowPartial ?? false,
  };

  for (const { key, handler: handlerDef } of collectedHandlers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlerConfig = handlers[key] as AnyEventHandlerConfig<EventHandlerDefinition, any, any> | undefined;

    if (!handlerConfig) {
      if (resolvedOptions.allowPartial) {
        continue;
      }
      throw new Error(
        `Missing handler for event "${key}". All event handlers must have a handler configuration.`,
      );
    }

    result.push(createEventHandler(key, handlerDef, handlerConfig, resolvedOptions));
  }

  return result;
}

/**
 * Creates a single event handler with validation and error mapping.
 */
function createEventHandler(
  key: string,
  handlerDef: EventHandlerDefinition,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: AnyEventHandlerConfig<EventHandlerDefinition, any, any>,
  options: CreateEventRoutesOptions,
): UnifiedEventInput {
  const middleware = config.middleware ?? [];
  const globalMiddleware = options?.middleware ?? [];
  const allMiddleware = [...globalMiddleware, ...middleware];
  const shouldValidatePayload = options.validatePayload ?? true;
  const errorMapper = options.errorMapper ?? mapErrorToEventResult;

  return {
    eventType: handlerDef.eventType,
    metadata: {
      handlerId: generateHandlerId(key),
      summary: handlerDef.docs.summary,
      description: handlerDef.docs.description,
      tags: handlerDef.docs.tags as string[],
      deprecated: handlerDef.docs.deprecated,
    },
    handler: async (rawEvent: RawEvent): Promise<EventResult> => {
      try {
        // Validate context (if schema defined)
        let validatedContext: unknown = rawEvent.metadata;
        if (handlerDef.context) {
          const contextResult = validateContextData(handlerDef, rawEvent.metadata);
          if (!contextResult.success) {
            const errors = contextResult.errors ?? [];
            return {
              outcome: 'dlq',
              reason: `Context validation failed: ${errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
            };
          }
          validatedContext = contextResult.data;
        }

        // Validate payload (if enabled and schema defined)
        let validatedPayload: unknown = rawEvent.payload;
        if (shouldValidatePayload && handlerDef.payload) {
          const payloadResult = validatePayloadData(handlerDef, rawEvent.payload);
          if (!payloadResult.success) {
            const errors = payloadResult.errors ?? [];
            return {
              outcome: 'dlq',
              reason: `Payload validation failed: ${errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
            };
          }
          validatedPayload = payloadResult.data;
        }

        const validatedEvent: ValidatedEventInternal = {
          payload: validatedPayload,
          raw: rawEvent,
        };

        // Execute the pipeline
        const executePipeline = async (): Promise<EventResult> => {
          if (isSimpleEventHandlerConfig(config)) {
            return config.handler(
              validatedEvent as unknown as ValidatedEvent<EventHandlerDefinition>,
              validatedContext as EventMetadata,
            );
          } else {
            const { payloadMapper, useCase, resultMapper } = config;

            const input = payloadMapper(
              validatedEvent as unknown as ValidatedEvent<EventHandlerDefinition>,
              validatedContext as EventMetadata,
            );

            const output = await useCase.execute(input);

            return resultMapper ? resultMapper(output) : { outcome: 'ack' };
          }
        };

        if (allMiddleware.length === 0) {
          return await executePipeline();
        }

        // Build middleware chain
        let index = 0;
        const next = async (): Promise<EventResult> => {
          if (index >= allMiddleware.length) {
            return executePipeline();
          }
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- index bounds checked above
          const mw = allMiddleware[index++]!;
          return mw(rawEvent, next);
        };

        return await next();
      } catch (error) {
        return errorMapper(error);
      }
    },
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

interface ValidationResultInternal {
  success: boolean;
  errors?: ValidationIssue[];
  data?: unknown;
}

/**
 * Validates event payload against the handler's payload schema.
 */
function validatePayloadData(
  handler: EventHandlerDefinition,
  payload: unknown,
): ValidationResultInternal {
  const schema = handler.payload as SchemaAdapter | undefined;
  if (!schema) return { success: true, data: payload };

  const result = schema.validate(payload);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.issues.map((issue) => ({
    ...issue,
    path: ['payload', ...issue.path],
  }));

  return { success: false, errors };
}

/**
 * Validates event metadata against the handler's context schema.
 */
function validateContextData(
  handler: EventHandlerDefinition,
  metadata: EventMetadata,
): ValidationResultInternal {
  const schema = handler.context as SchemaAdapter | undefined;
  if (!schema) return { success: true, data: metadata };

  const result = schema.validate(metadata);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.issues.map((issue) => ({
    ...issue,
    path: ['context', ...issue.path],
  }));

  return { success: false, errors };
}

/**
 * Internal validated event type with unknown fields.
 * Used inside createEventHandler where specific types are erased.
 */
interface ValidatedEventInternal {
  readonly payload: unknown;
  readonly raw: RawEvent;
}
