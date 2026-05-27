import type { PipPosition } from "./types";

/** Video-only capture (mic must be a separate `-i` — combined `V:A` breaks on macOS). */
export function buildAvfoundationVideoInput(videoIndex: number): string {
  return `${videoIndex}:none`;
}

/** Audio-only capture — `none:N` works reliably; `:N` often fails on macOS. */
export function buildAvfoundationMicInput(audioIndex: number): string {
  return `none:${audioIndex}`;
}

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
