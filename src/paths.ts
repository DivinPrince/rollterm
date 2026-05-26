import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join } from "node:path";

export interface RecordingPaths {
  /** Session folder containing all tracks */
  dir: string;
  final: string;
  screen: string;
  camera: string;
  audio: string;
}

/** Default root folder for new recording sessions */
export function recordingsDir(): string {
  const fromEnv = process.env.ROLLTERM_OUTPUT_DIR?.trim();
  if (fromEnv) {
    mkdirSync(fromEnv, { recursive: true });
    return fromEnv;
  }

  const base =
    process.platform === "darwin"
      ? join(homedir(), "Movies", "rollterm")
      : join(homedir(), "Videos", "rollterm");

  mkdirSync(base, { recursive: true });
  return base;
}

function pathsInDir(dir: string, final: string): RecordingPaths {
  mkdirSync(dir, { recursive: true });
  return {
    dir,
    final,
    screen: join(dir, "screen.mp4"),
    camera: join(dir, "camera.mp4"),
    audio: join(dir, "audio.m4a"),
  };
}

/**
 * Create a session folder. Default: `~/Movies/rollterm/<uuid>/` with
 * `screen.mp4`, `camera.mp4`, `audio.m4a`, and `output.mp4`.
 */
export function createRecordingSession(output?: string): RecordingPaths {
  if (output && (isAbsolute(output) || dirname(output) !== ".")) {
    const dir = dirname(output);
    return pathsInDir(dir, output);
  }

  const dir = join(recordingsDir(), randomUUID());
  const finalName = output ?? "output.mp4";
  return pathsInDir(dir, join(dir, finalName));
}
