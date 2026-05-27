import { describe, expect, test } from "bun:test";
import {
  buildVideoEncodeArgs,
  DEFAULT_SCREEN_MAX_WIDTH,
  screenScaleFilter,
  useHardwareScreenEncode,
} from "./encode";

describe("screenScaleFilter", () => {
  test("caps width while preserving aspect ratio", () => {
    expect(screenScaleFilter(1920)).toBe(
      "scale='min(1920,iw)':-2:flags=bilinear",
    );
  });
});

describe("buildVideoEncodeArgs", () => {
  test("screen track scales and keeps passthrough timing during capture", () => {
    const args = buildVideoEncodeArgs({
      track: "screen",
      fps: 30,
      screenMaxWidth: 1280,
    });

    expect(args).toContain("-vf");
    expect(args).toContain(screenScaleFilter(1280));
    expect(args).toContain("-fps_mode");
    expect(args[args.indexOf("-fps_mode") + 1]).toBe("passthrough");
    expect(args).not.toContain("-r");
  });

  test("camera track keeps CFR at requested fps", () => {
    const args = buildVideoEncodeArgs({ track: "camera", fps: 30 });

    expect(args).toContain("-fps_mode");
    expect(args[args.indexOf("-fps_mode") + 1]).toBe("cfr");
    expect(args).toContain("-r");
    expect(args[args.indexOf("-r") + 1]).toBe("30");
  });

  test("screen defaults to 1920 max width", () => {
    const args = buildVideoEncodeArgs({ track: "screen", fps: 30 });
    expect(args).toContain(screenScaleFilter(DEFAULT_SCREEN_MAX_WIDTH));
  });

  test("uses hardware encoder on macOS", () => {
    if (!useHardwareScreenEncode()) return;

    const args = buildVideoEncodeArgs({ track: "screen", fps: 30 });
    expect(args).toContain("h264_videotoolbox");
    expect(args).toContain("-b:v");
    expect(args[args.indexOf("-b:v") + 1]).toBe("6M");
    expect(args).not.toContain("-q:v");
    expect(args).toContain("-prio_speed");
    expect(args).toContain("-realtime");
    expect(args[args.indexOf("-realtime") + 1]).toBe("1");
  });
});
