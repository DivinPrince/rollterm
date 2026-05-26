import type { AvDevice } from "./types";
import { resolveFfmpeg } from "./ffmpeg";

const VIDEO_HEADER = "AVFoundation video devices:";
const AUDIO_HEADER = "AVFoundation audio devices:";
const DEVICE_RE = /\[\s*(\d+)\s*\]\s+(.+)$/;

export async function listDevices(): Promise<AvDevice[]> {
  const proc = Bun.spawn(
    [resolveFfmpeg(), "-f", "avfoundation", "-list_devices", "true", "-i", ""],
    { stdout: "pipe", stderr: "pipe" },
  );

  const stderr = await new Response(proc.stderr).text();
  await proc.exited;

  return parseDeviceList(stderr);
}

export function parseDeviceList(output: string): AvDevice[] {
  const devices: AvDevice[] = [];
  let section: "video" | "audio" | null = null;

  for (const line of output.split("\n")) {
    if (line.includes(VIDEO_HEADER)) {
      section = "video";
      continue;
    }
    if (line.includes(AUDIO_HEADER)) {
      section = "audio";
      continue;
    }

    const match = line.trim().match(DEVICE_RE);
    if (!match || !section) continue;

    devices.push({
      index: Number(match[1]),
      name: match[2]!.trim(),
      kind: section,
    });
  }

  return devices;
}

export function findScreen(devices: AvDevice[]): AvDevice | undefined {
  return devices.find(
    (d) => d.kind === "video" && /capture screen/i.test(d.name),
  );
}

export function findCamera(devices: AvDevice[]): AvDevice | undefined {
  return devices.find(
    (d) =>
      d.kind === "video" &&
      !/capture screen/i.test(d.name) &&
      /camera|facetime|webcam/i.test(d.name),
  );
}

export function findDefaultMic(devices: AvDevice[]): AvDevice | undefined {
  return devices.find(
    (d) =>
      d.kind === "audio" &&
      /built-in microphone|microphone/i.test(d.name),
  );
}

export function formatDeviceList(devices: AvDevice[]): string {
  const video = devices.filter((d) => d.kind === "video");
  const audio = devices.filter((d) => d.kind === "audio");

  const lines = ["Video devices:", ...video.map(formatLine), "", "Audio devices:", ...audio.map(formatLine)];
  return lines.join("\n");
}

function formatLine(device: AvDevice): string {
  const tag =
    device.kind === "video" && /capture screen/i.test(device.name)
      ? " (screen)"
      : device.kind === "video"
        ? " (camera)"
        : "";
  return `  [${device.index}] ${device.name}${tag}`;
}
