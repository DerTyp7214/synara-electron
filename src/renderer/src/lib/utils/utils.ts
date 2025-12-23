// noinspection JSUnusedGlobalSymbols

import { getApiUrl } from "$lib/api/utils";
import { readable } from "svelte/store";
import { debugLog } from "$lib/utils/logger";
import type { UUID } from "node:crypto";
import type { MetadataImage, Song } from "$shared/types/beApi";
import type { OnNavigate } from "@sveltejs/kit";
import type { MaybePromise } from "$lib/types";
import type { SongLikedEventData } from "$lib/audio/queue";

export const blackSvg =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9ImJsYWNrIi8+PC9zdmc+";

export function getProxyUrl(url: string): string {
  const apiBase = getApiUrl();
  if (!apiBase) return undefined as never;

  const proxyUrl = new URL(`/metadata/tidal/proxy/${btoa(url)}`, apiBase);
  return proxyUrl.toString();
}

export function getImageUrl<K extends string | undefined>(
  imageId: K,
  size?: number,
): K extends undefined ? undefined : string {
  if (!imageId) return undefined as never;

  const apiBase = getApiUrl();
  if (!apiBase) return undefined as never;

  const url = new URL(`/image/byId/${imageId}`, apiBase);
  if (size) url.searchParams.set("size", size.toString());
  return url.toString() as never;
}

export function getStreamUrl<K extends string | undefined>(
  songId: K,
  targetBitrate?: number,
): K {
  if (!songId) return undefined as K;

  const apiBase = getApiUrl();
  if (!apiBase) return undefined as K;

  const url = new URL(`/stream/${songId}`, apiBase);
  if (targetBitrate) url.searchParams.set("bitrate", targetBitrate.toString());
  return url.toString() as K;
}

export function getMetadataImage(
  images: Array<MetadataImage>,
  targetSize?: number,
): MetadataImage | undefined {
  if (images.length === 0) return undefined;

  const sorted = [...images].sort((a, b) => a.width - b.width);
  if (targetSize === undefined) return sorted[sorted.length - 1];

  const match = sorted.find((img) => img.width >= targetSize);
  return match ?? sorted[sorted.length - 1];
}

export function openUrl(url: string) {
  if (window.api) window.api.openExternal(url);
  else window.open(url, "_blank");
}

export enum SongOrigin {
  Tidal = "tidal",
  Spotify = "spotify",
}

export function getOrigin(originalUrl: Song["originalUrl"]): SongOrigin | null {
  if (originalUrl.includes("tidal.com")) return SongOrigin.Tidal;
  else if (originalUrl.includes("spotify.com")) return SongOrigin.Spotify;
  return null;
}

export function getOriginalTrackId(originalUrl: Song["originalUrl"]): string {
  const service = getOrigin(originalUrl);

  let trackId = "";
  switch (service) {
    case SongOrigin.Tidal:
      trackId = originalUrl.split("track/")[1].split("/")[0];
  }

  return trackId;
}

export function copy<T>(dataIn: T): T {
  return JSON.parse(JSON.stringify(dataIn)) as T;
}

export function millisecondsToHumanReadable(
  millis: number,
  displayMillis: boolean = false,
): string {
  if (isNaN(millis) || millis < 0) {
    return displayMillis ? "0:00.000" : "0:00";
  }
  const totalSeconds = Math.floor(millis / 1000);
  const milliseconds = millis % 1000;

  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);

  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(String(hours));
    parts.push(String(minutes).padStart(2, "0"));
  } else {
    parts.push(String(minutes));
  }

  parts.push(String(seconds).padStart(2, "0"));

  let result = parts.join(":");

  if (displayMillis) {
    const paddedMillis = String(milliseconds).padStart(3, "0");
    result += `.${paddedMillis}`;
  }

  return result;
}

export function createResizeListener(
  canvas: HTMLCanvasElement,
  callback: ((width: number, height: number) => void) | undefined = undefined,
): () => void {
  const setResolution = (entry: ResizeObserverEntry) => {
    const { clientWidth, clientHeight } = entry.target as HTMLCanvasElement;

    if (callback) callback(clientWidth, clientHeight);
    else {
      canvas.width = clientWidth;
      canvas.height = clientHeight;
    }
  };

  const observer = new ResizeObserver((entries) => {
    if (entries.length > 0) {
      setResolution(entries[0]);
    }
  });

  observer.observe(canvas);

  return () => {
    observer.unobserve(canvas);
    observer.disconnect();
  };
}

export function uuidToId(id: string): string {
  return id.replaceAll("-", "");
}

export function idToUuid<T extends string>(strippedId: T): UUID {
  if (strippedId.length !== 32) {
    debugLog("error", "Input ID must be 32 characters long.");
    return strippedId as UUID;
  }

  return [
    strippedId.slice(0, 8),
    strippedId.slice(8, 12),
    strippedId.slice(12, 16),
    strippedId.slice(16, 20),
    strippedId.slice(20, 32),
  ].join("-") as UUID;
}

export function shuffleArray<T>(array: Array<T>) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function toShuffledArray<T>(array: Array<T>) {
  return shuffleArray(Array.from(array));
}

