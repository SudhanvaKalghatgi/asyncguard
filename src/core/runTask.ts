import {
  RunTaskOptions,
  Task,
  RunTaskEvent,
} from "../types/runTask.types";

import { calculateBackoffDelay } from "../utils/retry";
import { withTimeout } from "../utils/timeout";
import { safeAwait } from "../utils/safeAwait";

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
    throw new Error("retry.attempts must be a finite integer >= 1");
  }
}

  let attempt = 0;

  const emit = (event: RunTaskEvent) => {
    try {
      onEvent?.(event);
      if (debug) {
        console.log("[asyncguard]", event);
      }
    } catch {}
  };

  const startTime = Date.now();

  emit({
    type: "start",
    attempt: 1,
    timestamp: startTime,
  });

  while (true) {
    attempt++;

    // cancellation check
    if (signal?.aborted) {
      emit({
        type: "cancelled",
        attempt,
        timestamp: Date.now(),
      });

      const cancellationError = new Error("Task cancelled");
      (cancellationError as any).name = "CancellationError";
      throw cancellationError;
    }

    let promise = task();

    if (timeout) {
      promise = withTimeout(promise, timeout);
    }

    const [error, result] = await safeAwait(promise);

    if (!error) {
      emit({
        type: "success",
        attempt,
        timestamp: Date.now(),
      });
      return result as T;
    }

    const isTimeout =
      error instanceof Error && error.message === "Operation timed out";

    const maxAttempts = retry?.attempts ?? 1;

if (attempt >= maxAttempts) {
  if (fallback) {
    const [fallbackError, fallbackResult] = await safeAwait(
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

    emit({
      type: isTimeout ? "timeout" : "failure",
      attempt,
      timestamp: Date.now(),
      error: fallbackError,
    });

    throw fallbackError;
  }

  emit({
    type: isTimeout ? "timeout" : "failure",
    attempt,
    timestamp: Date.now(),
    error,
  });

  throw error;
}

    const delay = calculateBackoffDelay(attempt, retry?.backoff);

    emit({
      type: "retry",
      attempt,
      timestamp: Date.now(),
      delay,
      error,
    });

    await new Promise((res) => setTimeout(res, delay));
  }
}