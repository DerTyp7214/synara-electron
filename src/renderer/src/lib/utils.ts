import { getApiUrl } from "$lib/api/utils";

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

export function idToUuid(strippedId: string): string {
  if (strippedId.length !== 32) {
    console.error("Input ID must be 32 characters long.");
    return strippedId;
  }

  return [
    strippedId.slice(0, 8),
    strippedId.slice(8, 12),
    strippedId.slice(12, 16),
    strippedId.slice(16, 20),
    strippedId.slice(20, 32),
  ].join("-");
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

export const { isMac, isLinux, isWindows } = window.api;
