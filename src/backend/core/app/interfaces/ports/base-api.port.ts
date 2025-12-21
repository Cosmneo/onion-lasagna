export interface BaseApiPort<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
