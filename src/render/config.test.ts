import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  CONFIG_FILENAME,
  createConfigFromRecord,
  DEFAULT_RENDER_SETTINGS,
} from "./config";
import { isWallpaperPreset, WALLPAPER_PRESETS, wallpaperPath } from "./presets";
import type { RecordOptions } from "../types";

describe("render config", () => {
  test("createConfigFromRecord writes relative track paths", () => {
    const dir = "/tmp/session-uuid";
    const record: RecordOptions = {
      paths: {
        dir,
        final: join(dir, "rendered.mp4"),
        screen: join(dir, "screen.mp4"),
        camera: join(dir, "camera.mp4"),
        audio: join(dir, "audio.m4a"),
      },
      screenIndex: 0,
      cameraIndex: 1,
      micIndex: 2,
      fps: 30,
      showCursor: true,
      screenMaxWidth: 1920,
    };

    const config = createConfigFromRecord({
      dir,
      rendered: record.paths.final,
      screen: record.paths.screen,
      camera: record.paths.camera,
      audio: record.paths.audio,
      record,
      hasCamera: true,
    });

    expect(config.tracks.screen).toBe("screen.mp4");
    expect(config.rendered).toBe("rendered.mp4");
    expect(config.render.background.preset).toBe("sequoia-sunrise");
    expect(config.render.camera.enabled).toBe(true);
  });

  test("default render settings match expected layout", () => {
    expect(DEFAULT_RENDER_SETTINGS.width).toBe(1920);
    expect(DEFAULT_RENDER_SETTINGS.height).toBe(1080);
    expect(DEFAULT_RENDER_SETTINGS.screen.padding).toBeGreaterThan(0);
    expect(DEFAULT_RENDER_SETTINGS.screen.cornerRadius).toBeGreaterThan(0);
  });
});

describe("wallpaper presets", () => {
  test("includes macOS sequoia and tahoe presets", () => {
    expect(WALLPAPER_PRESETS.map((p) => p.id)).toEqual([
      "sequoia-sunrise",
      "tahoe-light",
    ]);
  });

  test("preset files exist", () => {
    for (const preset of WALLPAPER_PRESETS) {
      expect(Bun.file(wallpaperPath(preset.id)).size).toBeGreaterThan(0);
    }
  });

  test("isWallpaperPreset validates ids", () => {
    expect(isWallpaperPreset("sequoia-sunrise")).toBe(true);
    expect(isWallpaperPreset("chatgpt")).toBe(false);
  });
});

describe("config filename", () => {
  test("uses rollterm.json", () => {
    expect(CONFIG_FILENAME).toBe("rollterm.json");
  });
});
