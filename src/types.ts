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
import type { RenderOverridesInput } from "./render/overrides";

export type { RecordingPaths };

export interface RecordOptions {
  paths: RecordingPaths;
  screenIndex: number;
  cameraIndex?: number;
  micIndex?: number;
  fps: number;
  duration?: number;
  showCursor: boolean;
  /** Max encoded screen width; full Retina capture is scaled down before encode. */
  screenMaxWidth: number;
  render?: RenderOverridesInput;
  skipRender?: boolean;
  onRenderProgress?: (progress: { frame: number; total: number }) => void;
}
