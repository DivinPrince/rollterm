export type DeviceKind = "video" | "audio";

export interface AvDevice {
  index: number;
  name: string;
  kind: DeviceKind;
}

export type PipPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

import type { RecordingPaths } from "./paths";

export type { RecordingPaths };

export interface RecordOptions {
  paths: RecordingPaths;
  screenIndex: number;
  cameraIndex?: number;
  micIndex?: number;
  fps: number;
  duration?: number;
  position: PipPosition;
  cameraSize: string;
  showCursor: boolean;
}

export interface MergeOptions {
  screenPath: string;
  cameraPath: string;
  output: string;
  position: PipPosition;
  cameraSize: string;
  audioPath?: string;
  fps?: number;
  includeCamera?: boolean;
}
