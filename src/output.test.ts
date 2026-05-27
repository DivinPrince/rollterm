import { describe, expect, test } from "bun:test";
import { resolveFfmpeg } from "./ffmpeg";
import { normalizeStopCode, outputLooksValid } from "./output";

async function writeTestMp4(path: string): Promise<void> {
  const proc = Bun.spawn(
    [
      resolveFfmpeg(),
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=black:s=64x64:d=0.1",
      "-y",
      path,
    ],
    { stdout: "ignore", stderr: "ignore" },
  );
  const code = await proc.exited;
  if (code !== 0) throw new Error("failed to create test mp4");
}

describe("output", () => {
  test("normalizeStopCode accepts interrupted success", async () => {
    const path = `/tmp/rollterm-out-${Date.now()}.mp4`;
    await writeTestMp4(path);
    expect(await normalizeStopCode(1, path)).toBe(0);
  });

  test("outputLooksValid rejects tiny files", async () => {
    const path = `/tmp/rollterm-tiny-${Date.now()}.mp4`;
    await Bun.write(path, "x");
    expect(await outputLooksValid(path)).toBe(false);
  });

  test("outputLooksValid accepts playable mp4", async () => {
    const path = `/tmp/rollterm-valid-${Date.now()}.mp4`;
    await writeTestMp4(path);
    expect(await outputLooksValid(path)).toBe(true);
  });
});
