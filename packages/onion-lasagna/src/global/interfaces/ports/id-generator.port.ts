/**
 * Port for generating unique identifiers.
 *
 * Abstracts ID generation strategy (UUID v4, ULID, nanoid, etc.)
 * to keep domain and application layers independent of specific implementations.
 *
 * @example
 * ```typescript
 * class UuidV4Generator implements IdGeneratorPort {
 *   generate(): string {
 *     return crypto.randomUUID();
 *   }
 * }
 * ```
 */
export interface IdGeneratorPort {
  generate(): string;
}
