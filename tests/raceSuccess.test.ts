import { describe, it, expect } from "vitest";
import { raceSuccess } from "../src";

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe("raceSuccess", () => {
  it("should return first successful result", async () => {
    const result = await raceSuccess([
      async () => {
        await sleep(50);
        return "slow";
      },
      async () => {
        await sleep(10);
        return "fast";
      },
    ]);

    expect(result).toBe("fast");
  });

  it("should ignore failed tasks if one succeeds", async () => {
    const result = await raceSuccess([
      async () => {
        throw new Error("fail");
      },
      async () => "success",
    ]);

    expect(result).toBe("success");
  });

  it("should throw AggregateError if all fail", async () => {
    await expect(
      raceSuccess([
        async () => {
          throw new Error("a");
        },
        async () => {
          throw new Error("b");
        },
      ])
    ).rejects.toBeInstanceOf(
      AggregateError
    );
  });

  it("should throw on empty task list", async () => {
    await expect(
      raceSuccess([])
    ).rejects.toThrow(
      "tasks must be a non-empty array"
    );
  });
});