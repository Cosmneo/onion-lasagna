import { InfraError } from '../exceptions/infra.error';

/** @internal Function signature for wrapped methods. */
type UnknownFn = (...args: unknown[]) => unknown;

/** @internal Registry to track which methods have been wrapped per instance. */
const wrappedMethodsRegistry = new WeakMap<BaseOutboundAdapter, Set<string>>();

/**
 * Abstract base class for outbound adapters (secondary/driven ports).
 *
 * Provides automatic error handling for all subclass methods by:
 * - Wrapping synchronous methods with try/catch
 * - Attaching `.catch()` handlers to Promise-returning methods
 * - Converting all errors to {@link InfraError} with the original as `cause`
 *
 * This ensures infrastructure errors are properly typed and don't leak
 * implementation details to the application layer.
 *
 * @example
 * ```typescript
 * class UserRepository extends BaseOutboundAdapter {
 *   constructor(private db: Database) {
 *     super();
 *   }
 *
 *   async findById(id: string): Promise<User | null> {
 *     return this.db.users.findUnique({ where: { id } });
 *   }
 *
 *   protected override createInfraError(error: unknown, methodName: string): InfraError {
 *     return new DbError({
 *       message: `Database error in ${methodName}`,
 *       cause: error,
 *     });
 *   }
 * }
 * ```
 */
export abstract class BaseOutboundAdapter {
  /**
   * Initializes the adapter and wraps all subclass methods with error handling.
   * Must be called via `super()` in subclass constructors.
   */
  protected constructor() {
    this.wrapAllSubclassMethods();
  }

  /**
   * Factory method for creating infrastructure errors.
   *
   * Override this in subclasses to return specific error types
   * (e.g., `DbError`, `NetworkError`, `ExternalServiceError`).
   *
   * @param error - The original error that was caught
   * @param methodName - Name of the method where the error occurred (for debugging)
   * @returns An InfraError instance wrapping the original error
   */
  protected createInfraError(error: unknown, methodName: string): InfraError {
    return new InfraError({
      message: `Outbound adapter error in ${methodName}`,
      cause: error,
    });
  }

  /**
   * Walks the prototype chain and wraps all methods with error handling.
   * @internal
   */
  private wrapAllSubclassMethods(): void {
    const alreadyWrapped = wrappedMethodsRegistry.get(this) ?? new Set<string>();

    const wrapMethod = (methodName: string, original: UnknownFn) => {
      const wrapped: UnknownFn = (...args: unknown[]) => {
        try {
          const result = Reflect.apply(original, this, args);

          // If it's a Promise, preserve rejection handling without turning sync methods into async ones.
          if (result instanceof Promise) {
            return result.catch((error: unknown) => {
              throw this.createInfraError(error, methodName);
            });
          }

          return result;
        } catch (error) {
          throw this.createInfraError(error, methodName);
        }
      };

      Object.defineProperty(this, methodName, {
        value: wrapped,
        writable: false,
        enumerable: false,
        configurable: false,
      });
    };

    // Walk the prototype chain until this base class.
    let proto: object | null = Object.getPrototypeOf(this);
    while (proto && proto !== BaseOutboundAdapter.prototype && proto !== Object.prototype) {
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key === 'constructor' || alreadyWrapped.has(key)) continue;

        const descriptor = Object.getOwnPropertyDescriptor(proto, key);
        if (!descriptor) continue;

        // Skip getters/setters - only wrap regular methods
        if (descriptor.get || descriptor.set) continue;
        if (typeof descriptor.value !== 'function') continue;

        wrapMethod(key, descriptor.value as UnknownFn);
        alreadyWrapped.add(key);
      }

      proto = Object.getPrototypeOf(proto);
    }

    wrappedMethodsRegistry.set(this, alreadyWrapped);
  }
}
