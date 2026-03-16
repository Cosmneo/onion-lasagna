export type {
  EventHandlerDefinition,
  EventHandlerDocumentation,
  InferEventType,
  InferEventPayload,
  InferEventContext,
} from './event-handler-definition.type';

export type {
  EventRouterEntry,
  EventRouterConfig,
  EventRouterDefaults,
  EventRouterDefinition,
  FlattenEventRouter,
  EventRouterKeys,
  GetEventHandler,
  DeepMergeTwo,
  DeepMergeAll,
} from './event-router-definition.type';

export {
  isEventHandlerDefinition,
  isEventRouterDefinition,
  collectEventHandlers,
} from './event-router-definition.type';
