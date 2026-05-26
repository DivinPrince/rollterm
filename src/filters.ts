import type { PipPosition } from "./types";

export function overlayPosition(position: PipPosition, margin = 20): string {
  switch (position) {
    case "bottom-right":
      return `main_w-overlay_w-${margin}:main_h-overlay_h-${margin}`;
    case "bottom-left":
      return `${margin}:main_h-overlay_h-${margin}`;
    case "top-right":
      return `main_w-overlay_w-${margin}:${margin}`;
    case "top-left":
      return `${margin}:${margin}`;
  }
}

export function buildPipFilter(
  position: PipPosition,
  cameraSize: string,
  margin = 20,
): string {
  const [width] = cameraSize.split("x");
  const scale = width ? `scale=${width}:-1` : "scale=320:-1";
  const pos = overlayPosition(position, margin);
  return `[1:v]${scale}[cam];[0:v][cam]overlay=${pos}[v]`;
}

/** Video-only capture (mic must be a separate `-i` — combined `V:A` breaks on macOS). */
export function buildAvfoundationVideoInput(videoIndex: number): string {
  return `${videoIndex}:none`;
}

/** Audio-only capture — `none:N` works reliably; `:N` often fails on macOS. */
export function buildAvfoundationMicInput(audioIndex: number): string {
  return `none:${audioIndex}`;
}
