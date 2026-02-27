import type { ISagaStep, ISagaResult, ISagaOptions, IRetryPolicy } from '../interfaces';
import type { MaybePromise } from '../types';
import { CompensationError, TimeoutError, AbortError } from './errors';

export class Saga<TContext = unknown> {
  private steps: ISagaStep<TContext>[] = [];
  private options: ISagaOptions;

  constructor(options: ISagaOptions = {}) {
    this.options = {
      continueOnCompensationError: true,
      failOnHookError: false,
      ...options,
    };
  }

  public addStep(step: ISagaStep<TContext>): this {
    this.steps.push(step);
    return this;
  }

  public async execute(context: TContext): Promise<ISagaResult<TContext>> {
    const completedStepsStack: ISagaStep<TContext>[] = [];
    const completedStepsNames: string[] = [];
    const compensatedStepsNames: string[] = [];
    const failedCompensationsNames: string[] = [];
    const stepsToRun = this.steps.slice();

    try {
      for (const step of stepsToRun) {
        try {
          if (this.options.abortSignal?.aborted) {
            throw new AbortError('Saga aborted');
          }

          await this.executeWithRetry(
            async (signal) => {
              await step.action(context, signal);
            },
            step.retry,
            step.actionTimeoutMs,
          );
          completedStepsStack.push(step);
          completedStepsNames.push(step.name);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          let stepFailHookError: Error | undefined;

          if (this.options.onStepFail) {
            try {
              await this.options.onStepFail(step.name, err);
            } catch (hookError) {
              const hookErr = hookError instanceof Error ? hookError : new Error(String(hookError));
              if (this.options.failOnHookError) {
                stepFailHookError = hookErr;
              }
            }
          }

          try {
            const stepsToCompensate = [...completedStepsStack].reverse();
            await this.compensate(
              context,
              stepsToCompensate,
              compensatedStepsNames,
              failedCompensationsNames,
            );
          } catch (compErr) {
            if (compErr instanceof CompensationError) {
              return {
                success: false,
                context,
                error: compErr,
                failedStep: step.name,
                compensationFailedStep: compErr.stepName,
                completedSteps: completedStepsNames,
                compensatedSteps: compensatedStepsNames,
                failedCompensations: failedCompensationsNames,
              };
            }
            const unknownCompErr = compErr instanceof Error ? compErr : new Error(String(compErr));
            return {
              success: false,
              context,
              error: stepFailHookError ?? unknownCompErr,
              failedStep: step.name,
              completedSteps: completedStepsNames,
              compensatedSteps: compensatedStepsNames,
              failedCompensations: failedCompensationsNames,
            };
          }

          return {
            success: false,
            context,
            error: stepFailHookError ?? err,
            failedStep: step.name,
            completedSteps: completedStepsNames,
            compensatedSteps: compensatedStepsNames,
            failedCompensations: failedCompensationsNames,
          };
        }

        if (this.options.onStepComplete) {
          try {
            await this.options.onStepComplete(step.name);
          } catch (hookError) {
            if (this.options.failOnHookError) {
              const err = hookError instanceof Error ? hookError : new Error(String(hookError));
              try {
                const stepsToCompensate = [...completedStepsStack].reverse();
                await this.compensate(
                  context,
                  stepsToCompensate,
                  compensatedStepsNames,
                  failedCompensationsNames,
                );
              } catch (compErr) {
                if (compErr instanceof CompensationError) {
                  return {
                    success: false,
                    context,
                    error: compErr,
                    failedStep: step.name,
                    compensationFailedStep: compErr.stepName,
                    completedSteps: completedStepsNames,
                    compensatedSteps: compensatedStepsNames,
                    failedCompensations: failedCompensationsNames,
                  };
                }
                const unknownCompErr =
                  compErr instanceof Error ? compErr : new Error(String(compErr));
                return {
                  success: false,
                  context,
                  error: unknownCompErr,
                  failedStep: step.name,
                  completedSteps: completedStepsNames,
                  compensatedSteps: compensatedStepsNames,
                  failedCompensations: failedCompensationsNames,
                };
              }

              return {
                success: false,
                context,
                error: err,
                failedStep: step.name,
                completedSteps: completedStepsNames,
                compensatedSteps: compensatedStepsNames,
                failedCompensations: failedCompensationsNames,
              };
            }
          }
        }
      }

      return {
        success: true,
        context,
        completedSteps: completedStepsNames,
        compensatedSteps: [],
        failedCompensations: [],
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      return {
        success: false,
        context,
        error: err,
        completedSteps: completedStepsNames,
        compensatedSteps: compensatedStepsNames,
        failedCompensations: failedCompensationsNames,
      };
    }
  }

  private async compensate(
    context: TContext,
    stepsToCompensate: ISagaStep<TContext>[],
    compensatedStepsNames: string[],
    failedCompensationsNames: string[],
  ): Promise<void> {
    for (const step of stepsToCompensate) {
      if (step.compensation) {
        try {
          await this.executeWithRetry(
            async (signal) => {
              await step.compensation!(context, signal);
            },
            step.compensationRetry,
            step.compensationTimeoutMs,
          );
          compensatedStepsNames.push(step.name);

          if (this.options.onCompensate) {
            try {
              await this.options.onCompensate(step.name);
            } catch (hookError) {
              if (this.options.failOnHookError) {
                const hookErr =
                  hookError instanceof Error ? hookError : new Error(String(hookError));
                throw new CompensationError(step.name, hookErr);
              }
            }
          }
        } catch (compensationError) {
          const err =
            compensationError instanceof Error
              ? compensationError
              : new Error(String(compensationError));

          if (!this.options.continueOnCompensationError) {
            failedCompensationsNames.push(step.name);
            throw new CompensationError(step.name, err);
          }
          failedCompensationsNames.push(step.name);
          if (this.options.onCompensationError) {
            try {
              await this.options.onCompensationError(step.name, err);
            } catch (hookError) {
              if (this.options.failOnHookError) {
                const hookErr =
                  hookError instanceof Error ? hookError : new Error(String(hookError));
                throw new CompensationError(step.name, hookErr);
              }
            }
          }
        }
      }
    }
  }

  private async executeWithRetry(
    attemptFn: (signal?: AbortSignal) => MaybePromise<void>,
    policy?: IRetryPolicy,
    timeoutMs?: number,
  ): Promise<void> {
    const maxAttempts = Math.max(1, policy?.maxAttempts ?? 1);
    const retryOn = policy?.retryOn ?? (() => true);
    const backoff = policy?.backoffMs;
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt < maxAttempts) {
      if (this.options.abortSignal?.aborted) {
        throw new AbortError('Saga aborted');
      }

      attempt += 1;

      const attemptController = new AbortController();
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const globalAbortListener: EventListener = () => {
        attemptController.abort(new AbortError('Saga aborted'));
      };

      if (this.options.abortSignal) {
        this.options.abortSignal.addEventListener('abort', globalAbortListener);
      }

      if (timeoutMs && timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          attemptController.abort(new TimeoutError(`Operation timed out after ${timeoutMs} ms`));
        }, timeoutMs);
      }

      try {
        await attemptFn(attemptController.signal);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (this.options.abortSignal) {
          this.options.abortSignal.removeEventListener('abort', globalAbortListener);
        }
        return;
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (this.options.abortSignal) {
          this.options.abortSignal.removeEventListener('abort', globalAbortListener);
        }

        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;

        if (attemptController.signal.aborted) {
          throw err;
        }

        if (attempt >= maxAttempts || !retryOn(err)) {
          throw err;
        }

        const delayMs = typeof backoff === 'function' ? backoff(attempt) : (backoff ?? 0);
        if (delayMs > 0) {
          await this.delay(delayMs);
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  public reset(): void {
    // No-op in stateless execution mode
  }

  public getSteps(): ReadonlyArray<ISagaStep<TContext>> {
    return Object.freeze([...this.steps]);
  }
}
