import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import {
  BonjourEventListener,
  CustomApi,
  MprisEventData,
  MprisEventListener,
  MprisEventName,
} from "../shared/types/api";
import { MediaInfo } from "../shared/models/mediaInfo";
import type { Service } from "bonjour-service";
import {
  Settings,
  SettingsAPI,
  TypedArrayBuffer,
} from "../shared/types/settings";

// Custom APIs for renderer
const api: CustomApi & SettingsAPI = {
  updateMpris(mediaInfo: MediaInfo) {
    void ipcRenderer.invoke("media-info-update", mediaInfo);
  },
  updateDiscordRPC(mediaInfo: MediaInfo) {
    ipcRenderer.send("discord-rpc", mediaInfo);
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
  getIsFullScreen: () => ipcRenderer.invoke("get-is-fullscreen"),
  onFullScreenChange: (callback: (isFullscreen: boolean) => void) => {
    const handler = (_: IpcRendererEvent, isFullScreen: boolean) =>
      callback(isFullScreen);
    ipcRenderer.on("fullscreen-status-changed", handler);
    return () =>
      ipcRenderer.removeListener("fullscreen-status-changed", handler);
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
  registerBonjourListener(listener: BonjourEventListener) {
    const ipcListener = (_: IpcRendererEvent, eventData: Service) => {
      listener(eventData);
    };
    ipcRenderer.on("bonjour-event", ipcListener);
    void ipcRenderer.invoke("bonjour-start");

    return () => ipcRenderer.removeListener("bonjour-event", ipcListener);
  },

  get<K extends keyof Settings>(
    key: K,
  ): Promise<TypedArrayBuffer<Settings[K]>> {
    return ipcRenderer.invoke("settings:get", key);
  },
  set<K extends keyof Settings>(key: K, value: TypedArrayBuffer<Settings[K]>) {
    ipcRenderer.send("settings:set", key, value);
  },
  openExternal: (url: string) => ipcRenderer.send("lastfm:open-external", url),
  setBadgeColor: (color: string) => ipcRenderer.send("set-badge-color", color),
  clearBadge: () => ipcRenderer.send("clear-badge"),
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI;
  // @ts-expect-error (define in dts)
  window.api = api;
}
