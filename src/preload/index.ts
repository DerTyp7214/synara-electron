import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import {
  CustomApi,
  MprisEventData,
  MprisEventListener,
  MprisEventName,
} from "../shared/types/api";
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
  registerListener(listener: MprisEventListener<MprisEventName>) {
    ipcRenderer.on(
      "mpris-event",
      (
        _: IpcRendererEvent,
        eventData: {
          eventName: MprisEventName;
          data: MprisEventData<MprisEventName>;
        },
      ) => {
        listener(eventData.eventName, eventData.data);
      },
    );
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
