import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { existsSync } from "node:fs";

const SYSTEM_PATHS = [
  "/opt/homebrew/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
  "/usr/bin/ffmpeg",
];

export function resolveFfmpeg(): string {
  const fromEnv = process.env.ROLLTERM_FFMPEG?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const onPath = Bun.which("ffmpeg");
  if (onPath) return onPath;

  for (const path of SYSTEM_PATHS) {
    if (existsSync(path)) return path;
  }

  return ffmpegInstaller.path;
}

export function isBundledFfmpeg(path = resolveFfmpeg()): boolean {
  return path.includes("ffmpeg-installer");
}

export function resolveFfprobe(): string {
  const fromEnv = process.env.ROLLTERM_FFPROBE?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const onPath = Bun.which("ffprobe");
  if (onPath) return onPath;

  const ffmpeg = resolveFfmpeg();
  const sibling = ffmpeg.replace(/ffmpeg([^/\\]*)$/, "ffprobe$1");
  if (sibling !== ffmpeg && existsSync(sibling)) return sibling;

  return ffmpeg;
}

export async function runFfmpeg(
  args: string[],
  options: { signal?: AbortSignal; onStderr?: (line: string) => void } = {},
): Promise<number> {
  const proc = Bun.spawn([resolveFfmpeg(), ...args], {
    stdout: "pipe",
    stderr: "pipe",
    signal: options.signal,
  });

  const stderr = await new Response(proc.stderr).text();
  await proc.exited;
  if (options.onStderr) {
    for (const line of stderr.split("\n")) options.onStderr(line);
  }
  return proc.exitCode ?? 1;
}
