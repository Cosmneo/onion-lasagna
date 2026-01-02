/**
 * @fileoverview OpenAPI types for specification generation.
 *
 * @module unified/openapi/types
 */

import type { JsonSchema } from '../schema/types';

// ============================================================================
// OpenAPI 3.1 Types
// ============================================================================

/**
 * OpenAPI specification configuration.
 */
export interface OpenAPIConfig {
  /**
   * OpenAPI specification version.
   * @default '3.1.0'
   */
  readonly openapi?: '3.0.3' | '3.1.0';

  /**
   * API information.
   */
  readonly info: OpenAPIInfo;

  /**
   * Server configurations.
   */
  readonly servers?: readonly OpenAPIServer[];

  /**
   * Security schemes.
   */
  readonly securitySchemes?: Record<string, OpenAPISecurityScheme>;

  /**
   * Global security requirements.
   */
  readonly security?: readonly OpenAPISecurityRequirement[];

  /**
   * External documentation.
   */
  readonly externalDocs?: OpenAPIExternalDocs;

  /**
   * Custom tags with descriptions.
   */
  readonly tags?: readonly OpenAPITag[];
}

/**
 * API information.
 */
export interface OpenAPIInfo {
  readonly title: string;
  readonly version: string;
  readonly description?: string;
  readonly termsOfService?: string;
  readonly contact?: {
    readonly name?: string;
    readonly url?: string;
    readonly email?: string;
  };
  readonly license?: {
    readonly name: string;
    readonly url?: string;
    readonly identifier?: string;
  };
}

/**
 * Server configuration.
 */
export interface OpenAPIServer {
  readonly url: string;
  readonly description?: string;
  readonly variables?: Record<
    string,
    {
      readonly default: string;
      readonly enum?: readonly string[];
      readonly description?: string;
    }
  >;
}

/**
 * Security scheme.
 */
export type OpenAPISecurityScheme =
  | {
      readonly type: 'apiKey';
      readonly name: string;
      readonly in: 'query' | 'header' | 'cookie';
      readonly description?: string;
    }
  | {
      readonly type: 'http';
      readonly scheme:
        | 'basic'
        | 'bearer'
        | 'digest'
        | 'hoba'
        | 'mutual'
        | 'negotiate'
        | 'oauth'
        | 'scram-sha-1'
        | 'scram-sha-256'
        | 'vapid';
      readonly bearerFormat?: string;
      readonly description?: string;
    }
  | {
      readonly type: 'oauth2';
      readonly flows: OpenAPIOAuthFlows;
      readonly description?: string;
    }
  | {
      readonly type: 'openIdConnect';
      readonly openIdConnectUrl: string;
      readonly description?: string;
    };

/**
 * OAuth2 flows.
 */
export interface OpenAPIOAuthFlows {
  readonly implicit?: {
    readonly authorizationUrl: string;
    readonly scopes: Record<string, string>;
    readonly refreshUrl?: string;
  };
  readonly password?: {
    readonly tokenUrl: string;
    readonly scopes: Record<string, string>;
    readonly refreshUrl?: string;
  };
  readonly clientCredentials?: {
    readonly tokenUrl: string;
    readonly scopes: Record<string, string>;
    readonly refreshUrl?: string;
  };
  readonly authorizationCode?: {
    readonly authorizationUrl: string;
    readonly tokenUrl: string;
    readonly scopes: Record<string, string>;
    readonly refreshUrl?: string;
  };
}

/**
 * Security requirement.
 */
export type OpenAPISecurityRequirement = Record<string, readonly string[]>;

/**
 * External documentation.
 */
export interface OpenAPIExternalDocs {
  readonly url: string;
  readonly description?: string;
}

/**
 * Tag definition.
 */
export interface OpenAPITag {
  readonly name: string;
  readonly description?: string;
  readonly externalDocs?: OpenAPIExternalDocs;
}

// ============================================================================
// OpenAPI Specification
// ============================================================================

/**
 * Complete OpenAPI specification.
 */
export interface OpenAPISpec {
  readonly openapi: string;
  readonly info: OpenAPIInfo;
  readonly servers?: readonly OpenAPIServer[];
  readonly paths: OpenAPIPaths;
  readonly components?: OpenAPIComponents;
  readonly security?: readonly OpenAPISecurityRequirement[];
  readonly tags?: readonly OpenAPITag[];
  readonly externalDocs?: OpenAPIExternalDocs;
}

/**
 * Paths object containing all API paths.
 */
export type OpenAPIPaths = Record<string, OpenAPIPathItem>;

/**
 * Path item containing operations.
 */
export interface OpenAPIPathItem {
  readonly summary?: string;
  readonly description?: string;
  readonly get?: OpenAPIOperation;
  readonly put?: OpenAPIOperation;
  readonly post?: OpenAPIOperation;
  readonly delete?: OpenAPIOperation;
  readonly options?: OpenAPIOperation;
  readonly head?: OpenAPIOperation;
  readonly patch?: OpenAPIOperation;
  readonly trace?: OpenAPIOperation;
  readonly parameters?: readonly OpenAPIParameter[];
}

/**
 * Operation (HTTP method handler).
 */
export interface OpenAPIOperation {
  readonly operationId?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly deprecated?: boolean;
  readonly security?: readonly OpenAPISecurityRequirement[];
  readonly parameters?: readonly OpenAPIParameter[];
  readonly requestBody?: OpenAPIRequestBody;
  readonly responses: OpenAPIResponses;
  readonly externalDocs?: OpenAPIExternalDocs;
}

/**
 * Parameter definition.
 */
export interface OpenAPIParameter {
  readonly name: string;
  readonly in: 'query' | 'header' | 'path' | 'cookie';
  readonly description?: string;
  readonly required?: boolean;
  readonly deprecated?: boolean;
  readonly schema?: JsonSchema;
  readonly style?: string;
  readonly explode?: boolean;
}

/**
 * Request body definition.
 */
export interface OpenAPIRequestBody {
  readonly description?: string;
  readonly required?: boolean;
  readonly content: Record<string, OpenAPIMediaType>;
}

/**
 * Media type (content type) definition.
 */
export interface OpenAPIMediaType {
  readonly schema?: JsonSchema;
  readonly examples?: Record<string, OpenAPIExample>;
}

/**
 * Example value.
 */
export interface OpenAPIExample {
  readonly summary?: string;
  readonly description?: string;
  readonly value?: unknown;
  readonly externalValue?: string;
}

/**
 * Responses object.
 */
export type OpenAPIResponses = Record<string, OpenAPIResponse>;

/**
 * Response definition.
 */
export interface OpenAPIResponse {
  readonly description: string;
  readonly headers?: Record<
    string,
    { readonly schema?: JsonSchema; readonly description?: string }
  >;
  readonly content?: Record<string, OpenAPIMediaType>;
}

/**
 * Components object.
 */
export interface OpenAPIComponents {
  readonly schemas?: Record<string, JsonSchema>;
  readonly responses?: Record<string, OpenAPIResponse>;
  readonly parameters?: Record<string, OpenAPIParameter>;
  readonly requestBodies?: Record<string, OpenAPIRequestBody>;
  readonly headers?: Record<
    string,
    { readonly schema?: JsonSchema; readonly description?: string }
  >;
  readonly securitySchemes?: Record<string, OpenAPISecurityScheme>;
}
