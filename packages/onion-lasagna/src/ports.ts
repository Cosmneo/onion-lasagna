/**
 * @fileoverview Infrastructure port interfaces.
 *
 * Contracts for common infrastructure concerns (logging, caching, email, etc.)
 * that keep application and domain layers independent of specific implementations.
 *
 * @module ports
 *
 * @example
 * ```typescript
 * import { LoggerPort, CachePort } from '@cosmneo/onion-lasagna/ports';
 *
 * class MyUseCase {
 *   constructor(
 *     private readonly logger: LoggerPort,
 *     private readonly cache: CachePort,
 *   ) {}
 * }
 * ```
 */

export type { CachePort, CacheSetOptions } from './global/interfaces/ports/cache.port';
export type { ClockPort } from './global/interfaces/ports/clock.port';
export type { EmailServicePort, EmailMessage } from './global/interfaces/ports/email-service.port';
export type { IdGeneratorPort } from './global/interfaces/ports/id-generator.port';
export type { LoggerPort } from './global/interfaces/ports/logger.port';
export type { UnitOfWorkPort } from './global/interfaces/ports/unit-of-work.port';
