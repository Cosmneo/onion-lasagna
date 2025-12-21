import { InfraError } from '../exceptions/infra.error';

type UnknownFn = (...args: unknown[]) => unknown;

const OUTBOUND_WRAPPED_METHODS = Symbol('outboundWrappedMethods');

/**
 * Base class for outbound adapters (secondary ports).
 *
 * It dynamically wraps every instance method (defined in subclasses) with a try/catch,
 * rethrowing as an `InfraError` while preserving the original error as `cause`.
 */
export abstract class BaseOutboundAdapter {
  protected constructor() {
    this.wrapAllSubclassMethods();
  }

  /**
   * Hook for subclasses to customize the error type (e.g. `DbError`, `ExternalServiceError`).
   */
  protected createInfraError(error: unknown, _methodName: string): InfraError {
    return new InfraError({
      message: 'Unexpected outbound adapter error',
      cause: error,
    });
  }

  private wrapAllSubclassMethods(): void {
    const alreadyWrapped = new Set<string>(
      ((this as unknown as { [OUTBOUND_WRAPPED_METHODS]?: string[] })[OUTBOUND_WRAPPED_METHODS] ??
        []) as string[],
    );

    const wrapMethod = (methodName: string, original: UnknownFn) => {
      const wrapped: UnknownFn = (...args: unknown[]) => {
        try {
          const result = Reflect.apply(original, this, args);

          // If it's Promise-like, preserve rejection handling without turning sync methods into async ones.
          if (result && typeof (result as { then?: unknown }).then === 'function') {
            return Promise.resolve(result as PromiseLike<unknown>).catch((error) => {
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
        if (!descriptor || typeof descriptor.value !== 'function') continue;

        wrapMethod(key, descriptor.value as UnknownFn);
        alreadyWrapped.add(key);
      }

      proto = Object.getPrototypeOf(proto);
    }

    (this as unknown as { [OUTBOUND_WRAPPED_METHODS]: string[] })[OUTBOUND_WRAPPED_METHODS] = [
      ...alreadyWrapped,
    ];
  }
}
