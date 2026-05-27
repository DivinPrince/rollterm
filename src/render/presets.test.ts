import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { existsSync } from "node:fs";
import {
  packageRoot,
  parseWallpaperInput,
  resolveWallpaperPath,
  isWallpaperPreset,
  wallpaperPath,
} from "./presets";

describe("wallpaper input", () => {
  test("packageRoot resolves from source and bundled dist layouts", () => {
    const root = packageRoot();
    expect(existsSync(join(root, "package.json"))).toBe(true);
    expect(existsSync(join(root, "assets/wallpapers/sequoia-sunrise.png"))).toBe(
      true,
    );
  });

  test("preset ids resolve to bundled assets", () => {
    expect(parseWallpaperInput("tahoe-light")).toEqual({ preset: "tahoe-light" });
    expect(resolveWallpaperPath({ preset: "tahoe-light" })).toContain(
      "tahoe-light.png",
    );
    expect(existsSync(wallpaperPath("tahoe-light"))).toBe(true);
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
