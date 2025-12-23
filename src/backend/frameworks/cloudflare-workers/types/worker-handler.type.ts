/**
 * Environment bindings for Cloudflare Workers.
 *
 * Extend this interface to define your specific bindings:
 * - KV namespaces
 * - D1 databases
 * - R2 buckets
 * - Durable Objects
 * - Environment variables
 * - Secrets
 *
 * @example
 * ```typescript
 * interface MyEnv extends WorkerEnv {
 *   MY_KV: KVNamespace;
 *   MY_DB: D1Database;
 *   API_KEY: string;
 * }
 * ```
 */
export type WorkerEnv = Record<string, unknown>;

/**
 * Execution context for Cloudflare Workers.
 *
 * Provides methods for background processing and error handling.
 */
export interface WorkerContext {
  /**
   * Extends the lifetime of the worker to complete background tasks.
   * The promise will be awaited after the response is sent.
   *
   * @param promise - The promise to wait for
   *
   * @example
   * ```typescript
   * ctx.waitUntil(analytics.track(event));
   * return new Response('OK');
   * ```
   */
  waitUntil(promise: Promise<unknown>): void;

  /**
   * Forwards the request to the origin server if an unhandled error occurs.
   * Must be called before starting to stream a response.
   */
  passThroughOnException(): void;
}

/**
 * Cloudflare Worker fetch handler type.
 *
 * @typeParam TEnv - Environment bindings type
 *
 * @example
 * ```typescript
 * const handler: WorkerHandler<MyEnv> = async (request, env, ctx) => {
 *   const value = await env.MY_KV.get('key');
 *   return new Response(value);
 * };
 *
 * export default { fetch: handler };
 * ```
 */
export type WorkerHandler<TEnv extends WorkerEnv = WorkerEnv> = (
  request: Request,
  env: TEnv,
  ctx: WorkerContext,
) => Promise<Response>;
