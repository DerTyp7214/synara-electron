import { get, writable, type Writable } from "svelte/store";
import {
  type Settings as AppSettings,
  SETTINGS_KEYS,
  type TypedArrayBuffer,
} from "$shared/types/settings";
import { scopedDebugLog, scopeStyle } from "$lib/utils/logger";
import { tick } from "svelte";
import { DEFAULT_SETTINGS } from "$shared/settings";

type SettingStores = {
  [K in keyof AppSettings]: Writable<AppSettings[K]>;
};

interface WorkerRequest {
  resolve: <K extends keyof AppSettings>(
    data: AppSettings[K] | TypedArrayBuffer<AppSettings[K]>,
  ) => void;
  reject: (reason?: unknown) => void;
}

class Settings {
  private logScope = {
    name: "Settings",
    style: scopeStyle("#fcdf18", "black"),
  };

  private static instance: Settings;
  readonly settings: SettingStores;

  private nextRequestId = 0;
  private worker: Worker | undefined;
  private pendingRequests = new Map<number, WorkerRequest>();

  private loaded = writable(false);

  private constructor() {
    this.settings = {} as SettingStores;

    this.setupWorker();

    for (const key of SETTINGS_KEYS) {
      const store = writable(null);

      store.subscribe((value) => {
        try {
          if (value !== null) this.set(key, value as never);
        } catch (e) {
          scopedDebugLog(
            "error",
            this.logScope,
            "window.api.set",
            key,
            "with",
            value,
            e,
          );
        }
      });

      this.settings[key] = store as never;
    }

    void this.loadInitialSettings();
  }

  private setupWorker() {
    this.worker = new Worker(
      new URL("../workers/settings-worker.js", import.meta.url),
      {
        type: "module",
      },
    );

    this.worker.onmessage = <K extends keyof AppSettings>(
      event: MessageEvent<{
        id: number;
        key: K;
        value: AppSettings[K];
        buffer: TypedArrayBuffer<AppSettings[K]>;
      }>,
    ) => {
      const { id, buffer, value } = event.data;
      const request = this.pendingRequests.get(id);
      if (!request) return;

      this.pendingRequests.delete(id);
      request.resolve(value ?? buffer);
    };
  }

  public static getInstance() {
    if (!Settings.instance) {
      Settings.instance = new Settings();
    }
    return Settings.instance;
  }

  public isLoaded() {
    return { subscribe: this.loaded.subscribe };
  }

  private async loadInitialSettings() {
    for (const key of SETTINGS_KEYS) {
      const value = await this.get(key);

      // @ts-expect-error should still work
      this.settings[key]?.set(value);

      scopedDebugLog(
        "info",
        this.logScope,
        "Settings",
        "loaded",
        key,
        "with",
        value,
      );
    }

    await tick();

    this.loaded.set(true);
  }

  private set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    if (!get(this.loaded)) return;
    scopedDebugLog("info", this.logScope, "Settings", "set", key, "to", value);
    if (window.api) this.setApi(key, value);
    else this.setLocalStorage(key, value);
  }

  private async get<K extends keyof AppSettings>(
    key: K,
  ): Promise<AppSettings[K]> {
    if (window.api) return this.getApi(key);
    else return this.getLocalStorage(key) as AppSettings[K];
  }

  private setApi<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    this.communicateWorker("encode", key, value).then((data) => {
      window.api.set(key, data);
    });
  }

  private setLocalStorage<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) {
    try {
      const storage = JSON.parse(localStorage.getItem("appSettings") ?? "{}");

      localStorage.setItem(
        "appSettings",
        JSON.stringify({ ...storage, [key]: value }),
      );
    } catch (e) {
      scopedDebugLog("error", this.logScope, "writing local storage", e);
    }
  }

  private async getApi<K extends keyof AppSettings>(
    key: K,
  ): Promise<AppSettings[K]> {
    return await this.communicateWorker(
      "decode",
      key,
      await window.api.get(key),
    );
  }

  private getLocalStorage<K extends keyof AppSettings>(key: K): AppSettings[K] {
    try {
      return (
        JSON.parse(localStorage.getItem("appSettings") ?? "{}")[key] ??
        DEFAULT_SETTINGS[key]
      );
    } catch (e) {
      scopedDebugLog("error", this.logScope, "loading local storage", e);
      return DEFAULT_SETTINGS[key];
    }
  }

  private async communicateWorker<
    A extends "encode" | "decode",
    K extends keyof AppSettings,
  >(
    action: A,
    key: K,
    data: A extends "decode"
      ? TypedArrayBuffer<AppSettings[K]>
      : AppSettings[K],
  ): Promise<
    A extends "encode" ? TypedArrayBuffer<AppSettings[K]> : AppSettings[K]
  > {
    return new Promise((resolve, reject) => {
      const id = this.nextRequestId++;
      this.pendingRequests.set(id, { resolve: resolve as never, reject });

      this.worker?.postMessage(
        {
          id,
          key,
          type: action,
          data: action === "encode" ? data : undefined,
          buffer: action === "decode" ? data : undefined,
        },
        action === "decode" ? ([data] as Transferable[]) : [],
      );
    });
  }
}

export const settingsService = Settings.getInstance();
export const settings = settingsService.settings;
