import { buildVideoEncodeArgs } from "./encode";
import { resolveFfmpeg } from "./ffmpeg";
import {
  buildAvfoundationMicInput,
  buildAvfoundationVideoInput,
} from "./filters";
import { initSessionConfig, renderFromPath } from "./render";
import { normalizeStopCode, outputLooksValid } from "./output";
import type { RecordOptions } from "./types";

export interface RecordingHandle {
  stop: () => Promise<number>;
  wait: () => Promise<number>;
  lastError: () => string;
  artifacts: () => string[];
}

export async function startRecording(
  options: RecordOptions,
): Promise<RecordingHandle> {
  return startSeparateRecording(options);
}

async function startSeparateRecording(
  options: RecordOptions,
): Promise<RecordingHandle> {
  const paths = options.paths;
  const procs: ReturnType<typeof spawnRecording>[] = [];

  const screenArgs = globalArgs([
    "-thread_queue_size",
    "1024",
    ...screenAvfoundationInput(options),
    "-i",
    buildAvfoundationVideoInput(options.screenIndex),
    ...buildVideoEncodeArgs({
      track: "screen",
      fps: options.fps,
      screenMaxWidth: options.screenMaxWidth,
    }),
    "-an",
  ]);
  if (options.duration) screenArgs.push("-t", String(options.duration));
  screenArgs.push("-y", paths.screen);
  procs.push(spawnRecording(screenArgs, paths.screen));

  if (options.cameraIndex !== undefined) {
    const cameraArgs = globalArgs([
      "-thread_queue_size",
      "1024",
      ...cameraAvfoundationInput(options),
      "-i",
      buildAvfoundationVideoInput(options.cameraIndex),
      ...buildVideoEncodeArgs({ track: "camera", fps: options.fps }),
      "-an",
    ]);
    if (options.duration) cameraArgs.push("-t", String(options.duration));
    cameraArgs.push("-y", paths.camera);
    procs.push(spawnRecording(cameraArgs, paths.camera));
  }

  if (options.micIndex !== undefined) {
    const micArgs = globalArgs([
      "-thread_queue_size",
      "1024",
      ...micAvfoundationInput(),
      "-i",
      buildAvfoundationMicInput(options.micIndex),
      "-ar",
      "48000",
      "-ac",
      "1",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
    ]);
    if (options.duration) micArgs.push("-t", String(options.duration));
    micArgs.push("-y", paths.audio);
    procs.push(spawnRecording(micArgs, paths.audio));
  }

  const requiredTracks = async (): Promise<boolean> => {
    if (!(await outputLooksValid(paths.screen))) {
      process.stderr.write("Screen track missing or incomplete.\n");
      return false;
    }
    if (
      options.cameraIndex !== undefined &&
      !(await outputLooksValid(paths.camera))
    ) {
      process.stderr.write("Camera track missing or incomplete.\n");
      return false;
    }
    return true;
  };

  const audioTrackReady = () => outputLooksValid(paths.audio);

  const artifacts = (): string[] => [
    paths.dir,
    paths.final,
    paths.screen,
    paths.camera,
    paths.audio,
  ];

  const finalize = async (): Promise<number> => {
    initSessionConfig({
      dir: paths.dir,
      paths,
      record: options,
      hasCamera: options.cameraIndex !== undefined,
      renderOverrides: options.render,
    });

    if (options.skipRender) return 0;

    try {
      await renderFromPath(paths.dir, options.render ?? {}, {
        onProgress: options.onRenderProgress,
      });
      return (await outputLooksValid(paths.final)) ? 0 : 1;
    } catch (error) {
      process.stderr.write(
        `\nRender failed: ${error instanceof Error ? error.message : error}\n`,
      );
      return 1;
    }
  };

  const stopAllAndRender = async (): Promise<number> => {
    await Promise.all(procs.map((p) => p.stop()));
    if (!(await requiredTracks())) return 1;
    return finalize();
  };

  return {
    stop: stopAllAndRender,
    wait: async () => {
      await Promise.all(procs.map((p) => p.wait()));
      if (!(await requiredTracks())) return 1;
      return finalize();
    },
    lastError: () =>
      procs
        .map((p) => p.lastError())
        .filter(Boolean)
        .join("\n"),
    artifacts,
  };
}

function globalArgs(rest: string[]): string[] {
  return ["-hide_banner", ...rest];
}

function screenAvfoundationInput(options: RecordOptions): string[] {
  const args = [
    "-framerate",
    String(options.fps),
    "-pixel_format",
    "uyvy422",
    "-f",
    "avfoundation",
  ];
  if (options.showCursor) args.unshift("-capture_cursor", "1");
  return args;
}

function cameraAvfoundationInput(options: RecordOptions): string[] {
  return [
    "-framerate",
    String(options.fps),
    "-pixel_format",
    "uyvy422",
    "-f",
    "avfoundation",
  ];
}

function micAvfoundationInput(): string[] {
  return ["-f", "avfoundation"];
}

function spawnRecording(args: string[], outputPath: string): RecordingHandle {
  const stderrLines: string[] = [];
  const proc = Bun.spawn([resolveFfmpeg(), ...args], {
    stdout: "ignore",
    stderr: "pipe",
    stdin: "pipe",
  });

  void captureStderr(proc.stderr, stderrLines);

  const lastError = () =>
    stderrLines
      .filter((line) => !/^\s*$/.test(line))
      .slice(-12)
      .join("\n");

  const wait = async () =>
    normalizeStopCode((await proc.exited) ?? 1, outputPath);

  const stop = async () => {
    if (proc.exitCode !== null) {
      return await normalizeStopCode(proc.exitCode ?? 0, outputPath);
    }

    try {
      proc.stdin.write("q\n");
      proc.stdin.end();
    } catch {
      proc.kill("SIGINT");
    }

    const exited = await Promise.race([
      proc.exited,
      Bun.sleep(8000).then(async () => {
        proc.kill("SIGTERM");
        return (await proc.exited) ?? 1;
      }),
    ]);

    await Bun.sleep(500);
    return await normalizeStopCode(exited ?? 1, outputPath);
  };

  return { stop, wait, lastError, artifacts: () => [outputPath] };
}

async function captureStderr(
  stream: ReadableStream<Uint8Array>,
  lines: string[],
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let pending = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const parts = pending.split("\n");
    pending = parts.pop() ?? "";
    for (const part of parts) lines.push(part);
  }

  if (pending) lines.push(pending);
}
