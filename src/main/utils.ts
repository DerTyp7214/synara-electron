import { App } from "electron";

export function setFlags(app: App) {
  app.commandLine.appendSwitch("enable-features", "ParallelDownloading");
  for (const [key, value] of Object.entries(flags)) {
    if (value) {
      flags[key].forEach((flag) => {
        setFlag(app, flag.flag, flag.value);
      });
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setFlag(app: App, flag: string, value?: any) {
  app.commandLine.appendSwitch(flag, value);
}

export const flags: { [key: string]: { flag: string; value?: string }[] } = {
  gpuRasterization: [{ flag: "enable-gpu-rasterization", value: undefined }],
  disableHardwareMediaKeys: [
    { flag: "disable-features", value: "HardwareMediaKeyHandling" },
  ],
  enableWaylandSupport: [
    { flag: "enable-features", value: "UseOzonePlatform" },
    { flag: "ozone-platform-hint", value: "auto" },
    { flag: "enable-features", value: "WaylandWindowDecorations" },
  ],
};
