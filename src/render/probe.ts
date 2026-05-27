import { resolveFfprobe } from "../ffmpeg";

export interface VideoProbe {
  width: number;
  height: number;
  fps: number;
  duration: number;
  frames: number;
}

export async function probeVideo(path: string): Promise<VideoProbe> {
  const proc = Bun.spawn(
    [
      resolveFfprobe(),
      "-hide_banner",
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,r_frame_rate,avg_frame_rate,nb_frames,duration",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      path,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );

  const [stdout, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(`ffprobe failed for ${path}`);
  }

  const json = JSON.parse(stdout) as {
    streams?: Array<{
      width?: number;
      height?: number;
      r_frame_rate?: string;
      avg_frame_rate?: string;
      nb_frames?: string;
      duration?: string;
    }>;
    format?: { duration?: string };
  };

  const stream = json.streams?.[0];
  if (!stream?.width || !stream?.height) {
    throw new Error(`No video stream in ${path}`);
  }

  const fps = parseFps(
    stream.avg_frame_rate ?? stream.r_frame_rate ?? "30/1",
  );
  const streamDuration = Number(stream.duration ?? 0);
  const formatDuration = Number(json.format?.duration ?? 0);
  const containerDuration = streamDuration || formatDuration || 0;
  const nbFrames = Number(stream.nb_frames ?? 0);
  const frames =
    nbFrames > 0 ? nbFrames : Math.max(1, Math.round(containerDuration * fps));
  // VFR captures often report a longer container than actual frame count.
  const duration =
    nbFrames > 0 && fps > 0 ? nbFrames / fps : containerDuration;

  return {
    width: stream.width,
    height: stream.height,
    fps,
    duration,
    frames,
  };
}

function parseFps(rate: string): number {
  const [num, den] = rate.split("/").map(Number);
  if (!num || !den) return 30;
  return num / den;
}

export async function hasAudioStream(path: string): Promise<boolean> {
  const proc = Bun.spawn(
    [
      resolveFfprobe(),
      "-hide_banner",
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_entries",
      "stream=codec_type",
      "-of",
      "csv=p=0",
      path,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const stdout = await new Response(proc.stdout).text();
  await proc.exited;
  return stdout.trim() === "audio";
}
