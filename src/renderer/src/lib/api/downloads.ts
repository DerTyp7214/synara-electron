import {
  type DownloadQueueEntry,
  type MetadataTrack,
} from "$shared/types/beApi";
import { apiCall, apiStream } from "$lib/api/utils";

export async function authenticated(): Promise<boolean> {
  const response = await apiCall<boolean>({
    path: `/tdn/authenticated`,
    method: "GET",
    auth: true,
  });

  return response.getData();
}

export async function login(
  urlCallback: (url: string) => void,
): Promise<boolean> {
  const urlRegex = /https?:\/\/link\.tidal\.com\/[^\s,]+/;

  let success = true;

  await apiStream(
    {
      path: `/tdn/login`,
      method: "POST",
      auth: true,
    },
    (line) => {
      const match = line.match(urlRegex);

      if (match) urlCallback(match[0]);
      if (line.includes("TimeoutError")) success = false;
    },
  );

  return success;
}

export async function dl(
  urls: Array<string>,
  callback: (line: string) => void,
): Promise<void> {
  await apiStream(
    {
      path: `/tdn/dl`,
      method: "POST",
      auth: true,
      body: { urls },
    },
    callback,
  );
}

export async function dlQueue(): Promise<Array<DownloadQueueEntry>> {
  const response = await apiCall<Array<DownloadQueueEntry>>({
    path: `/tdn/dlQueue`,
    method: "GET",
    query: { self: true },
    auth: true,
  });

  return response.getData();
}

export async function currentDl(): Promise<DownloadQueueEntry | null> {
  const response = await apiCall<DownloadQueueEntry>({
    path: `/tdn/currentDl`,
    method: "GET",
    query: { self: true },
    auth: true,
    expectedErrorStatus: 404,
  });

  if (!response.isOk()) return null;

  return response.getData();
}

export async function getTidalTracksByIds(
  ids: Array<string>,
): Promise<Array<MetadataTrack>> {
  const response = await apiCall<Array<MetadataTrack>>({
    path: `/metadata/tidal/tracks`,
    method: "POST",
    auth: true,
    body: ids,
  });

  return response.getData();
}
