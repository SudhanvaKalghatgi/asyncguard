import { describe, it, expect } from "vitest";

import { runTask } from "../src";
import {
  RetryExhaustedError,
  TimeoutError,
  CancellationError,
} from "../src";

describe("runTask", () => {
  it("should succeed immediately", async () => {
    const result = await runTask(async () => "success");

    expect(result).toBe("success");
  });

  it("should retry and then succeed", async () => {
    let attempts = 0;

    const result = await runTask(
      async () => {
        attempts++;

        if (attempts < 3) {
          throw new Error("fail");
        }

        return "success";
      },
      {
        retry: { attempts: 3 },
      }
    );

    expect(result).toBe("success");
    expect(attempts).toBe(3);
  });

  it("should throw RetryExhaustedError after retries fail", async () => {
    await expect(
      runTask(
        async () => {
          throw new Error("always fail");
        },
        {
          retry: { attempts: 3 },
        }
      )
    ).rejects.toBeInstanceOf(
      RetryExhaustedError
    );
  });

  it("should throw TimeoutError", async () => {
    await expect(
      runTask(
        async () =>
          new Promise((resolve) =>
            setTimeout(resolve, 50)
          ),
        {
          timeout: 10,
        }
      )
    ).rejects.toBeInstanceOf(
      TimeoutError
    );
  });

  it("should throw CancellationError when aborted", async () => {
    const controller =
      new AbortController();

    controller.abort();

    await expect(
      runTask(
        async () => "never runs",
        {
          signal: controller.signal,
        }
      )
    ).rejects.toBeInstanceOf(
      CancellationError
    );
  });

  it("should return fallback value on failure", async () => {
    const result = await runTask(
      async () => {
        throw new Error("fail");
      },
      {
        fallback: async () =>
          "fallback-success",
      }
    );

    expect(result).toBe(
      "fallback-success"
    );
  });
});