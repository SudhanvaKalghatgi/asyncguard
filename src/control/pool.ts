import { runTask } from "../core/runTask";
import {
  RunTaskOptions,
  Task,
} from "../types/runTask.types";

type RejectMode =
  | "throw"
  | "drop";

type PoolOptions = {
  concurrency: number;
  maxQueueSize?: number;
  onReject?: RejectMode;
};

type QueueItem<T> = {
  task: Task<T>;
  options?: RunTaskOptions<T>;
  resolve: (value: T) => void;
  reject: (
    reason?: unknown
  ) => void;
};

export function createPool(
  options: PoolOptions
) {
  const concurrency =
    options.concurrency;

  const maxQueueSize =
    options.maxQueueSize ??
    Infinity;

  const onReject =
    options.onReject ??
    "throw";

  if (
    !Number.isInteger(
      concurrency
    ) ||
    concurrency < 1
  ) {
    throw new Error(
      "concurrency must be an integer >= 1"
    );
  }

  if (
    maxQueueSize !==
      Infinity &&
    (!Number.isInteger(
      maxQueueSize
    ) ||
      maxQueueSize < 0)
  ) {
    throw new Error(
      "maxQueueSize must be an integer >= 0 or Infinity"
    );
  }

  let activeCount = 0;

  const queue:
    QueueItem<any>[] = [];

  const next = () => {
    if (
      activeCount >=
        concurrency ||
      queue.length === 0
    ) {
      return;
    }

    const item =
      queue.shift();

    if (!item) return;

    activeCount++;

    runTask(
      item.task,
      item.options
    )
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        activeCount--;
        next();
      });
  };

  const run = <T>(
    task: Task<T>,
    options?: RunTaskOptions<T>
  ): Promise<T> => {
    if (
      queue.length >=
        maxQueueSize &&
      activeCount >=
        concurrency
    ) {
      if (
        onReject ===
        "drop"
      ) {
        return Promise.reject(
          new Error(
            "Task dropped"
          )
        );
      }

      return Promise.reject(
        new Error(
          "Queue limit reached"
        )
      );
    }

    return new Promise<T>(
      (
        resolve,
        reject
      ) => {
        queue.push({
          task,
          options,
          resolve,
          reject,
        });

        next();
      }
    );
  };

  const stats = () => ({
    activeCount,
    queuedCount:
      queue.length,
    concurrency,
  });

  return {
    run,
    stats,
  };
}