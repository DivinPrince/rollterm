import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RenderBackgroundSettings } from "./config";

export type WallpaperPresetId = "sequoia-sunrise" | "tahoe-light";

export interface WallpaperPreset {
  id: WallpaperPresetId;
  label: string;
  file: string;
}

const assetsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../assets/wallpapers",
);

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: "sequoia-sunrise",
    label: "macOS Sequoia Sunrise",
    file: join(assetsDir, "sequoia-sunrise.png"),
  },
  {
    id: "tahoe-light",
    label: "macOS Tahoe Light",
    file: join(assetsDir, "tahoe-light.png"),
  },
];

export function wallpaperPath(preset: WallpaperPresetId): string {
  const found = WALLPAPER_PRESETS.find((p) => p.id === preset);
  if (!found) {
    throw new Error(`Unknown wallpaper preset: ${preset}`);
  }
  return found.file;
}

export function isWallpaperPreset(value: string): value is WallpaperPresetId {
  return WALLPAPER_PRESETS.some((p) => p.id === value);
}

export function resolveWallpaperPath(
  background: RenderBackgroundSettings,
): string {
  if (background.path) {
    const path = isAbsolute(background.path)
      ? background.path
      : resolve(background.path);
    if (!existsSync(path)) {
      throw new Error(`Wallpaper not found: ${path}`);
    }
    return path;
  }

  const preset = background.preset ?? "sequoia-sunrise";
  return wallpaperPath(preset);
}

export function formatPresetList(): string {
  return WALLPAPER_PRESETS.map((p) => `  ${p.id} — ${p.label}`).join("\n");
}

export function parseWallpaperInput(
  value: string,
): Pick<RenderBackgroundSettings, "preset" | "path"> {
  if (isWallpaperPreset(value)) {
    return { preset: value };
  }

  const path = isAbsolute(value) ? value : resolve(value);
  if (!existsSync(path)) {
    throw new Error(
      `Wallpaper not found: ${path}\nUse a preset (${WALLPAPER_PRESETS.map((p) => p.id).join(", ")}) or a path to an image.`,
    );
  }
  return { path };
}
