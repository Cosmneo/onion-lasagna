/**
 * Base controller interface for the presentation layer.
 *
 * All controllers must implement this interface. The {@link BaseController} class
 * provides a standard request/response pipeline implementation.
 *
 * @typeParam TInput - The input type the controller accepts
 * @typeParam TOutput - The output type the controller returns
 *
 * @example Using BaseController (recommended)
 * ```typescript
 * const controller = BaseController.create({
 *   requestMapper: (req) => CreateUserInputDto.create(req.body),
 *   useCase: createUserUseCase,
 *   responseMapper: (output) => ({ statusCode: 201, body: output.value }),
 * });
 * ```
 *
 * @example Custom implementation
 * ```typescript
 * class MyController implements Controller<MyInput, MyOutput> {
 *   async execute(input: MyInput): Promise<MyOutput> {
 *     // custom logic
 *   }
 * }
 * ```
 */
export interface Controller<TInput = unknown, TOutput = unknown> {
  /**
   * Executes the controller with the given input.
   *
   * @param input - The input to process
   * @returns Promise resolving to the output
   */
  execute(input: TInput): Promise<TOutput>;
}
