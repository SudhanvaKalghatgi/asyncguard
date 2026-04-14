export type EventType =
  | "start"
  | "retry"
  | "success"
  | "failure"
  | "timeout"
  | "cancelled";

export type RunTaskEvent = {
  type: EventType;
  attempt: number;
  timestamp: number;
  delay?: number;
  error?: unknown;
};

export type BackoffType = "exponential";

export type BackoffOptions = {
  type: BackoffType;
  jitter?: boolean;
  maxDelay?: number;
};

export type RetryOptions = {
  attempts: number; // must be >= 1 (validated at runtime)
  backoff?: BackoffOptions;
};

export type RunTaskOptions<T> = {
  retry?: RetryOptions;
  timeout?: number;
  fallback?: (error: unknown) => Promise<T>;
  signal?: AbortSignal;
  debug?: boolean;
  onEvent?: (event: RunTaskEvent) => void;
};

export type Task<T> = () => Promise<T>;