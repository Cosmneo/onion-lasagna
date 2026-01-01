/**
 * @fileoverview JSON Schema type definitions for OpenAPI generation.
 *
 * These types represent a subset of JSON Schema Draft 7 that is sufficient
 * for OpenAPI 3.0/3.1 specification generation.
 *
 * @module unified/schema/types/json-schema
 */

/**
 * JSON Schema primitive types.
 */
export type JsonSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

/**
 * String format annotations commonly used in OpenAPI.
 */
export type JsonSchemaStringFormat =
  | 'date-time'
  | 'date'
  | 'time'
  | 'duration'
  | 'email'
  | 'idn-email'
  | 'hostname'
  | 'idn-hostname'
  | 'ipv4'
  | 'ipv6'
  | 'uri'
  | 'uri-reference'
  | 'iri'
  | 'iri-reference'
  | 'uuid'
  | 'json-pointer'
  | 'relative-json-pointer'
  | 'regex'
  | 'binary'
  | 'byte'
  | 'password'
  | (string & {});

/**
 * JSON Schema definition compatible with OpenAPI 3.0/3.1.
 *
 * This is a simplified but comprehensive type that covers the most common
 * schema patterns used in API definitions.
 */
export interface JsonSchema {
  // Schema metadata
  readonly $schema?: string;
  readonly $id?: string;
  readonly $ref?: string;
  readonly $defs?: Readonly<Record<string, JsonSchema>>;
  readonly definitions?: Readonly<Record<string, JsonSchema>>;

  // Type information
  readonly type?: JsonSchemaType | readonly JsonSchemaType[];
  readonly enum?: readonly unknown[];
  readonly const?: unknown;

  // String constraints
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly format?: JsonSchemaStringFormat;

  // Number constraints
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
  readonly multipleOf?: number;

  // Array constraints
  readonly items?: JsonSchema | readonly JsonSchema[];
  readonly additionalItems?: JsonSchema | boolean;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly uniqueItems?: boolean;
  readonly contains?: JsonSchema;

  // Object constraints
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly patternProperties?: Readonly<Record<string, JsonSchema>>;
  readonly additionalProperties?: JsonSchema | boolean;
  readonly required?: readonly string[];
  readonly propertyNames?: JsonSchema;
  readonly minProperties?: number;
  readonly maxProperties?: number;

  // Composition
  readonly allOf?: readonly JsonSchema[];
  readonly anyOf?: readonly JsonSchema[];
  readonly oneOf?: readonly JsonSchema[];
  readonly not?: JsonSchema;

  // Conditional
  readonly if?: JsonSchema;
  readonly then?: JsonSchema;
  readonly else?: JsonSchema;

  // Annotations (for documentation/OpenAPI)
  readonly title?: string;
  readonly description?: string;
  readonly default?: unknown;
  readonly examples?: readonly unknown[];
  readonly deprecated?: boolean;
  readonly readOnly?: boolean;
  readonly writeOnly?: boolean;

  // OpenAPI extensions
  readonly nullable?: boolean;
  readonly discriminator?: {
    readonly propertyName: string;
    readonly mapping?: Readonly<Record<string, string>>;
  };
  readonly xml?: {
    readonly name?: string;
    readonly namespace?: string;
    readonly prefix?: string;
    readonly attribute?: boolean;
    readonly wrapped?: boolean;
  };
  readonly externalDocs?: {
    readonly description?: string;
    readonly url: string;
  };

  // Allow additional properties for extensibility
  readonly [key: `x-${string}`]: unknown;
}
