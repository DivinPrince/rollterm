import { describe, expect, test } from "bun:test";
import { createCanvas, loadImage } from "canvas";
import { SceneCompositor } from "./compositor";
import { DEFAULT_RENDER_SETTINGS } from "./config";

describe("SceneCompositor wallpaper", () => {
  test("background cover-fits the full canvas", async () => {
    const settings = {
      ...DEFAULT_RENDER_SETTINGS,
      width: 1920,
      height: 1080,
      background: { preset: "sequoia-sunrise" as const },
      screen: { ...DEFAULT_RENDER_SETTINGS.screen, padding: 80 },
    };

    const compositor = new SceneCompositor(settings);
    await compositor.init();
    compositor.setupScreen(1920, 1200);

    const ctx = compositor["screenScratch"].getContext("2d")!;
    ctx.fillStyle = "#224466";
    ctx.fillRect(0, 0, 1920, 1200);

    const frame = compositor.renderFrame();

    // Sample corners of padding — should not be pure black when wallpaper is loaded.
    const w = frame.width;
    const h = frame.height;
    const idx = (y: number, x: number) => (y * w + x) * 4;

    const topLeft = frame.data[idx(10, 10)];
    const topRight = frame.data[idx(10, w - 10)];
    const bottomLeft = frame.data[idx(h - 10, 10)];

    expect(topLeft).toBeGreaterThan(10);
    expect(topRight).toBeGreaterThan(10);
    expect(bottomLeft).toBeGreaterThan(10);

    compositor.destroy();
  });

  test("tahoe wallpaper fills edges after downscale", async () => {
    const path = new URL(
      "../../assets/wallpapers/tahoe-light.png",
      import.meta.url,
    ).pathname;
    const img = await loadImage(path);
    expect(img.width).toBeGreaterThan(4000);

    const settings = {
      ...DEFAULT_RENDER_SETTINGS,
      background: { preset: "tahoe-light" as const },
    };
    const compositor = new SceneCompositor(settings);
    await compositor.init();

    const bg = compositor["bgCanvas"];
    const ctx = bg.getContext("2d")!;
    const data = ctx.getImageData(0, 0, bg.width, bg.height).data;
    const corner = data[0]! + data[1]! + data[2]!;
    expect(corner).toBeGreaterThan(30);

    compositor.destroy();
  });

  test("padding changes screen size", async () => {
    const base = {
      ...DEFAULT_RENDER_SETTINGS,
      width: 1920,
      height: 1080,
      camera: { ...DEFAULT_RENDER_SETTINGS.camera, enabled: false },
    };

    const smallPad = new SceneCompositor({
      ...base,
      screen: { ...DEFAULT_RENDER_SETTINGS.screen, padding: 40 },
    });
    await smallPad.init();
    smallPad.setupScreen(1920, 1200);
    const large = smallPad["screenLayout"] as { width: number; height: number };

    const bigPad = new SceneCompositor({
      ...base,
      screen: { ...DEFAULT_RENDER_SETTINGS.screen, padding: 120 },
    });
    await bigPad.init();
    bigPad.setupScreen(1920, 1200);
    const small = bigPad["screenLayout"] as { width: number; height: number };

    expect(large.width).toBeGreaterThan(small.width);
    expect(large.height).toBeGreaterThan(small.height);

    smallPad.destroy();
    bigPad.destroy();
  });

  test("screen stays centered with equal inset", async () => {
    const settings = {
      ...DEFAULT_RENDER_SETTINGS,
      width: 1920,
      height: 1080,
      screen: { ...DEFAULT_RENDER_SETTINGS.screen, padding: 80 },
    };

    const compositor = new SceneCompositor(settings);
    await compositor.init();
    compositor.setupScreen(1920, 1200);

    const sl = compositor["screenLayout"] as {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    const top = sl.y;
    const bottom = settings.height - sl.y - sl.height;

    expect(Math.abs(top - bottom)).toBeLessThanOrEqual(1);
    expect(top).toBe(80);

    compositor.destroy();
  });
});
