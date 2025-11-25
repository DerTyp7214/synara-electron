// noinspection JSUnusedGlobalSymbols

import { getApiUrl } from "$lib/api/utils";
import { readable } from "svelte/store";
import { debugLog } from "$lib/logger";
import type { UUID } from "node:crypto";
import type { Song } from "$shared/types/beApi";
import type { OnNavigate } from "@sveltejs/kit";
import type { MaybePromise } from "$lib/types";

export function getImageUrl<K extends string | undefined>(
  imageId: K,
  size?: number,
): K {
  if (!imageId) return undefined as K;

  const apiBase = getApiUrl();
  if (!apiBase) return undefined as K;

  const url = new URL(`/image/byId/${imageId}`, apiBase);
  if (size) url.searchParams.set("size", size.toString());
  return url.toString() as K;
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

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);

  ctx.closePath();
  ctx.fill();
}

export function createResizeListener(canvas: HTMLCanvasElement): () => void {
  const setResolution = (entry: ResizeObserverEntry) => {
    const { clientWidth, clientHeight } = entry.target as HTMLCanvasElement;

    canvas.width = clientWidth;
    canvas.height = clientHeight;
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

export const { isMac, isLinux, isWindows } = window.api ?? {
  isMac: () => false,
  isLinux: () => true,
  isWindows: () => false,
};
