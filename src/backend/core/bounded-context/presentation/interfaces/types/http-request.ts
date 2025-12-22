export interface HttpRequest {
  body?: unknown;
  headers?: Record<string, unknown>;
  queryParams?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
}
