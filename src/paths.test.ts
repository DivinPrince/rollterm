import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createRecordingSession } from "./paths";

describe("createRecordingSession", () => {
  test("default session uses uuid folder and standard track names", () => {
    const paths = createRecordingSession();
    expect(paths.dir).toMatch(/rollterm[/\\][0-9a-f-]{36}$/);
    expect(paths.final).toBe(join(paths.dir, "output.mp4"));
    expect(paths.screen).toBe(join(paths.dir, "screen.mp4"));
    expect(paths.camera).toBe(join(paths.dir, "camera.mp4"));
    expect(paths.audio).toBe(join(paths.dir, "audio.m4a"));
  });

  test("bare filename lands in uuid folder", () => {
    const paths = createRecordingSession("demou.mp4");
    expect(paths.dir).toMatch(/rollterm[/\\][0-9a-f-]{36}$/);
    expect(paths.final).toBe(join(paths.dir, "demou.mp4"));
    expect(paths.screen).toBe(join(paths.dir, "screen.mp4"));
  });

  test("explicit directory keeps tracks alongside final file", () => {
    const paths = createRecordingSession("/tmp/clips/clip.mp4");
    expect(paths.dir).toBe("/tmp/clips");
    expect(paths.final).toBe("/tmp/clips/clip.mp4");
    expect(paths.screen).toBe("/tmp/clips/screen.mp4");
    expect(paths.camera).toBe("/tmp/clips/camera.mp4");
    expect(paths.audio).toBe("/tmp/clips/audio.m4a");
  });

  test("ROLLTERM_OUTPUT_DIR is base for uuid sessions", () => {
    const prev = process.env.ROLLTERM_OUTPUT_DIR;
    process.env.ROLLTERM_OUTPUT_DIR = "/tmp/rollterm-test-out";
    try {
      const paths = createRecordingSession();
      expect(paths.dir).toMatch(/^\/tmp\/rollterm-test-out\/[0-9a-f-]{36}$/);
    } finally {
      if (prev === undefined) delete process.env.ROLLTERM_OUTPUT_DIR;
      else process.env.ROLLTERM_OUTPUT_DIR = prev;
    }
  });
});
