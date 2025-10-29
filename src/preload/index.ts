import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import { CustomApi } from "../shared/types/api";
import { MediaInfo } from "../shared/models/mediaInfo";

// Custom APIs for renderer
const api: CustomApi = {
  updateMpris(mediaInfo: MediaInfo) {
    void ipcRenderer.invoke("media-info-update", mediaInfo);
  },
  isMac() {
    return process.platform === "darwin";
  },
  isLinux() {
    return process.platform === "linux";
  },
  isWindows() {
    return process.platform === "win32";
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI;
  // @ts-expect-error (define in dts)
  window.api = api;
}
