import { existsSync } from "node:fs";
import { runFfmpeg } from "./ffmpeg";
import { buildPipFilter } from "./filters";
import type { MergeOptions } from "./types";

export async function mergeRecording(options: MergeOptions): Promise<number> {
  const fps = String(options.fps ?? 30);
  const hasCamera =
    (options.includeCamera ?? true) && existsSync(options.cameraPath);
  const hasAudio = options.audioPath && existsSync(options.audioPath);

  if (!hasCamera) {
    if (hasAudio) {
      return runFfmpeg([
        "-hide_banner",
        "-i",
        options.screenPath,
        "-i",
        options.audioPath!,
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-y",
        options.output,
      ]);
    }

    const cp = Bun.spawn(["cp", options.screenPath, options.output]);
    await cp.exited;
    return cp.exitCode ?? 1;
  }

  const filter = buildPipFilter(options.position, options.cameraSize);
  const args = [
    "-hide_banner",
    "-i",
    options.screenPath,
    "-i",
    options.cameraPath,
  ];

  if (hasAudio) args.push("-i", options.audioPath!);

  args.push(
    "-filter_complex",
    filter,
    "-map",
    "[v]",
    ...(hasAudio ? ["-map", "2:a"] : ["-map", "0:a?"]),
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-fps_mode",
    "cfr",
    "-r",
    fps,
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    "-y",
    options.output,
  );

  return runFfmpeg(args);
}

/** @deprecated Use mergeRecording */
export async function mergeVideos(options: MergeOptions): Promise<number> {
  return mergeRecording(options);
}

export async function mergeFromCli(options: MergeOptions): Promise<void> {
  console.log(`Merging into ${options.output}...`);
  const code = await mergeRecording(options);
  if (code !== 0) {
    console.error("Merge failed.");
    process.exit(code);
  }
  console.log(`Saved ${options.output}`);
}
