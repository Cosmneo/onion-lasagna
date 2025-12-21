export type HttpResponse = {
  statusCode: number;
  headers?: Record<string, unknown>;
  body?: unknown;
};
