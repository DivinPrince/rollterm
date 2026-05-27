export const DEFAULT_SCREEN_MAX_WIDTH = 1920;

export type CaptureTrack = "screen" | "camera";

export function screenScaleFilter(maxWidth: number): string {
  return `scale='min(${maxWidth},iw)':-2:flags=bilinear`;
}

export function useHardwareScreenEncode(): boolean {
  return process.platform === "darwin";
}

export function buildVideoEncodeArgs(options: {
  track: CaptureTrack;
  fps: number;
  screenMaxWidth?: number;
}): string[] {
  if (options.track === "screen") {
    return buildScreenEncodeArgs(options);
  }
  return buildCameraEncodeArgs(options);
}

function buildScreenEncodeArgs(options: {
  fps: number;
  screenMaxWidth?: number;
}): string[] {
  const maxWidth = options.screenMaxWidth ?? DEFAULT_SCREEN_MAX_WIDTH;
  const args: string[] = ["-vf", screenScaleFilter(maxWidth)];

  if (useHardwareScreenEncode()) {
    args.push(
      "-c:v",
      "h264_videotoolbox",
      "-b:v",
      "6M",
      "-realtime",
      "1",
      "-allow_sw",
      "1",
      "-prio_speed",
      "1",
      "-pix_fmt",
      "yuv420p",
      // AVFoundation screen timing is variable; normalize to CFR during render.
      "-fps_mode",
      "passthrough",
    );
    return args;
  }

  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-tune",
    "zerolatency",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-fps_mode",
    "passthrough",
  );
  return args;
}

function buildCameraEncodeArgs(options: { fps: number }): string[] {
  return [
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-fps_mode",
    "cfr",
    "-r",
    String(options.fps),
  ];
}
