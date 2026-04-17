import { Task } from "../types/runTask.types";

export async function raceSuccess<T>(
  tasks: Task<T>[]
): Promise<T> {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error(
      "tasks must be a non-empty array"
    );
  }

  return new Promise<T>((resolve, reject) => {
    let failures = 0;
    const errors: unknown[] = [];
    let settled = false;

    for (const task of tasks) {
      Promise.resolve()
        .then(() => task())
        .then((result) => {
          if (settled) return;

          settled = true;
          resolve(result);
        })
        .catch((error) => {
          failures++;
          errors.push(error);

          if (
            failures === tasks.length &&
            !settled
          ) {
            reject(
              new AggregateError(
                errors,
                "All tasks failed"
              )
            );
          }
        });
    }
  });
}