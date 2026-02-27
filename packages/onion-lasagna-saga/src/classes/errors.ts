export class CompensationError extends Error {
  public stepName: string;
  public override cause?: Error;

  constructor(stepName: string, cause?: Error) {
    super(`Compensation failed for step "${stepName}": ${cause?.message ?? ''}`);
    this.name = 'CompensationError';
    this.stepName = stepName;
    this.cause = cause;
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class AbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AbortError';
  }
}
