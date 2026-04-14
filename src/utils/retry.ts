import { BackoffOptions } from "../types/runTask.types";

const DEFAULT_BASE_DELAY = 100; // ms
const DEFAULT_MAX_DELAY = 30000; // 30 seconds

export function calculateBackoffDelay(
  attempt: number,
  options?: BackoffOptions
): number {
  const baseDelay = DEFAULT_BASE_DELAY;
  const maxDelay = options?.maxDelay ?? DEFAULT_MAX_DELAY;

  let delay = baseDelay * Math.pow(2, attempt - 1);

  delay = Math.min(delay, maxDelay);

  if (options?.jitter) {
    delay = Math.random() * delay;
  }

  return delay;
}