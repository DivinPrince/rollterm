import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  parseWallpaperInput,
  resolveWallpaperPath,
  isWallpaperPreset,
} from "./presets";

describe("wallpaper input", () => {
  test("preset ids resolve to bundled assets", () => {
    expect(parseWallpaperInput("tahoe-light")).toEqual({ preset: "tahoe-light" });
    expect(resolveWallpaperPath({ preset: "tahoe-light" })).toContain(
      "tahoe-light.png",
    );
  });

  test("custom path is accepted when file exists", () => {
    const path = join(
      import.meta.dir,
      "../../assets/wallpapers/sequoia-sunrise.png",
    );
    expect(parseWallpaperInput(path)).toEqual({ path });
    expect(resolveWallpaperPath({ path })).toBe(path);
  });

  test("unknown preset and missing path fail", () => {
    expect(isWallpaperPreset("chatgpt")).toBe(false);
    expect(() => parseWallpaperInput("not-a-real-file.png")).toThrow(
      /Wallpaper not found/,
    );
  });
});
