// AWS API Gateway HTTP v2 Runtime for serverless-onion
// Only exports AWS-specific implementations
// For core modules, import from '@cosmneo/onion-lasagna/backend/frameworks/serverless-onion/core'
// For routing, import from '@cosmneo/onion-lasagna/backend/core/presentation'

// AWS-specific middleware (typed for APIGatewayProxyEventV2)
export {
  // Types
  type Middleware,
  type MiddlewareOutput,
  type MiddlewareInput,
  type AccumulatedContext,
  // Factory
  defineMiddleware,
} from './middleware';

// AWS-specific adapters
export * from './adapters';

// AWS-specific features
export * from './features';

// AWS-specific handler factories
export * from './handlers';

// AWS-specific wrappers
export * from './wrappers';
