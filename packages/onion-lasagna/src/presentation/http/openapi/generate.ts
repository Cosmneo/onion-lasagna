/**
 * @fileoverview OpenAPI specification generation from router definitions (v2 — flat API).
 *
 * The `generateOpenAPI` function creates a complete OpenAPI 3.1 specification
 * from a router definition. All route schemas are converted to JSON Schema
 * and included in the specification.
 *
 * Schemas are read from `route.request` (body, query, params, headers) and
 * per-status response schemas from `route.responses`.
 *
 * @module unified/openapi/generate
 */

import type { JsonSchema, SchemaAdapter } from '../schema/types';
import type { RouterConfig, RouterDefinition, RouteDefinition } from '../route/types';
import { isRouterDefinition, collectRoutes, getPathParamNames } from '../route/types';
import { generateOperationId } from '../route/utils';
import type {
  OpenAPIConfig,
  OpenAPISpec,
  OpenAPIPaths,
  OpenAPIPathItem,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIResponses,
  OpenAPITag,
} from './types';

/**
 * Checks if a value is a valid JSON schema structure.
 *
 * A valid JSON schema must be an object and have at least one of:
 * - `type` property (primitive or object types)
 * - `$ref` property (reference to another schema)
 * - `oneOf`, `anyOf`, `allOf` (composition)
 * - `properties` (object schema without explicit type)
 * - `items` (array schema without explicit type)
 * - `enum` (enumeration)
 * - `const` (constant value)
 *
 * @param value - The value to check
 * @returns True if value appears to be a valid JSON schema
 */
function isValidJsonSchema(value: unknown): value is JsonSchema {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const schema = value as Record<string, unknown>;

  // Check for valid JSON schema indicators
  return (
    'type' in schema ||
    '$ref' in schema ||
    'oneOf' in schema ||
    'anyOf' in schema ||
    'allOf' in schema ||
    'properties' in schema ||
    'items' in schema ||
    'enum' in schema ||
    'const' in schema
  );
}

/**
 * Generates an OpenAPI specification from a router definition.
 *
 * This function walks the router structure, extracts JSON schemas from
 * all route definitions, and builds a complete OpenAPI 3.1 specification.
 *
 * Operation IDs are auto-generated from the router key path when not
 * explicitly specified in the route docs.
 *
 * @param router - Router definition or router config
 * @param config - OpenAPI configuration (info, servers, security, etc.)
 * @returns Complete OpenAPI specification
 *
 * @example Basic usage
 * ```typescript
 * import { generateOpenAPI } from '@cosmneo/onion-lasagna/http/openapi';
 * import { api } from './routes';
 *
 * const spec = generateOpenAPI(api, {
 *   info: {
 *     title: 'My API',
 *     version: '1.0.0',
 *     description: 'A comprehensive API for managing resources',
 *   },
 *   servers: [
 *     { url: 'http://localhost:3000', description: 'Development' },
 *     { url: 'https://api.example.com', description: 'Production' },
 *   ],
 * });
 *
 * // Serve the spec
 * app.get('/openapi.json', (c) => c.json(spec));
 * ```
 */
export function generateOpenAPI<T extends RouterConfig>(
  router: T | RouterDefinition<T>,
  config: OpenAPIConfig,
): OpenAPISpec {
  const routes = isRouterDefinition(router) ? router.routes : router;
  const collectedRoutes = collectRoutes(routes);

  // Build paths
  const paths: OpenAPIPaths = {};
  const allTags = new Set<string>();

  for (const { key, route } of collectedRoutes) {
    const openAPIPath = convertToOpenAPIPath(route.path);

    if (!paths[openAPIPath]) {
      paths[openAPIPath] = {};
    }

    const operation = buildOperation(key, route);
    const method = route.method.toLowerCase() as keyof OpenAPIPathItem;

    (paths[openAPIPath] as Record<string, OpenAPIOperation>)[method] = operation;

    // Collect tags
    if (operation.tags) {
      for (const tag of operation.tags) {
        allTags.add(tag);
      }
    }
  }

  // Build the specification
  const spec: OpenAPISpec = {
    openapi: config.openapi ?? '3.1.0',
    info: config.info,
    paths,
  };

  // Add optional sections
  if (config.servers && config.servers.length > 0) {
    (spec as { servers: typeof config.servers }).servers = config.servers;
  }

  if (config.securitySchemes && Object.keys(config.securitySchemes).length > 0) {
    (spec as { components: { securitySchemes: typeof config.securitySchemes } }).components = {
      securitySchemes: config.securitySchemes,
    };
  }

  if (config.security && config.security.length > 0) {
    (spec as { security: typeof config.security }).security = config.security;
  }

  // Merge custom tags with collected tags
  const tags: OpenAPITag[] = config.tags ? [...config.tags] : [];
  for (const tagName of allTags) {
    if (!tags.some((t) => t.name === tagName)) {
      tags.push({ name: tagName });
    }
  }
  if (tags.length > 0) {
    (spec as unknown as { tags: OpenAPITag[] }).tags = tags;
  }

  if (config.externalDocs) {
    (spec as { externalDocs: typeof config.externalDocs }).externalDocs = config.externalDocs;
  }

  return spec;
}

/**
 * Converts a path with :param to OpenAPI {param} format.
 */
function convertToOpenAPIPath(path: string): string {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
}

/**
 * Builds an OpenAPI operation from a route definition.
 * Auto-generates operationId from the key if not explicitly set.
 */
