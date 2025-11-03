import { writable, type Writable } from "svelte/store";
import {
  type Settings as AppSettings,
  SETTINGS_KEYS,
} from "$shared/types/settings";
import { debugLog } from "$lib/logger";
import { tick } from "svelte";

type SettingStores = {
  [K in keyof AppSettings]: Writable<AppSettings[K]>;
};

class Settings {
  private static instance: Settings;
  readonly settings: SettingStores;

  private loaded = writable(false);

  private constructor() {
    this.settings = {} as SettingStores;

    for (const key of SETTINGS_KEYS) {
      const store = writable(null);

      store.subscribe((value) => {
        try {
          if (value !== null)
            window.api.set(key, structuredClone(value) as never);
        } catch (e) {
          debugLog("error", "window.api.set", key, "with", value, e);
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
      const value = await window.api.get(key);

      // @ts-expect-error should still work
      this.settings[key]?.set(value);

      debugLog("info", "Settings", "loaded", key, "with", value);
    }

    await tick();

    this.loaded.set(true);
  }
}

export const settingsService = Settings.getInstance();
export const settings = settingsService.settings;
