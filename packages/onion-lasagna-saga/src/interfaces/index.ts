import type { MaybePromise } from '../types';

export type RetryBackoff = number | ((attempt: number) => number);

export interface IRetryPolicy {
  maxAttempts: number;
  backoffMs?: RetryBackoff;
  retryOn?: (error: Error) => boolean;
}

export interface ISagaStep<TContext = unknown> {
  name: string;
  action: (context: TContext, signal?: AbortSignal) => MaybePromise<void>;
  compensation?: (context: TContext, signal?: AbortSignal) => MaybePromise<void>;
  retry?: IRetryPolicy;
  compensationRetry?: IRetryPolicy;
  actionTimeoutMs?: number;
  compensationTimeoutMs?: number;
}

export interface ISagaResult<TContext> {
  success: boolean;
  context: TContext;
  error?: Error;
  failedStep?: string;
  compensationFailedStep?: string;
  completedSteps: string[];
  compensatedSteps: string[];
  failedCompensations: string[];
}

export interface ISagaOptions {
  onStepComplete?: (stepName: string) => MaybePromise<void>;
  onStepFail?: (stepName: string, error: Error) => MaybePromise<void>;
  onCompensate?: (stepName: string) => MaybePromise<void>;
  continueOnCompensationError?: boolean;
  onCompensationError?: (stepName: string, error: Error) => MaybePromise<void>;
  failOnHookError?: boolean;
  abortSignal?: AbortSignal;
}
