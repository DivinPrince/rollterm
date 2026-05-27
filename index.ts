#!/usr/bin/env bun
import { parseArgs } from "node:util";
import {
  findCamera,
  findDefaultMic,
  findScreen,
  formatDeviceList,
  listDevices,
} from "./src/devices";
import { DEFAULT_SCREEN_MAX_WIDTH } from "./src/encode";
import { isBundledFfmpeg, resolveFfmpeg } from "./src/ffmpeg";
import { recordingsDir } from "./src/paths";
import {
  formatPresetList,
  parseRenderOverrides,
  renderFromPath,
  resolveSessionDir,
} from "./src/render";
import { startRecording } from "./src/record";
import type { PipPosition, RecordOptions } from "./src/types";
import { createRecordingSession } from "./src/paths";
import { RenderProgressReporter, watchRecording } from "./src/ui";

const RENDER_OPTIONS = {
  wallpaper: { type: "string" },
  width: { type: "string" },
  height: { type: "string" },
  padding: { type: "string" },
  "screen-radius": { type: "string" },
  position: { type: "string" },
  "camera-size": { type: "string" },
  "camera-radius": { type: "string" },
  "camera-margin": { type: "string" },
  "no-camera": { type: "boolean" },
} as const;

const HELP = `
rollterm — terminal screen recorder for demos

Usage:
  rollterm devices
  rollterm record [options]
  rollterm render <session-dir> [options]

Commands:
  devices   List screens, cameras, and microphones
  record    Record screen + camera, then render automatically
  render    Re-render a session with different settings

Record options:
  -o, --output <file>       Output video (default: <uuid>/rendered.mp4)
  -s, --screen <index>      Screen device index
  -c, --camera <index>      Camera index (default: first camera)
      --no-camera           Disable camera capture and render
  -m, --mic <index>         Microphone index
      --no-mic              Disable microphone
      --fps <n>             Frame rate (default: 30)
      --duration <seconds>  Stop after N seconds
      --screen-width <px>   Max screen encode width (default: 1920)
      --no-cursor           Hide mouse cursor
      --tracks-only         Save raw tracks only; skip render
  -h, --help                Show help

Render options (record + render commands):
  --wallpaper <preset|path> Background preset or path to an image
  --width <px>              Canvas width (default: 1920)
  --height <px>             Canvas height (default: 1080)
  --padding <px>            Inset around screen (default: 72)
  --screen-radius <px>      Screen corner radius (default: 20)
  --position <corner>       Camera corner: bottom-right, bottom-left, top-right, top-left
  --camera-size <px>        Camera bubble diameter (default: 240)
  --camera-radius <px>      Camera corner radius — use 999 for circle (default: 999)
  --camera-margin <px>      Camera inset from canvas edge (default: 56)

Wallpaper presets:
${formatPresetList()}

Session layout (~/Movies/rollterm/<uuid>/):
  screen.mp4    camera.mp4    audio.m4a
  rollterm.json   rendered.mp4

Examples:
  rollterm devices
  rollterm record
  rollterm record --wallpaper tahoe-light --padding 40
  rollterm record --tracks-only
  rollterm render ~/Movies/rollterm/<uuid> --position top-left

macOS: allow Screen Recording + Camera for your terminal in System Settings.
`.trim();

function parsePosition(value: string | undefined): PipPosition {
  const allowed: PipPosition[] = [
    "bottom-right",
    "bottom-left",
    "top-right",
    "top-left",
  ];
  if (value && allowed.includes(value as PipPosition)) {
    return value as PipPosition;
  }
  if (value) {
    console.error(`Invalid position "${value}". Use: ${allowed.join(", ")}`);
    process.exit(1);
  }
  return "bottom-right";
}

async function cmdDevices(): Promise<void> {
  const devices = await listDevices();
  if (devices.length === 0) {
    console.error("No AVFoundation devices found.");
    process.exit(1);
  }
  console.log(formatDeviceList(devices));
  const screen = findScreen(devices);
  const camera = findCamera(devices);
  const mic = findDefaultMic(devices);
  console.log("");
  console.log("Defaults:");
  if (screen) console.log(`  screen: [${screen.index}] ${screen.name}`);
  if (camera) console.log(`  camera: [${camera.index}] ${camera.name}`);
  if (mic) console.log(`  mic:    [${mic.index}] ${mic.name}`);
}

