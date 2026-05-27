import { resolveFfprobe } from "./ffmpeg";

export async function outputLooksValid(path: string): Promise<boolean> {
  try {
    const file = Bun.file(path);
    if (!(await file.exists()) || file.size <= 256) return false;

    const proc = Bun.spawn(
      [
        resolveFfprobe(),
        "-hide_banner",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        path,
      ],
      { stdout: "pipe", stderr: "ignore" },
    );
    const stdout = await new Response(proc.stdout).text();
    const code = await proc.exited;
    if (code !== 0) return false;
    const duration = Number(stdout.trim());
    return Number.isFinite(duration) && duration > 0;
  } catch {
    return false;
  }
}

/** ffmpeg often exits non-zero on Ctrl+C even when the file was written fine */
export async function normalizeStopCode(
  code: number,
  outputPath: string,
): Promise<number> {
  if (code === 0) return 0;
  if (await outputLooksValid(outputPath)) return 0;
  return code;
}
