export class CancellationError extends Error {
  public attempts: number;
  public elapsed: number;

  constructor(attempts: number, elapsed: number) {
    super("Task was cancelled");

    this.name = "CancellationError";
    this.attempts = attempts;
    this.elapsed = elapsed;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CancellationError);
    }
  }
}