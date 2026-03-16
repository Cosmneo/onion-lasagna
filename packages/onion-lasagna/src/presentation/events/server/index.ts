export { eventRoutes } from './event-routes-builder';
export type {
  EventRoutesBuilder,
  MissingHandlersError,
  BuilderEventHandlerConfig,
} from './event-routes-builder';

export type {
  RawEvent,
  EventMetadata,
  ValidatedEvent,
  TypedEventContext,
  EventHandlerConfig,
  SimpleEventHandlerFn,
  SimpleEventHandlerConfig,
  AnyEventHandlerConfig,
  EventMiddlewareFunction,
  EventRoutesConfig,
  CreateEventRoutesOptions,
  UnifiedEventInput,
  UseCasePort,
} from './types';

export { isSimpleEventHandlerConfig } from './types';
