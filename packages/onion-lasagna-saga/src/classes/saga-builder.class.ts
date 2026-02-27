import type { ISagaOptions, IRetryPolicy } from '../interfaces';
import type { MaybePromise } from '../types';
import { Saga } from './saga.class';

type TupleIncludes<TItems extends readonly unknown[], T> = TItems extends readonly [
  infer H,
  ...infer R,
]
  ? [T] extends [H]
    ? true
    : TupleIncludes<R, T>
  : false;

type EnsureUniqueName<Name extends string, Names extends readonly string[]> =
  TupleIncludes<Names, Name> extends true ? never : Name;

export class SagaBuilder<TContext = unknown, TNames extends readonly string[] = []> {
  private saga: Saga<TContext>;

  constructor(options?: ISagaOptions) {
    this.saga = new Saga<TContext>(options);
  }

  public step<Name extends string>(
    name: EnsureUniqueName<Name, TNames>,
    action: (context: TContext, signal?: AbortSignal) => MaybePromise<void>,
    compensation?: (context: TContext, signal?: AbortSignal) => MaybePromise<void>,
    options?: {
      retry?: IRetryPolicy;
      compensationRetry?: IRetryPolicy;
      actionTimeoutMs?: number;
      compensationTimeoutMs?: number;
    },
  ): SagaBuilder<TContext, [...TNames, Name]> {
    this.saga.addStep({
      name: name as string,
      action,
      compensation,
      retry: options?.retry,
      compensationRetry: options?.compensationRetry,
      actionTimeoutMs: options?.actionTimeoutMs,
      compensationTimeoutMs: options?.compensationTimeoutMs,
    });
    return this as unknown as SagaBuilder<TContext, [...TNames, Name]>;
  }

  public build(): Saga<TContext> {
    return this.saga;
  }

  public async execute(context: TContext) {
    return this.saga.execute(context);
  }
}

export function createSaga<TContext = unknown>(options?: ISagaOptions): SagaBuilder<TContext, []> {
  return new SagaBuilder<TContext, []>(options);
}
