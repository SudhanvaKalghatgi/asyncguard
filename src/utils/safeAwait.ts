export async function safeAwait<T>(
  promise: Promise<T>
): Promise<[error: unknown, result: T | null]> {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    return [error, null];
  }
}