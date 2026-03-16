/**
 * @fileoverview AsyncAPI types for specification generation.
 *
 * @module events/asyncapi/types
 */

import type { JsonSchema } from '../../http/schema/types';

// ============================================================================
// AsyncAPI 3.0 Config (Input)
// ============================================================================

/**
 * AsyncAPI specification configuration.
 */
export interface AsyncAPIConfig {
  /**
   * AsyncAPI specification version.
   * @default '3.0.0'
   */
  readonly asyncapi?: '3.0.0';

  /**
   * API information.
   */
  readonly info: AsyncAPIInfo;

  /**
   * Server configurations (e.g., message broker details).
   */
  readonly servers?: Record<string, AsyncAPIServer>;

  /**
   * Default content type for messages.
   * @default 'application/json'
   */
  readonly defaultContentType?: string;

  /**
   * Custom tags with descriptions.
   */
  readonly tags?: readonly AsyncAPITag[];

  /**
   * External documentation.
   */
  readonly externalDocs?: AsyncAPIExternalDocs;
}

/**
 * API information.
 */
export interface AsyncAPIInfo {
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
  };
  readonly tags?: readonly AsyncAPITag[];
}

/**
 * Server configuration (message broker).
 */
export interface AsyncAPIServer {
  readonly host: string;
  readonly protocol: string;
  readonly protocolVersion?: string;
  readonly pathname?: string;
  readonly description?: string;
  readonly tags?: readonly AsyncAPITag[];
}

/**
 * Tag definition.
 */
export interface AsyncAPITag {
  readonly name: string;
  readonly description?: string;
  readonly externalDocs?: AsyncAPIExternalDocs;
}

/**
 * External documentation.
 */
export interface AsyncAPIExternalDocs {
  readonly url: string;
  readonly description?: string;
}

// ============================================================================
// AsyncAPI 3.0 Specification (Output)
// ============================================================================

/**
 * Complete AsyncAPI 3.0 specification.
 */
export interface AsyncAPISpec {
  readonly asyncapi: string;
  readonly info: AsyncAPIInfo;
  readonly servers?: Record<string, AsyncAPIServer>;
  readonly defaultContentType?: string;
  readonly channels?: Record<string, AsyncAPIChannel>;
  readonly operations?: Record<string, AsyncAPIOperation>;
  readonly components?: AsyncAPIComponents;
  readonly externalDocs?: AsyncAPIExternalDocs;
}

/**
 * Channel definition (represents an event type).
 */
export interface AsyncAPIChannel {
  readonly address?: string;
  readonly messages?: Record<string, AsyncAPIMessage>;
  readonly description?: string;
  readonly tags?: readonly AsyncAPITag[];
}

/**
 * Message definition (event payload).
 */
export interface AsyncAPIMessage {
  readonly name?: string;
  readonly title?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly contentType?: string;
  readonly payload?: JsonSchema;
  readonly tags?: readonly AsyncAPITag[];
  readonly deprecated?: boolean;
}

/**
 * Operation definition (subscribe action).
 */
export interface AsyncAPIOperation {
  readonly action: 'send' | 'receive';
  readonly channel: { readonly $ref: string };
  readonly summary?: string;
  readonly description?: string;
  readonly tags?: readonly AsyncAPITag[];
  readonly deprecated?: boolean;
  readonly messages?: readonly { readonly $ref: string }[];
}

/**
 * Components object for reusable definitions.
 */
export interface AsyncAPIComponents {
  readonly schemas?: Record<string, JsonSchema>;
  readonly messages?: Record<string, AsyncAPIMessage>;
  readonly channels?: Record<string, AsyncAPIChannel>;
}
