/**
 * Base controller interface for the presentation layer.
 *
 * All controllers must implement this interface. The {@link BaseController} class
 * implements this interface and provides a standard request/response pipeline.
 *
 * @typeParam TInput - The input type the controller accepts
 * @typeParam TOutput - The output type the controller returns
 *
 * @example
 * ```typescript
 * // Using BaseController (recommended)
 * const controller = BaseController.create({
 *   requestMapper: (req) => CreateUserInputDto.create(req.body),
 *   useCase: createUserUseCase,
 *   responseMapper: (output) => ({ statusCode: 201, body: output.value }),
 * });
 *
 * // Custom implementation
 * class MyController implements Controller<MyInput, MyOutput> {
 *   async execute(input: MyInput): Promise<MyOutput> {
 *     // custom logic
 *   }
 * }
 * ```
 */
export interface Controller<TInput = unknown, TOutput = unknown> {
  execute(input: TInput): Promise<TOutput>;
}
