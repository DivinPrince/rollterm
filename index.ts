#!/usr/bin/env bun
import { parseArgs } from "node:util";
import {
  findCamera,
  findDefaultMic,
  findScreen,
  formatDeviceList,
  listDevices,
} from "./src/devices";
import { isBundledFfmpeg, resolveFfmpeg } from "./src/ffmpeg";
import { mergeFromCli } from "./src/merge";
import { startRecording } from "./src/record";
import type { PipPosition, RecordOptions } from "./src/types";
import { createRecordingSession } from "./src/paths";
import { watchRecording } from "./src/ui";

const HELP = `
rollterm — terminal screen recorder for demos

Usage:
  rollterm devices
  rollterm record [options]
  rollterm merge <screen.mp4> <camera.mp4> [options]

Commands:
  devices   List screens, cameras, and microphones
  record    Record screen with optional camera overlay
  merge     Combine screen + camera (picture-in-picture)

Record options:
  -o, --output <file>       Final video name (default: <uuid>/output.mp4 under ~/Movies/rollterm)
  -s, --screen <index>      Screen device index
  -c, --camera <index>      Camera index (default: first camera)
      --no-camera           Disable camera overlay
  -m, --mic <index>         Microphone index
  --no-mic                  Disable microphone
  --fps <n>                 Frame rate (default: 30)
  --duration <seconds>      Stop after N seconds
  --position <corner>       PiP: bottom-right, bottom-left, top-right, top-left
  --camera-size <WxH>       Camera overlay size (default: 320x240)
  --no-cursor               Hide mouse cursor
  -h, --help                Show help

Examples:
  rollterm devices
  rollterm record -o demo.mp4
  rollterm record --camera 0 --duration 60 -o demo.mp4
  rollterm merge screen.mp4 camera.mp4 -o final.mp4

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
      position: { type: "string" },
      "camera-size": { type: "string" },
      "no-cursor": { type: "boolean" },
      help: { type: "boolean", short: "h" },
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
    position: parsePosition(values.position),
    cameraSize: values["camera-size"] ?? "320x240",
    showCursor: !values["no-cursor"],
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
    onStop: () => handle.stop(),
    wait: () => handle.wait(),
    lastError: () => handle.lastError(),
    artifacts: () => handle.artifacts(),
  });

  if (code !== 0) process.exit(code);
}

async function cmdMerge(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      output: { type: "string", short: "o" },
      position: { type: "string" },
      "camera-size": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(HELP);
    return;
  }

  const [screenPath, cameraPath] = positionals;
  if (!screenPath || !cameraPath) {
    console.error("Usage: rollterm merge <screen.mp4> <camera.mp4> [-o output.mp4]");
    process.exit(1);
  }

  await mergeFromCli({
    screenPath,
    cameraPath,
    output: createRecordingSession(values.output).final,
    position: parsePosition(values.position),
    cameraSize: values["camera-size"] ?? "320x240",
  });
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
    case "merge":
      await cmdMerge(rest);
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