async function cmdRecord(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      output: { type: "string", short: "o" },
      screen: { type: "string", short: "s" },
      camera: { type: "string", short: "c" },
      mic: { type: "string", short: "m" },
      "no-camera": { type: "boolean" },
      "no-mic": { type: "boolean" },
      fps: { type: "string" },
      duration: { type: "string" },
      "screen-width": { type: "string" },
      "no-cursor": { type: "boolean" },
      "tracks-only": { type: "boolean" },
      help: { type: "boolean", short: "h" },
      ...RENDER_OPTIONS,
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(HELP);
    return;
  }

  const devices = await listDevices();
  const screen = findScreen(devices);
  const camera = findCamera(devices);
  const defaultMic = findDefaultMic(devices);

  if (!screen) {
    console.error("No screen capture device found. Run `rollterm devices`.");
    process.exit(1);
  }

  const paths = createRecordingSession(values.output);
  const renderOverrides = parseRenderOverrides(values, parsePosition);
  const progress = new RenderProgressReporter();

  const options: RecordOptions = {
    paths,
    screenIndex: values.screen ? Number(values.screen) : screen.index,
    cameraIndex: values["no-camera"]
      ? undefined
      : values.camera !== undefined
        ? Number(values.camera)
        : camera?.index,
    micIndex: values["no-mic"]
      ? undefined
      : values.mic !== undefined
        ? Number(values.mic)
        : defaultMic?.index,
    fps: values.fps ? Number(values.fps) : 30,
    duration: values.duration ? Number(values.duration) : undefined,
    screenMaxWidth: values["screen-width"]
      ? Number(values["screen-width"])
      : DEFAULT_SCREEN_MAX_WIDTH,
    showCursor: !values["no-cursor"],
    render: renderOverrides,
    skipRender: values["tracks-only"] ?? false,
    onRenderProgress: (update) => progress.update(update),
  };

  const ffmpegPath = resolveFfmpeg();
  if (isBundledFfmpeg(ffmpegPath)) {
    console.log(
      "Tip: brew install ffmpeg — the bundled binary cannot capture screen on macOS.\n",
    );
  }

  const handle = await startRecording(options);
  const code = await watchRecording({
    output: paths.final,
    sessionDir: paths.dir,
    duration: options.duration,
    requireOutput: !options.skipRender,
    onStop: () => handle.stop(),
    wait: () => handle.wait(),
    lastError: () => handle.lastError(),
    artifacts: () => handle.artifacts(),
  });

  if (code !== 0) process.exit(code);
}

async function cmdRender(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      output: { type: "string", short: "o" },
      help: { type: "boolean", short: "h" },
      ...RENDER_OPTIONS,
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(HELP);
    return;
  }

  const sessionArg = positionals[0] ?? recordingsDir();
  let sessionDir: string;
  try {
    sessionDir = resolveSessionDir(sessionArg);
  } catch {
    console.error(
      `Usage: rollterm render <session-dir> [--wallpaper sequoia-sunrise]\n\nRecordings root: ${recordingsDir()}`,
    );
    process.exit(1);
  }

  const renderOverrides = parseRenderOverrides(values, parsePosition);
  const progress = new RenderProgressReporter();
  const start = Date.now();

  const output = await renderFromPath(sessionDir, renderOverrides, {
    onProgress: (update) => progress.update(update),
  });

  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Saved ${output} (${secs}s)`);
}

async function main(): Promise<void> {
  const [command, ...rest] = Bun.argv.slice(2);

  if (!command || command === "-h" || command === "--help") {
    console.log(HELP);
    return;
  }

  switch (command) {
    case "devices":
      await cmdDevices();
      return;
    case "record":
      await cmdRecord(rest);
      return;
    case "render":
      await cmdRender(rest);
      return;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
