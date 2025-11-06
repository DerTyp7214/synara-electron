import { App } from "electron";
import { platform } from "@electron-toolkit/utils";

export function setFlags(app: App) {
  app.commandLine.appendSwitch("enable-features", "ParallelDownloading");
  for (const [key, value] of Object.entries(flags)) {
    if (value) {
      flags[key].forEach((flag) => {
        if (flag.handle) setFlag(app, flag.flag, flag.value);
      });
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setFlag(app: App, flag: string, value?: any) {
  app.commandLine.appendSwitch(flag, value);
}

export const flags: {
  [key: string]: { flag: string; value?: string; handle: boolean }[];
} = {
  gpuRasterization: [
    { flag: "enable-gpu-rasterization", value: undefined, handle: true },
  ],
  disableHardwareMediaKeys: [
    {
      flag: "disable-features",
      value: "HardwareMediaKeyHandling",
      handle: platform.isLinux,
    },
  ],
  overlayScrollbar: [
    {
      flag: "enable-features",
      value: "OverlayScrollbar",
      handle: true,
    },
  ],
  enableWaylandSupport: [
    { flag: "enable-features", value: "UseOzonePlatform", handle: true },
    { flag: "ozone-platform-hint", value: "auto", handle: true },
    {
      flag: "enable-features",
      value: "WaylandWindowDecorations",
      handle: true,
    },
  ],
};
