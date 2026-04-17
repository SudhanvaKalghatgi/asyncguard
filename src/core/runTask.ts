import {
  RunTaskOptions,
  Task,
  RunTaskEvent,
} from "../types/runTask.types";

import { calculateBackoffDelay } from "../utils/retry";
import { withTimeout } from "../utils/timeout";
import { safeAwait } from "../utils/safeAwait";

import { RetryExhaustedError } from "../errors/RetryExhaustedError";
import { TimeoutError } from "../errors/TimeoutError";
import { CancellationError } from "../errors/CancellationError";

export async function runTask<T>(
  task: Task<T>,
  options: RunTaskOptions<T> = {}
): Promise<T> {
  const {
    retry,
    timeout,
    fallback,
    signal,
    debug,
    onEvent,
  } = options;

  if (retry) {
    const attempts = retry.attempts;

    if (
      !Number.isFinite(attempts) ||
      !Number.isInteger(attempts) ||
      attempts < 1
    ) {
      throw new Error(
        "retry.attempts must be a finite integer >= 1"
      );
    }
  }

  let attempt = 0;

  const emit = (event: RunTaskEvent) => {
    try {
      onEvent?.(event);

      if (debug) {
        console.log("[asyncguard]", event);
      }
    } catch {
      // observer errors must never break execution
    }
  };

  const startTime = Date.now();

  emit({
    type: "start",
    attempt: 1,
    timestamp: startTime,
  });

  while (true) {
    attempt++;

    const now = Date.now();
    const elapsed = now - startTime;

    if (signal?.aborted) {
      emit({
        type: "cancelled",
        attempt,
        timestamp: now,
      });

      throw new CancellationError(
        attempt,
        elapsed
      );
    }

    let promise = task();

    if (timeout) {
      promise = withTimeout(promise, timeout);
    }

    const [error, result] =
      await safeAwait(promise);

    if (!error) {
      emit({
        type: "success",
        attempt,
        timestamp: Date.now(),
      });

      return result as T;
    }

    const isTimeout =
      error instanceof TimeoutError ||
      (error instanceof Error &&
        error.message ===
          "Operation timed out");

    const maxAttempts =
      retry?.attempts ?? 1;

    if (attempt >= maxAttempts) {
      if (fallback) {
        const [
          fallbackError,
          fallbackResult,
        ] = await safeAwait(
          fallback(error)
        );

        if (!fallbackError) {
          emit({
            type: "success",
            attempt,
            timestamp: Date.now(),
          });

          return fallbackResult as T;
        }

        const isFallbackTimeout =
          fallbackError instanceof TimeoutError ||
          (fallbackError instanceof Error &&
            fallbackError.message ===
              "Operation timed out");

        emit({
          type: isFallbackTimeout
            ? "timeout"
            : "failure",
          attempt,
          timestamp: Date.now(),
          error: fallbackError,
        });

        if (isFallbackTimeout) {
          throw new TimeoutError(
            attempt,
            Date.now() - startTime
          );
        }

        if (retry) {
          throw new RetryExhaustedError(
            attempt,
            Date.now() - startTime,
            fallbackError
          );
        }

        throw fallbackError;
      }

      emit({
        type: isTimeout
          ? "timeout"
          : "failure",
        attempt,
        timestamp: Date.now(),
        error,
      });

      if (isTimeout) {
        throw new TimeoutError(
          attempt,
          Date.now() - startTime
        );
      }

      if (retry) {
        throw new RetryExhaustedError(
          attempt,
          Date.now() - startTime,
          error
        );
      }

      throw error;
    }

    const delay =
      calculateBackoffDelay(
        attempt,
        retry?.backoff
      );

    emit({
      type: "retry",
      attempt,
      timestamp: Date.now(),
      delay,
      error,
    });

    await new Promise((resolve) =>
      setTimeout(resolve, delay)
    );
  }
}