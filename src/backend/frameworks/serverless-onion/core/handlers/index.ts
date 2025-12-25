// Handler factories
export { createBaseHandler } from './create-base-handler';
export type { BaseHandlerConfig, BaseHandlerFactory } from './create-base-handler';

export { createBaseProxyHandler } from './create-base-proxy-handler';
export type { BaseProxyHandlerConfig, BaseProxyHandlerFactory } from './create-base-proxy-handler';

// Utilities
export { buildHttpRequest } from './build-http-request';
export type { HttpRequestComponents } from './build-http-request';

// Types
export type { PlatformAdapter, PlatformProxyAdapter, RouteInfo } from './types';
