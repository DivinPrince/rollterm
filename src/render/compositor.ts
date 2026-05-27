import { createCanvas, loadImage, ImageData, type Canvas } from "canvas";
import type { PipPosition } from "../types";
import type { RenderSettings } from "./config";
import { resolveWallpaperPath } from "./presets";

export interface CompositorFrame {
  width: number;
  height: number;
  data: Uint8Array;
}

interface ScreenLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CameraLayout {
  x: number;
  y: number;
  size: number;
}

const WALLPAPER_MAX = 2560;

export class SceneCompositor {
  private canvas!: Canvas;
  private ctx!: CanvasRenderingContext2D;
  private bgCanvas!: Canvas;
  private screenLayout!: ScreenLayout;
  private cameraLayout!: CameraLayout;
  private screenScratch!: Canvas;
  private cameraScratch!: Canvas;
  private screenW = 0;
  private screenH = 0;
  private cameraW = 0;
  private cameraH = 0;

  constructor(private readonly settings: RenderSettings) {}

  async init(): Promise<void> {
    const { width, height } = this.settings;
    this.canvas = createCanvas(width, height);
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.bgCanvas = createCanvas(width, height);
    await this.paintBackground();
  }

  private async paintBackground(): Promise<void> {
    const path = resolveWallpaperPath(this.settings.background);
    const img = await loadImage(path);
    const ctx = this.bgCanvas.getContext("2d")!;
    const { width, height } = this.settings;

    // Downscale source once for large wallpapers (Tahoe 6K) — keeps cover-fit correct.
    let source = img;
    if (Math.max(img.width, img.height) > WALLPAPER_MAX) {
      const ratio = WALLPAPER_MAX / Math.max(img.width, img.height);
      const tmp = createCanvas(
        Math.round(img.width * ratio),
        Math.round(img.height * ratio),
      );
      tmp.getContext("2d")!.drawImage(img, 0, 0, tmp.width, tmp.height);
      source = tmp as unknown as typeof img;
    }

    const scale = Math.max(width / source.width, height / source.height);
    const drawW = source.width * scale;
    const drawH = source.height * scale;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(
      source,
      (width - drawW) / 2,
      (height - drawH) / 2,
      drawW,
      drawH,
    );
  }

  setupScreen(screenW: number, screenH: number): void {
    this.screenW = screenW;
    this.screenH = screenH;
    this.screenLayout = computeScreenLayout(this.settings, screenW, screenH);
    this.screenScratch = createCanvas(screenW, screenH);
  }

  setupCamera(cameraW: number, cameraH: number): void {
    if (!this.settings.camera.enabled) return;
    this.cameraW = cameraW;
    this.cameraH = cameraH;
    this.cameraLayout = computeCameraLayout(this.settings);
    this.cameraScratch = createCanvas(cameraW, cameraH);
  }

  updateScreenFrame(buffer: Uint8Array): void {
    const ctx = this.screenScratch.getContext("2d")!;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(buffer), this.screenW, this.screenH), 0, 0);
  }

  updateCameraFrame(buffer: Uint8Array): void {
    if (!this.settings.camera.enabled) return;
    const ctx = this.cameraScratch.getContext("2d")!;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(buffer), this.cameraW, this.cameraH), 0, 0);
  }

  renderFrame(): CompositorFrame {
    const ctx = this.ctx;
    const { width, height } = this.settings;
    ctx.drawImage(this.bgCanvas, 0, 0);

    const s = this.settings.screen;
    const sl = this.screenLayout;

    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${s.shadowOpacity})`;
    ctx.shadowBlur = s.shadowBlur;
    ctx.shadowOffsetX = s.shadowOffset;
    ctx.shadowOffsetY = s.shadowOffset;
    roundRect(ctx, sl.x, sl.y, sl.width, sl.height, s.cornerRadius);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRect(ctx, sl.x, sl.y, sl.width, sl.height, s.cornerRadius);
    ctx.clip();
    ctx.drawImage(this.screenScratch, sl.x, sl.y, sl.width, sl.height);
    ctx.restore();

    if (this.settings.camera.enabled && this.cameraScratch) {
      const c = this.settings.camera;
      const cl = this.cameraLayout;
      const radius = Math.min(c.cornerRadius, cl.size / 2);

      ctx.save();
      ctx.shadowColor = `rgba(0,0,0,${c.shadowOpacity})`;
      ctx.shadowBlur = c.shadowBlur;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 6;
      roundRect(ctx, cl.x, cl.y, cl.size, cl.size, radius);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fill();
      ctx.restore();

      ctx.save();
      roundRect(ctx, cl.x, cl.y, cl.size, cl.size, radius);
      ctx.clip();
      ctx.drawImage(this.cameraScratch, cl.x, cl.y, cl.size, cl.size);
      ctx.restore();
    }

    const image = ctx.getImageData(0, 0, width, height);
    return { width, height, data: new Uint8Array(image.data) };
  }

  destroy(): void {
    // canvas GC handles cleanup
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function computeScreenLayout(
  settings: RenderSettings,
  screenW: number,
  screenH: number,
): ScreenLayout {
  const pad = settings.screen.padding;
  const innerW = settings.width - pad * 2;
  const innerH = settings.height - pad * 2;
  const scale = Math.min(innerW / screenW, innerH / screenH);
  const width = Math.round(screenW * scale);
  const height = Math.round(screenH * scale);

  return {
    x: Math.round((settings.width - width) / 2),
    y: Math.round((settings.height - height) / 2),
    width,
    height,
  };
}

function computeCameraLayout(settings: RenderSettings): CameraLayout {
  const { size, margin, position } = settings.camera;
  const { width, height } = settings;

  switch (position as PipPosition) {
    case "bottom-right":
      return { x: width - margin - size, y: height - margin - size, size };
    case "bottom-left":
      return { x: margin, y: height - margin - size, size };
    case "top-right":
      return { x: width - margin - size, y: margin, size };
    case "top-left":
      return { x: margin, y: margin, size };
  }
}
