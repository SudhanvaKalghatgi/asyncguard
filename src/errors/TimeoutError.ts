export class TimeoutError extends Error {
  public attempts: number;
  public elapsed: number;

  constructor(attempts: number, elapsed: number) {
    super("Operation timed out");

    this.name = "TimeoutError";
    this.attempts = attempts;
    this.elapsed = elapsed;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError);
    }
  }
}