import { describe, expect, test } from "bun:test";
import {
  findCamera,
  findScreen,
  formatDeviceList,
  parseDeviceList,
} from "./devices";
import {
  buildAvfoundationMicInput,
  overlayPosition,
} from "./filters";

const SAMPLE = `
[AVFoundation input device @ 0x7fc749905240] AVFoundation video devices:
[AVFoundation input device @ 0x7fc749905240] [0] FaceTime HD Camera
[AVFoundation input device @ 0x7fc749905240] [1] Capture screen 0
[AVFoundation input device @ 0x7fc749905240] AVFoundation audio devices:
[AVFoundation input device @ 0x7fc749905240] [0] Built-in Microphone
`;

describe("parseDeviceList", () => {
  test("parses video and audio devices", () => {
    const devices = parseDeviceList(SAMPLE);
    expect(devices).toHaveLength(3);
    expect(findScreen(devices)?.index).toBe(1);
    expect(findCamera(devices)?.index).toBe(0);
  });
});

describe("formatDeviceList", () => {
  test("labels screen and camera", () => {
    const text = formatDeviceList(parseDeviceList(SAMPLE));
    expect(text).toContain("(screen)");
    expect(text).toContain("(camera)");
  });
});

describe("filters", () => {
  test("overlay positions", () => {
    expect(overlayPosition("bottom-right")).toBe("main_w-overlay_w-20:main_h-overlay_h-20");
    expect(overlayPosition("top-left")).toBe("20:20");
  });

  test("mic input uses none: index", () => {
    expect(buildAvfoundationMicInput(1)).toBe("none:1");
  });
});
