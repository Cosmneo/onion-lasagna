/**
 * Outbound port for structured logging.
 *
 * Implementations handle the actual log output (e.g., Pino, Winston, console).
 *
 * @example
 * ```typescript
 * class PinoLogger implements LoggerPort {
 *   private pino: pino.Logger;
 *
 *   debug(msg: string, data?: Record<string, unknown>): void {
 *     this.pino.debug(data ?? {}, msg);
 *   }
 *
 *   info(msg: string, data?: Record<string, unknown>): void {
 *     this.pino.info(data ?? {}, msg);
 *   }
 *
 *   warn(msg: string, data?: Record<string, unknown>): void {
 *     this.pino.warn(data ?? {}, msg);
 *   }
 *
 *   error(msg: string, data?: Record<string, unknown>): void {
 *     this.pino.error(data ?? {}, msg);
 *   }
 *
 *   child(bindings: Record<string, unknown>): LoggerPort {
 *     return new PinoLogger(this.pino.child(bindings));
 *   }
 * }
 * ```
 */
export interface LoggerPort {
  /** Log at debug level. */
  debug(msg: string, data?: Record<string, unknown>): void;

  /** Log at info level. */
  info(msg: string, data?: Record<string, unknown>): void;

  /** Log at warn level. */
  warn(msg: string, data?: Record<string, unknown>): void;

  /** Log at error level. */
  error(msg: string, data?: Record<string, unknown>): void;

  /** Create a child logger with additional context bindings. */
  child(bindings: Record<string, unknown>): LoggerPort;
}
