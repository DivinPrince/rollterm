import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { resolveFfmpeg } from "../ffmpeg";
import { SceneCompositor } from "./compositor";
import type { RolltermConfig } from "./config";
import { hasAudioStream, probeVideo } from "./probe";

export interface RenderProgress {
  frame: number;
  total: number;
}

export interface RenderOptions {
  config: RolltermConfig;
  onProgress?: (progress: RenderProgress) => void;
}

class RawVideoReader {
  private proc;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private pending = new Uint8Array(0);
  readonly frameBytes: number;

  constructor(
    path: string,
    width: number,
    height: number,
    fps: number,
    maxFrames: number,
  ) {
    this.frameBytes = width * height * 4;
    this.proc = Bun.spawn(
      [
        resolveFfmpeg(),
        "-hide_banner",
        "-i",
        path,
        "-an",
        "-vf",
        `scale=${width}:${height},fps=${fps}`,
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "-frames:v",
        String(maxFrames),
        "pipe:1",
      ],
      { stdout: "pipe", stderr: "ignore" },
    );
    this.reader = this.proc.stdout?.getReader() ?? null;
  }

  async readFrame(): Promise<Uint8Array | null> {
    while (this.pending.length < this.frameBytes) {
      if (!this.reader) return null;
      const { done, value } = await this.reader.read();
      if (done) {
        if (this.pending.length === 0) return null;
        const frame = new Uint8Array(this.frameBytes);
        frame.set(this.pending);
        this.pending = new Uint8Array(0);
        return frame;
      }
      const merged = new Uint8Array(this.pending.length + value.length);
      merged.set(this.pending);
      merged.set(value, this.pending.length);
      this.pending = merged;
    }

    const frame = this.pending.subarray(0, this.frameBytes);
    this.pending = this.pending.subarray(this.frameBytes);
    return new Uint8Array(frame);
  }

  async close(): Promise<void> {
    try {
      this.reader?.releaseLock();
    } catch {
      /* already released */
    }
    this.proc.kill();
    await this.proc.exited;
  }
}

export async function renderSession(options: RenderOptions): Promise<string> {
  const { config } = options;
  const screenProbe = await probeVideo(config.tracks.screen);
  const hasCamera =
    config.render.camera.enabled && existsSync(config.tracks.camera);
  const cameraProbe = hasCamera
    ? await probeVideo(config.tracks.camera)
    : null;

  const fps = config.render.fps;
  const totalFrames = Math.max(
    1,
    Math.round(screenProbe.duration * fps),
  );

  mkdirSync(dirname(config.rendered), { recursive: true });

  const compositor = new SceneCompositor(config.render);
  await compositor.init();

  const decodeW = Math.min(screenProbe.width, 1280);
  const decodeH = Math.round(decodeW * (screenProbe.height / screenProbe.width));
  compositor.setupScreen(decodeW, decodeH);

  const cameraW = 640;
  const cameraH = cameraProbe
    ? Math.round(cameraW * (cameraProbe.height / cameraProbe.width))
    : 480;
  if (hasCamera) {
    compositor.setupCamera(cameraW, cameraH);
  }

  const screenReader = new RawVideoReader(
    config.tracks.screen,
    decodeW,
    decodeH,
    fps,
    totalFrames,
  );
  const cameraReader = hasCamera
    ? new RawVideoReader(config.tracks.camera, cameraW, cameraH, fps, totalFrames)
    : null;

  const hasAudio =
    existsSync(config.tracks.audio) &&
    (await hasAudioStream(config.tracks.audio));

  const rawPath = join(tmpdir(), `rollterm-${randomUUID()}.rgba`);
  const rawWriter = Bun.file(rawPath).writer();

  let frame = 0;
  while (frame < totalFrames) {
    const screenFrame = await screenReader.readFrame();
    if (!screenFrame) break;

    compositor.updateScreenFrame(screenFrame);

    if (cameraReader) {
      const cameraFrame = await cameraReader.readFrame();
      if (cameraFrame) compositor.updateCameraFrame(cameraFrame);
    }

    rawWriter.write(compositor.renderFrame().data);
    frame += 1;
    options.onProgress?.({ frame, total: totalFrames });
  }

  rawWriter.end();
  await Promise.all([screenReader.close(), cameraReader?.close()]);

  const encoderArgs = [
    resolveFfmpeg(),
    "-hide_banner",
    "-y",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "-s",
    `${config.render.width}x${config.render.height}`,
    "-r",
    String(fps),
    "-i",
    rawPath,
  ];

  if (hasAudio) {
    encoderArgs.push("-i", config.tracks.audio);
  }

  encoderArgs.push(
    "-map",
    "0:v",
    ...(hasAudio ? ["-map", "1:a"] : []),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    ...(hasAudio ? ["-c:a", "aac", "-b:a", "192k", "-shortest"] : ["-an"]),
    config.rendered,
  );

  const encoder = Bun.spawn(encoderArgs, {
    stdout: "ignore",
    stderr: "pipe",
  });
  await encoder.exited;

  try {
    unlinkSync(rawPath);
  } catch {
    /* temp file may already be removed */
  }

  compositor.destroy();

  if ((encoder.exitCode ?? 1) !== 0) {
    const detail = await new Response(encoder.stderr).text();
    throw new Error(`Render encode failed:\n${detail.slice(-800)}`);
  }

  return config.rendered;
}
