/**
 * HTTP methods supported by the typed client.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * HTTP methods that typically include a request body.
 */
export type BodyMethod = 'POST' | 'PUT' | 'PATCH';

/**
 * HTTP methods that typically do not include a request body.
 */
export type NoBodyMethod = 'GET' | 'DELETE';
