export class RetryExhaustedError extends Error {
  public attempts: number;
  public elapsed: number;
  public lastError: unknown;

  constructor(attempts: number, elapsed: number, lastError: unknown) {
    super("Retry attempts exhausted");

    this.name = "RetryExhaustedError";
    this.attempts = attempts;
    this.elapsed = elapsed;
    this.lastError = lastError;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RetryExhaustedError);
    }
  }
}