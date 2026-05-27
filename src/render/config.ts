import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import type { PipPosition, RecordOptions } from "../types";
import type { WallpaperPresetId } from "./presets";

export const CONFIG_FILENAME = "rollterm.json";

export interface RenderScreenSettings {
  padding: number;
  cornerRadius: number;
  shadowBlur: number;
  shadowOpacity: number;
  shadowOffset: number;
}

export interface RenderCameraSettings {
  enabled: boolean;
  position: PipPosition;
  size: number;
  cornerRadius: number;
  margin: number;
  shadowBlur: number;
  shadowOpacity: number;
}

export interface RenderBackgroundSettings {
  preset?: WallpaperPresetId;
  /** Custom image path (used when preset is not set) */
  path?: string;
}

export interface RenderSettings {
  width: number;
  height: number;
  fps: number;
  background: RenderBackgroundSettings;
  screen: RenderScreenSettings;
  camera: RenderCameraSettings;
}

export interface RolltermConfig {
  version: 1;
  tracks: {
    screen: string;
    camera: string;
    audio: string;
  };
  /** Polished rendered export */
  rendered: string;
  render: RenderSettings;
  record?: {
    fps: number;
    screenMaxWidth: number;
    showCursor: boolean;
  };
}

export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  background: { preset: "sequoia-sunrise" as WallpaperPresetId },
  screen: {
    padding: 72,
    cornerRadius: 20,
    shadowBlur: 32,
    shadowOpacity: 0.35,
    shadowOffset: 10,
  },
  camera: {
    enabled: true,
    position: "bottom-right",
    size: 240,
    cornerRadius: 999,
    margin: 56,
    shadowBlur: 20,
    shadowOpacity: 0.4,
  },
};

export function configPathForDir(dir: string): string {
  return join(dir, CONFIG_FILENAME);
}

export function createConfigFromRecord(options: {
  dir: string;
  rendered: string;
  screen: string;
  camera: string;
  audio: string;
  record: RecordOptions;
  hasCamera: boolean;
}): RolltermConfig {
  return {
    version: 1,
    tracks: {
      screen: relativeOrBasename(options.dir, options.screen),
      camera: relativeOrBasename(options.dir, options.camera),
      audio: relativeOrBasename(options.dir, options.audio),
    },
    rendered: relativeOrBasename(options.dir, options.rendered),
    render: {
      ...DEFAULT_RENDER_SETTINGS,
      fps: options.record.fps,
      camera: {
        ...DEFAULT_RENDER_SETTINGS.camera,
        enabled: options.hasCamera,
      },
    },
    record: {
      fps: options.record.fps,
      screenMaxWidth: options.record.screenMaxWidth,
      showCursor: options.record.showCursor,
    },
  };
}

function relativeOrBasename(dir: string, path: string): string {
  if (path.startsWith(dir + "/") || path.startsWith(dir + "\\")) {
    return path.slice(dir.length + 1);
  }
  return basename(path);
}

export function writeConfig(dir: string, config: RolltermConfig): string {
  const path = configPathForDir(dir);
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
  return path;
}

export function isSessionDir(dir: string): boolean {
  return existsSync(join(dir, "screen.mp4"));
}

export function inferConfigFromDir(dir: string): RolltermConfig {
  const hasCamera = existsSync(join(dir, "camera.mp4"));
  return {
    version: 1,
    tracks: {
      screen: "screen.mp4",
      camera: "camera.mp4",
      audio: "audio.m4a",
    },
    rendered: "rendered.mp4",
    render: {
      ...DEFAULT_RENDER_SETTINGS,
      camera: {
        ...DEFAULT_RENDER_SETTINGS.camera,
        enabled: hasCamera,
      },
    },
  };
}

export function loadConfig(pathOrDir: string): RolltermConfig {
  const dir = pathOrDir.endsWith(".json") ? dirname(pathOrDir) : pathOrDir;
  const path = configPathForDir(dir);

  if (existsSync(path)) {
    return readConfig(path);
  }

  if (!isSessionDir(dir)) {
    throw new Error(`No rollterm session found at ${dir}`);
  }

  const config = inferConfigFromDir(dir);
  writeConfig(dir, config);
  return normalizeConfig(config, dir);
}

export function readConfig(pathOrDir: string): RolltermConfig {
  const path = pathOrDir.endsWith(".json")
    ? pathOrDir
    : configPathForDir(pathOrDir);

  if (!existsSync(path)) {
    throw new Error(`Config not found: ${path}`);
  }

  const raw = JSON.parse(readFileSync(path, "utf8")) as RolltermConfig;
  return normalizeConfig(raw, dirname(path));
}

function normalizeConfig(
  config: RolltermConfig & { output?: string },
  dir: string,
): RolltermConfig {
  const resolve = (p: string) => (isAbsolute(p) ? p : join(dir, p));
  const renderedPath = config.rendered ?? config.output ?? "rendered.mp4";
  return {
    ...config,
    tracks: {
      screen: resolve(config.tracks.screen),
      camera: resolve(config.tracks.camera),
      audio: resolve(config.tracks.audio),
    },
    rendered: resolve(renderedPath),
    render: {
      ...DEFAULT_RENDER_SETTINGS,
      ...config.render,
      background: {
        ...DEFAULT_RENDER_SETTINGS.background,
        ...config.render?.background,
      },
      screen: {
        ...DEFAULT_RENDER_SETTINGS.screen,
        ...config.render?.screen,
      },
      camera: {
        ...DEFAULT_RENDER_SETTINGS.camera,
        ...config.render?.camera,
      },
    },
  };
}