function buildOperation(key: string, route: RouteDefinition): OpenAPIOperation {
  const operation: OpenAPIOperation = {
    responses: buildResponses(route),
  };

  // operationId: use explicit or auto-generate from router key
  const operationId = route.docs.operationId ?? generateOperationId(key);
  (operation as { operationId: string }).operationId = operationId;

  if (route.docs.summary) {
    (operation as { summary: string }).summary = route.docs.summary;
  }

  if (route.docs.description) {
    (operation as { description: string }).description = route.docs.description;
  }

  if (route.docs.tags && route.docs.tags.length > 0) {
    (operation as { tags: readonly string[] }).tags = route.docs.tags;
  }

  if (route.docs.deprecated) {
    (operation as { deprecated: boolean }).deprecated = true;
  }

  if (route.docs.security && route.docs.security.length > 0) {
    (operation as { security: typeof route.docs.security }).security = route.docs.security;
  }

  if (route.docs.externalDocs) {
    (operation as { externalDocs: typeof route.docs.externalDocs }).externalDocs =
      route.docs.externalDocs;
  }

  // Add parameters
  const parameters = buildParameters(route);
  if (parameters.length > 0) {
    (operation as unknown as { parameters: OpenAPIParameter[] }).parameters = parameters;
  }

  // Add request body
  if (route.request.body) {
    (operation as { requestBody: OpenAPIRequestBody }).requestBody = buildRequestBody(route);
  }

  return operation;
}

/**
 * Builds OpenAPI parameters from route request schemas.
 */
function buildParameters(route: RouteDefinition): OpenAPIParameter[] {
  const parameters: OpenAPIParameter[] = [];

  // Path parameters
  const pathParamNames = getPathParamNames(route.path);
  for (const name of pathParamNames) {
    const param: OpenAPIParameter = {
      name,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    };

    // If we have a params schema, try to get more info
    if (route.request.params) {
      const jsonSchema = (route.request.params as SchemaAdapter).toJsonSchema();
      if (jsonSchema.properties && typeof jsonSchema.properties === 'object') {
        const propSchema = (jsonSchema.properties as Record<string, unknown>)[name];
        if (isValidJsonSchema(propSchema)) {
          (param as { schema: JsonSchema }).schema = propSchema;
        }
      }
    }

    parameters.push(param);
  }

  // Query parameters
  if (route.request.query) {
    const querySchema = (route.request.query as SchemaAdapter).toJsonSchema();

    if (querySchema.properties && typeof querySchema.properties === 'object') {
      const requiredFields = new Set(
        Array.isArray(querySchema.required) ? querySchema.required : [],
      );

      for (const [name, propSchema] of Object.entries(
        querySchema.properties as Record<string, unknown>,
      )) {
        // Skip invalid schema structures
        if (!isValidJsonSchema(propSchema)) {
          continue;
        }

        const param: OpenAPIParameter = {
          name,
          in: 'query',
          required: requiredFields.has(name),
          schema: propSchema,
        };

        // Add description if present
        if ('description' in propSchema && typeof propSchema.description === 'string') {
          (param as { description: string }).description = propSchema.description;
        }

        parameters.push(param);
      }
    }
  }

  // Header parameters
  if (route.request.headers) {
    const headersSchema = (route.request.headers as SchemaAdapter).toJsonSchema();

    if (headersSchema.properties && typeof headersSchema.properties === 'object') {
      const requiredFields = new Set(
        Array.isArray(headersSchema.required) ? headersSchema.required : [],
      );

      for (const [name, propSchema] of Object.entries(
        headersSchema.properties as Record<string, unknown>,
      )) {
        // Skip invalid schema structures
        if (!isValidJsonSchema(propSchema)) {
          continue;
        }

        const param: OpenAPIParameter = {
          name,
          in: 'header',
          required: requiredFields.has(name),
          schema: propSchema,
        };

        parameters.push(param);
      }
    }
  }

  return parameters;
}

/**
 * Builds OpenAPI request body from route.
 * Reads metadata (contentType, required, description) from `route._meta.body`.
 */
function buildRequestBody(route: RouteDefinition): OpenAPIRequestBody {
  const bodySchema = route.request.body as SchemaAdapter;
  const meta = route._meta?.body;

  const contentType = meta?.contentType ?? 'application/json';

  const requestBody: OpenAPIRequestBody = {
    required: meta?.required !== false,
    content: {
      [contentType]: {
        schema: bodySchema.toJsonSchema(),
      },
    },
  };

  if (meta?.description) {
    (requestBody as { description: string }).description = meta.description;
  }

  return requestBody;
}

/**
 * Builds OpenAPI responses from route.
 *
 * Each status code in `route.responses` gets its own entry with
 * description, schema, and content type. If no responses are defined,
 * a default `200` entry is generated.
 */
function buildResponses(route: RouteDefinition): OpenAPIResponses {
  const responses: OpenAPIResponses = {};

  if (route.responses && Object.keys(route.responses).length > 0) {
    for (const [statusCode, config] of Object.entries(route.responses)) {
      const description = config.description ?? `Response ${statusCode}`;

      if (config.schema) {
        const contentType = config.contentType ?? 'application/json';
        responses[statusCode] = {
          description,
          content: {
            [contentType]: {
              schema: (config.schema as SchemaAdapter).toJsonSchema(),
            },
          },
        };
      } else {
        responses[statusCode] = { description };
      }
    }
  } else {
    responses['200'] = { description: 'Successful response' };
  }

  return responses;
}
