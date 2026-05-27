import type { PipPosition } from "../types";
import type { RolltermConfig } from "./config";
import { parseWallpaperInput } from "./presets";

export interface RenderOverridesInput {
  render?: Partial<RolltermConfig["render"]>;
  rendered?: string;
}

export function parseRenderOverrides(
  values: Record<string, string | boolean | undefined>,
  parsePosition: (value: string | undefined) => PipPosition,
): RenderOverridesInput {
  const overrides: RenderOverridesInput = { render: {} };

  if (values.wallpaper) {
    overrides.render!.background = parseWallpaperInput(String(values.wallpaper));
  }
  if (values.width) overrides.render!.width = Number(values.width);
  if (values.height) overrides.render!.height = Number(values.height);
  if (values.padding !== undefined) {
    overrides.render!.screen = {
      ...(overrides.render!.screen ?? {}),
      padding: Number(values.padding),
    };
  }
  if (values["screen-radius"]) {
    overrides.render!.screen = {
      ...(overrides.render!.screen ?? {}),
      cornerRadius: Number(values["screen-radius"]),
    };
  }
  if (values["camera-size"]) {
    overrides.render!.camera = {
      ...(overrides.render!.camera ?? {}),
      size: Number(values["camera-size"]),
    };
  }
  if (values.position) {
    overrides.render!.camera = {
      ...(overrides.render!.camera ?? {}),
      position: parsePosition(String(values.position)),
    };
  }
  if (values["camera-radius"]) {
    overrides.render!.camera = {
      ...(overrides.render!.camera ?? {}),
      cornerRadius: Number(values["camera-radius"]),
    };
  }
  if (values["camera-margin"]) {
    overrides.render!.camera = {
      ...(overrides.render!.camera ?? {}),
      margin: Number(values["camera-margin"]),
    };
  }
  if (values["no-camera"]) {
    overrides.render!.camera = {
      ...(overrides.render!.camera ?? {}),
      enabled: false,
    };
  }
  if (values.output) {
    overrides.rendered = String(values.output);
  }

  if (
    overrides.render &&
    Object.keys(overrides.render).length === 0 &&
    !overrides.rendered
  ) {
    return {};
  }

  return overrides;
}

export function applyRenderOverrides(
  config: RolltermConfig,
  overrides: RenderOverridesInput = {},
): RolltermConfig {
  return {
    ...config,
    render: {
      ...config.render,
      ...overrides.render,
      background: {
        ...config.render.background,
        ...overrides.render?.background,
      },
      screen: {
        ...config.render.screen,
        ...overrides.render?.screen,
      },
      camera: {
        ...config.render.camera,
        ...overrides.render?.camera,
      },
    },
    rendered: overrides.rendered ?? config.rendered,
  };
}
