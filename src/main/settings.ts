import Store, { Schema } from "electron-store";
import {
  APP_SETTINGS_KEYS,
  AppSettings,
  MediaSettings,
  QUEUE_SETTINGS_KEYS,
  QueueSettings,
  TOKEN_SETTINGS_KEYS,
  TokenSettings,
} from "../shared/types/settings";
import { app, ipcMain } from "electron";
import path from "node:path";
import { DEFAULT_SETTINGS } from "../shared/settings";

const schema: Schema<AppSettings> = {
  theme: {
    type: "string",
    default: DEFAULT_SETTINGS["theme"],
  },
  apiBase: {
    type: "string",
    default: DEFAULT_SETTINGS["apiBase"],
  },
  volume: {
    type: "number",
    default: DEFAULT_SETTINGS["volume"],
  },
  hideOnClose: {
    type: "boolean",
    default: DEFAULT_SETTINGS["hideOnClose"],
  },
  discordRpc: {
    type: "boolean",
    default: DEFAULT_SETTINGS["discordRpc"],
  },
  audioVisualizer: {
    type: "object",
    default: DEFAULT_SETTINGS["audioVisualizer"],
  },
  downloadDir: {
    type: "string",
    default: path.join(app.getPath("music"), "synara"),
  },
  locale: {
    type: "string",
    default: app.getLocaleCountryCode().toLowerCase() || "us",
  },
};

const tokenSchema: Schema<TokenSettings> = {
  token: {
    type: "object",
    default: DEFAULT_SETTINGS["token"],
  },
  lastFmTokens: {
    type: "object",
    default: DEFAULT_SETTINGS["lastFmTokens"],
  },
};

const mediaSchema: Schema<MediaSettings> = {
  currentIndex: {
    type: "number",
    default: DEFAULT_SETTINGS["currentIndex"],
  },
  playingSourceType: {
    type: "string",
    default: DEFAULT_SETTINGS["playingSourceType"],
  },
  playingSourceId: {
    type: "string",
    default: DEFAULT_SETTINGS["playingSourceId"],
  },
  shuffle: {
    type: "boolean",
    default: DEFAULT_SETTINGS["shuffle"],
  },
  repeatMode: {
    type: "string",
    default: DEFAULT_SETTINGS["repeatMode"],
  },
};

const queueSchema: Schema<QueueSettings> = {
  queue: {
    type: "array",
    default: DEFAULT_SETTINGS["queue"],
  },
  shuffleMap: {
    type: "array",
    default: DEFAULT_SETTINGS["shuffleMap"],
  },
  lastFmScrobbleQueue: {
    type: "array",
    default: DEFAULT_SETTINGS["lastFmScrobbleQueue"],
  },
};

export const store = new Store({ schema });
export const token = new Store({ schema: tokenSchema, name: "token" });
export const media = new Store({ schema: mediaSchema, name: "media" });
export const queue = new Store({ schema: queueSchema, name: "queue" });

export function setupSettings() {
  ipcMain.handle("settings:get", (_, key) => {
    if (APP_SETTINGS_KEYS.includes(key)) return store.get(key);
    else if (QUEUE_SETTINGS_KEYS.includes(key)) return queue.get(key);
    else if (TOKEN_SETTINGS_KEYS.includes(key)) return token.get(key);
    else return media.get(key);
  });

  ipcMain.handle("settings:set", (_, key, value) => {
    if (value === undefined) return;
    if (APP_SETTINGS_KEYS.includes(key)) return store.set(key, value);
    else if (QUEUE_SETTINGS_KEYS.includes(key)) return queue.set(key, value);
    else if (TOKEN_SETTINGS_KEYS.includes(key)) return token.set(key, value);
    else return media.set(key, value);
  });
}
