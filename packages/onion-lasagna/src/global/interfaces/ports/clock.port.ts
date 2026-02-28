/**
 * Outbound port for time provision.
 *
 * Abstracts `new Date()` behind an interface for testability.
 * Inject this into domain services and use cases instead of calling `new Date()` directly.
 *
 * @example
 * ```typescript
 * // Production implementation
 * class SystemClock implements ClockPort {
 *   now(): Date {
 *     return new Date();
 *   }
 * }
 *
 * // Test implementation
 * class FakeClock implements ClockPort {
 *   constructor(private fixedDate: Date) {}
 *
 *   now(): Date {
 *     return new Date(this.fixedDate.getTime());
 *   }
 *
 *   advance(ms: number): void {
 *     this.fixedDate = new Date(this.fixedDate.getTime() + ms);
 *   }
 * }
 * ```
 */
export interface ClockPort {
  /** Returns the current date and time. */
  now(): Date;
}
