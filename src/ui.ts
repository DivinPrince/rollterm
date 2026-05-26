import { basename } from "node:path";
import { outputLooksValid } from "./output";

function recordingHint(stderr: string): string | undefined {
  if (/audio format is not supported/i.test(stderr)) {
    return "Retry with --no-mic, or pick another mic: rollterm devices";
  }
  if (/framerate.*is not supported/i.test(stderr)) {
    return "Retry with --fps 30 (FaceTime cameras require 30 fps, not 29.97).";
  }
  if (/NSKVONotifying_AVCaptureScreenInput/i.test(stderr)) {
    return "Install system ffmpeg: brew install ffmpeg (the bundled binary cannot capture screen on this macOS).";
  }
  if (
    /Input\/output error|not authorized|Operation not permitted|Cannot record/i.test(
      stderr,
    )
  ) {
    return "Grant Screen Recording and Camera to your terminal app in System Settings → Privacy & Security.";
  }
  return undefined;
}

export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export async function watchRecording(options: {
  output: string;
  sessionDir?: string;
  duration?: number;
  onStop: () => Promise<number>;
  wait: () => Promise<number>;
  lastError?: () => string;
  artifacts?: () => string[];
}): Promise<number> {
  const start = Date.now();
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  let lastLine = "";

  const halt = () => {
    stopped = true;
    if (timer) clearInterval(timer);
  };

  const render = () => {
    if (stopped) return;
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const limit = options.duration ? ` / ${formatElapsed(options.duration)}` : "";
    const line = `\x1b[31m●\x1b[0m ${formatElapsed(elapsed)}${limit}  (Ctrl+C to stop)`;
    if (line === lastLine) return;
    lastLine = line;
    process.stdout.write(`\r\x1b[K${line}`);
  };

  timer = setInterval(render, 1000);
  render();

  const finish = async (code: number) => {
    halt();
    process.stdout.write("\n");
    const saved = code === 0 || (await outputLooksValid(options.output));
    if (saved) {
      if (options.sessionDir) {
        process.stdout.write(`${options.sessionDir}\n`);
      } else {
        process.stdout.write(`${options.output}\n`);
      }
      const listed: string[] = [];
      for (const file of options.artifacts?.() ?? []) {
        if (file === options.sessionDir || !(await outputLooksValid(file))) {
          continue;
        }
        listed.push(basename(file));
      }
      for (const name of listed) process.stdout.write(`  ${name}\n`);
      return 0;
    }
    process.stdout.write(`Recording exited with code ${code}\n`);
    const detail = options.lastError?.().trim();
    if (detail) {
      process.stdout.write("\nffmpeg:\n");
      process.stdout.write(`${detail}\n`);
      const hint = recordingHint(detail);
      if (hint) process.stdout.write(`\n${hint}\n`);
    }
    return code;
  };

  return new Promise<number>((resolve) => {
    process.once("SIGINT", () => {
      halt();
      process.stdout.write("\nStopping...\n");
      void options.onStop().then(async (code) => {
        const final = await finish(code);
        process.exitCode = final;
        resolve(final);
      });
    });

    void options.wait().then(async (code) => {
      if (!stopped) resolve(await finish(code));
    });
  });
}
