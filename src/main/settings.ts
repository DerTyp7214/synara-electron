import Store, { Schema } from "electron-store";
import type Conf from "conf";
import type { Options } from "conf";
import {
  AnySettings,
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
import { decodeArrayBuffer, encodeArrayBuffer } from "../shared/bufferUtils";

if (process.env.NODE_ENV === "development") {
  const devPath = path.join(app.getAppPath(), "dev-config");
  app.setPath("userData", devPath);

  // eslint-disable-next-line no-console
  console.log(`Using development userData path: ${devPath}`);
}

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
  lastFm: {
    type: "boolean",
    default: DEFAULT_SETTINGS["lastFm"],
  },
  cleanTitles: {
    type: "boolean",
    default: DEFAULT_SETTINGS["cleanTitles"],
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
  lastFmSession: {
    type: "object",
    default: DEFAULT_SETTINGS["lastFmSession"],
  },
  listenBrainz: {
    type: "object",
    default: DEFAULT_SETTINGS["listenBrainz"],
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

type BeforeEachMigration<T extends AnySettings> =
  Options<T>["beforeEachMigration"];
type BeforeEachMigrationContext<T extends AnySettings> = Parameters<
  NonNullable<BeforeEachMigration<T>>
>[1];

const beforeEachMigration = <T extends AnySettings>(
  store: Conf<T>,
  context: BeforeEachMigrationContext<T>,
) => {
  // eslint-disable-next-line no-console
  console.log(
    `Migrating [${store.path.split("/").reverse()[0].replace(".json", "")}] from version ${context.fromVersion} to ${context.toVersion}`,
  );
};

export const store = new Store({
  schema,
  beforeEachMigration,
  migrations: {
    "0.0.1": (store) => {
      store.set("debugPhase", true);
    },
  },
});

export const token = new Store({
  schema: tokenSchema,
  name: "token",
  beforeEachMigration,
  migrations: {
    "0.0.1": (store) => {
      store.set("debugPhase", true);
    },
    "1.0.0-2": (store) => {
      store.set("listenBrainz", {
        user: "",
        token: store.get("listenBrainzToken"),
      });
      store.delete("listenBrainzToken" as never);
    },
  },
});

export const media = new Store({
  schema: mediaSchema,
  name: "media",
  beforeEachMigration,
  migrations: {
    "0.0.1": (store) => {
      store.set("debugPhase", true);
    },
  },
});

export const queue = new Store({
  schema: queueSchema,
  name: "queue",
  beforeEachMigration,
  migrations: {
    "0.0.1": (store) => {
      store.set("debugPhase", true);
    },
  },
});

export function setupSettings() {
  ipcMain.handle("settings:get", (_, key) => {
    let data: unknown;

    if (APP_SETTINGS_KEYS.includes(key)) data = store.get(key);
    else if (QUEUE_SETTINGS_KEYS.includes(key)) data = queue.get(key);
    else if (TOKEN_SETTINGS_KEYS.includes(key)) data = token.get(key);
    else data = media.get(key);

    return encodeArrayBuffer(data);
  });

  ipcMain.on("settings:set", (_, key, data) => {
    if (data === undefined) return;

    const value = decodeArrayBuffer(data);

    if (APP_SETTINGS_KEYS.includes(key)) return store.set(key, value);
    else if (QUEUE_SETTINGS_KEYS.includes(key)) return queue.set(key, value);
    else if (TOKEN_SETTINGS_KEYS.includes(key)) return token.set(key, value);
    else return media.set(key, value);
  });
}
