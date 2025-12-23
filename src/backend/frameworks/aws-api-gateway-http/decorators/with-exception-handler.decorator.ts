import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { withExceptionHandler } from '../middlewares/with-exception-handler.middleware';

/**
 * Decorator to apply exception handling to a Lambda handler method.
 *
 * This decorator wraps a class method with the same exception handling logic
 * as `withExceptionHandler`, making it easier to use with class-based handlers.
 *
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * class UserController {
 *   @WithExceptionHandler()
 *   async handle(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
 *     const result = await this.useCase.execute(input);
 *     return mapResponse({ statusCode: 200, body: result });
 *   }
 * }
 * ```
 */
export function WithExceptionHandler() {
  return function (
    _target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void {
    const originalMethod = descriptor.value;

    if (typeof originalMethod !== 'function') {
      throw new Error(
        `@WithExceptionHandler can only be applied to methods, but ${String(propertyKey)} is not a function`,
      );
    }

    const wrappedHandler = withExceptionHandler(async (event: APIGatewayProxyEventV2) => {
      return originalMethod.call(_target, event);
    });

    descriptor.value = async function (
      event: APIGatewayProxyEventV2,
      context?: Context,
    ): Promise<APIGatewayProxyResultV2> {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const result = await wrappedHandler(event, context ?? ({} as Context), () => {});
      return result ?? { statusCode: 204, body: '' };
    };
  };
}
