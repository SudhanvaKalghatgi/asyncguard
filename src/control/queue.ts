import { describe, it, expect } from "vitest";
import { createPool } from "./pool";

const sleep = (ms: number) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

describe("createPool", () => {
  it("should respect concurrency limit", async () => {
    const pool = createPool({
      concurrency: 2,
    });

    let running = 0;
    let maxRunning = 0;

    const task = async () => {
      running++;
      maxRunning = Math.max(
        maxRunning,
        running
      );

      await sleep(50);

      running--;
      return "done";
    };

    await Promise.all([
      pool.run(task),
      pool.run(task),
      pool.run(task),
      pool.run(task),
    ]);

    expect(maxRunning).toBe(2);
  });

  it("should queue tasks and complete all", async () => {
    const pool = createPool({
      concurrency: 1,
    });

    const results =
      await Promise.all([
        pool.run(async () => 1),
        pool.run(async () => 2),
        pool.run(async () => 3),
      ]);

    expect(results).toEqual([
      1, 2, 3,
    ]);
  });

  it("should reject when queue limit is exceeded", async () => {
    const pool = createPool({
      concurrency: 1,
      maxQueueSize: 1,
      onReject: "throw",
    });

    const slowTask = async () => {
      await sleep(100);
      return "done";
    };

    const p1 = pool.run(slowTask);
    const p2 = pool.run(slowTask);

    await expect(
      pool.run(slowTask)
    ).rejects.toThrow(
      "Queue limit reached"
    );

    await Promise.all([
      p1,
      p2,
    ]);
  });

  it("should expose stats", async () => {
    const pool = createPool({
      concurrency: 2,
    });

    const slowTask = async () => {
      await sleep(50);
      return "ok";
    };

    const p1 = pool.run(slowTask);
    const p2 = pool.run(slowTask);
    const p3 = pool.run(slowTask);

    const stats =
      pool.stats();

    expect(
      stats.activeCount
    ).toBe(2);

    expect(
      stats.queuedCount
    ).toBe(1);

    await Promise.all([
      p1,
      p2,
      p3,
    ]);
  });
} );