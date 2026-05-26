export async function outputLooksValid(path: string): Promise<boolean> {
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) return false;
    return file.size > 4096;
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
