import { describe, expect, test } from "bun:test";
import { normalizeStopCode, outputLooksValid } from "./output";

describe("output", () => {
  test("normalizeStopCode accepts interrupted success", async () => {
    const path = `/tmp/rollterm-out-${Date.now()}.mp4`;
    await Bun.write(path, "x".repeat(5000));
    expect(await normalizeStopCode(1, path)).toBe(0);
  });

  test("outputLooksValid rejects tiny files", async () => {
    const path = `/tmp/rollterm-tiny-${Date.now()}.mp4`;
    await Bun.write(path, "x");
    expect(await outputLooksValid(path)).toBe(false);
  });
});
