import Store, { Schema } from "electron-store";
import { RepeatMode } from "../shared/models/repeatMode";
import {
  APP_SETTINGS_KEYS,
  AppSettings,
  MediaSettings,
  PlayingSourceType,
  QUEUE_SETTINGS_KEYS,
  QueueSettings,
  TOKEN_SETTINGS_KEYS,
  TokenSettings,
} from "../shared/types/settings";
import { ipcMain } from "electron";

const schema: Schema<AppSettings> = {
  theme: {
    type: "string",
    default: "light",
  },
  apiBase: {
    type: "string",
    default: undefined,
  },
  volume: {
    type: "number",
    default: 50,
  },
  hideOnClose: {
    type: "boolean",
    default: false,
  },
  audioVisualizer: {
    type: "object",
    default: {
      minDecibels: -90,
      maxDecibels: -20,
      smoothingTimeConstant: 0.75,
    },
  },
};

const tokenSchema: Schema<TokenSettings> = {
  token: {
    type: "object",
    default: {},
  },
};

const mediaSchema: Schema<MediaSettings> = {
  currentIndex: {
    type: "number",
    default: -1,
  },
  playingSourceType: {
    type: "string",
    default: PlayingSourceType.LikedSongs,
  },
  playingSourceId: {
    type: "string",
    default: "----",
  },
  shuffle: {
    type: "boolean",
    default: false,
  },
  repeatMode: {
    type: "string",
    default: RepeatMode.None,
  },
};

const queueSchema: Schema<QueueSettings> = {
  queue: {
    type: "array",
    default: [],
  },
  shuffleMap: {
    type: "object",
    default: {},
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
