// Handler layer: defineEventHandler, defineEventRouter, mergeEventRouters
export {
  defineEventHandler,
  defineEventRouter,
  mergeEventRouters,
  generateHandlerId,
} from './handler';
export type {
  DefineEventRouterOptions,
  EventHandlerDefinition,
  EventHandlerDocumentation,
  EventRouterEntry,
  EventRouterConfig,
  EventRouterDefaults,
  EventRouterDefinition,
  FlattenEventRouter,
  EventRouterKeys,
  GetEventHandler,
  InferEventType,
  InferEventPayload,
  InferEventContext,
} from './handler';
export { isEventHandlerDefinition, isEventRouterDefinition, collectEventHandlers } from './handler';

// Server layer: eventRoutes builder
export { eventRoutes } from './server';
export type {
  EventRoutesBuilder,
  MissingHandlersError,
  BuilderEventHandlerConfig,
  RawEvent,
  EventMetadata,
  ValidatedEvent,
  TypedEventContext,
  EventHandlerConfig,
  SimpleEventHandlerFn,
  SimpleEventHandlerConfig,
  EventMiddlewareFunction,
  CreateEventRoutesOptions,
  UnifiedEventInput,
  UseCasePort,
} from './server';
export { isSimpleEventHandlerConfig } from './server';

// Shared layer: EventResult, error mapping
export type { EventResult } from './shared';
export { mapErrorToEventResult } from './shared';

// AsyncAPI layer: spec generation
export { generateAsyncAPI } from './asyncapi';
export type {
  AsyncAPIConfig,
  AsyncAPIInfo,
  AsyncAPIServer,
  AsyncAPITag,
  AsyncAPIExternalDocs,
  AsyncAPISpec,
  AsyncAPIChannel,
  AsyncAPIMessage,
  AsyncAPIOperation,
  AsyncAPIComponents,
} from './asyncapi';