export function timecodeToMilliseconds(timecodeString: string) {
  const [mainTime, msString] = timecodeString.split(".");

  const parts = mainTime.split(":").map((part) => parseInt(part, 10));

  let totalMilliseconds = 0;

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    totalMilliseconds += hours * 3600 * 1000;
    totalMilliseconds += minutes * 60 * 1000;
    totalMilliseconds += seconds * 1000;
  } else if (parts.length === 2) {
    // Format is MM:SS
    const [minutes, seconds] = parts;
    totalMilliseconds += minutes * 60 * 1000;
    totalMilliseconds += seconds * 1000;
  } else {
    throw new Error("Invalid timecode format.");
  }

  const fractionalMilliseconds = parseInt(msString.padEnd(3, "0"), 10);
  totalMilliseconds += fractionalMilliseconds;

  return totalMilliseconds;
}

export const fullscreen = readable(false, (set) => {
  set(!!document.fullscreenElement);

  const handler = () => {
    set(!!document.fullscreenElement);
  };

  document.addEventListener("fullscreenchange", handler);
  document.addEventListener("webkitfullscreenchange", handler);
  document.addEventListener("mozfullscreenchange", handler);
  document.addEventListener("MSFullscreenChange", handler);

  return () => {
    document.removeEventListener("fullscreenchange", handler);
    document.removeEventListener("webkitfullscreenchange", handler);
    document.removeEventListener("mozfullscreenchange", handler);
    document.removeEventListener("MSFullscreenChange", handler);
  };
});

export const nativeFullscreen = readable(false, (set) => {
  window.api.getIsFullScreen().then(set);

  const handler = (fullscreen: boolean) => {
    set(fullscreen);
  };

  return window.api?.onFullScreenChange(handler);
});

export function invertObject<
  T extends Record<E, B>,
  E extends PropertyKey,
  B extends PropertyKey,
>(sourceObject: T): Record<B, E> {
  return Object.entries(sourceObject).reduce(
    (acc, [key, value]) => {
      acc[value as B] = key as E;
      return acc;
    },
    {} as Record<B, E>,
  );
}

export function invertArray(originalArray: Array<number>) {
  const invertedArray: Array<number> = [];
  for (let i = 0; i < originalArray.length; i++) {
    invertedArray[originalArray[i]] = i;
  }
  return invertedArray;
}

export function distinctBy<T, R>(items: Array<T>, value: (item: T) => R) {
  return [...new Map(items.map((item) => [value(item), item])).values()];
}

export function defaultNavigation(
  navigation: OnNavigate,
): MaybePromise<void | (() => void)> {
  if (!document.startViewTransition) return;

  return new Promise((resolve) => {
    document.startViewTransition(async () => {
      resolve();
      await navigation.complete;
    });
  });
}

export function globalKeydown(
  _: HTMLElement,
  callback: (event: KeyboardEvent, audioInteractiveFocused: boolean) => void,
) {
  const IGNORED_TAGS = ["INPUT", "TEXTAREA", "SELECT"];
  const IGNORED_CLASS = "audio-interactive";

  /** @param {KeyboardEvent} event */
  function handleKeydown(event: KeyboardEvent) {
    const target = event.target;

    if (
      target instanceof HTMLElement &&
      IGNORED_TAGS.includes(target.tagName)
    ) {
      return;
    }

    if (target instanceof HTMLElement && target.isContentEditable) {
      return;
    }

    const isInsideExcludedArea = (target as HTMLElement)?.closest(
      `.${IGNORED_CLASS}`,
    );

    callback(event, !!isInsideExcludedArea);
  }

  document.addEventListener("keydown", handleKeydown);

  return {
    destroy() {
      document.removeEventListener("keydown", handleKeydown);
    },
  };
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type PossiblyUndefined<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] | undefined;
};

export function removeUndefined<T extends Record<string, unknown>>(
  obj: PossiblyUndefined<T>,
): Partial<T> {
  return Object.keys(obj).reduce((newObj, key) => {
    const value = obj[key];

    if (value !== undefined) {
      (newObj as Record<string, unknown>)[key] = value;
    }
    return newObj;
  }, {} as Partial<T>);
}

export const currentTime = readable(Date.now(), function start(set) {
  const interval = setInterval(() => {
    set(Date.now());
  }, 100);

  return function stop() {
    clearInterval(interval);
  };
});

export const { isMac, isLinux, isWindows } = window.api ?? {
  isMac: () => false,
  isLinux: () => true,
  isWindows: () => false,
};

type CustomEventType<K extends keyof WindowEventMap> =
  WindowEventMap[K] extends CustomEvent
    ? WindowEventMap[K]["detail"]
    : WindowEventMap[K];

window.dispatchCustomEvent = function <
  K extends keyof WindowEventMap,
  T extends CustomEventType<K>,
>(event: K, data?: T) {
  window.dispatchEvent(new CustomEvent(event, { detail: data }));
};

window.listenCustomEvent = function <K extends keyof WindowEventMap>(
  key: K,
  callback: (event: WindowEventMap[K]) => void,
) {
  window.addEventListener(key, callback);

  return () => window.removeEventListener(key, callback);
};

declare global {
  interface Window {
    dispatchCustomEvent: <
      K extends keyof WindowEventMap,
      T extends CustomEventType<K>,
    >(
      event: K,
      data?: T,
    ) => void;
    listenCustomEvent: <K extends keyof WindowEventMap>(
      key: K,
      callback: (event: WindowEventMap[K]) => void,
    ) => () => void;
  }
  // noinspection JSUnusedGlobalSymbols
  interface WindowEventMap {
    songLiked: CustomEvent<SongLikedEventData>;
    focusSearch: CustomEvent<Event>;
    replaySong: CustomEvent<Event>;
  }
}
