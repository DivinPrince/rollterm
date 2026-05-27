import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import {
  createConfigFromRecord,
  CONFIG_FILENAME,
  loadConfig,
  writeConfig,
  type RolltermConfig,
  isSessionDir,
} from "./config";
import { applyRenderOverrides, type RenderOverridesInput } from "./overrides";
import { renderSession, type RenderProgress } from "./pipeline";
import type { RecordOptions } from "../types";

export { formatPresetList, parseWallpaperInput } from "./presets";
export { parseRenderOverrides, applyRenderOverrides } from "./overrides";
export type { RenderOverridesInput } from "./overrides";

export function initSessionConfig(options: {
  dir: string;
  paths: {
    final: string;
    screen: string;
    camera: string;
    audio: string;
  };
  record: RecordOptions;
  hasCamera: boolean;
  renderOverrides?: RenderOverridesInput;
}): string {
  const config = applyRenderOverrides(
    createConfigFromRecord({
      dir: options.dir,
      rendered: options.paths.final,
      screen: options.paths.screen,
      camera: options.paths.camera,
      audio: options.paths.audio,
      record: options.record,
      hasCamera: options.hasCamera,
    }),
    options.renderOverrides,
  );
  return writeConfig(options.dir, config);
}

export async function renderFromPath(
  sessionPath: string,
  overrides: RenderOverridesInput = {},
  options: {
    onProgress?: (progress: RenderProgress) => void;
  } = {},
): Promise<string> {
  const config = applyRenderOverrides(loadConfig(sessionPath), overrides);
  return renderSession({
    config,
    onProgress: options.onProgress,
  });
}

export function resolveSessionDir(input: string): string {
  if (existsSync(join(input, CONFIG_FILENAME))) return input;
  if (isSessionDir(input)) return input;
  if (input.endsWith(".json") && existsSync(input)) {
    return input.slice(0, input.lastIndexOf("/"));
  }
  if (existsSync(input)) {
    const parent = input.slice(0, input.lastIndexOf("/"));
    if (existsSync(join(parent, CONFIG_FILENAME)) || isSessionDir(parent)) {
      return parent;
    }
  }
  throw new Error(`No rollterm session found at ${input}`);
}

export function sessionLabel(dir: string): string {
  return basename(dir);
}
