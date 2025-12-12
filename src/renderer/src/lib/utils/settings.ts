import { writable, type Writable } from "svelte/store";
import {
  type Settings as AppSettings,
  SETTINGS_KEYS,
} from "$shared/types/settings";
import { scopedDebugLog, scopeStyle } from "$lib/utils/logger";
import { tick } from "svelte";
import { DEFAULT_SETTINGS } from "$shared/settings";
import { copy } from "$lib/utils/utils";

type SettingStores = {
  [K in keyof AppSettings]: Writable<AppSettings[K]>;
};

class Settings {
  private logScope = {
    name: "Settings",
    style: scopeStyle("#fcdf18", "black"),
  };

  private static instance: Settings;
  readonly settings: SettingStores;

  private loaded = writable(false);

  private constructor() {
    this.settings = {} as SettingStores;

    for (const key of SETTINGS_KEYS) {
      const store = writable(null);

      store.subscribe((value) => {
        try {
          if (value !== null) void this.set(key, copy(value) as never);
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

  private async set<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) {
    if (window.api) return window.api.set(key, value);
    else this.setLocalStorage(key, value);
  }

  private async get<K extends keyof AppSettings>(
    key: K,
  ): Promise<AppSettings[K]> {
    if (window.api) return window.api.get(key);
    else return this.getLocalStorage(key) as AppSettings[K];
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
}

export const settingsService = Settings.getInstance();
export const settings = settingsService.settings;
