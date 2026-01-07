import { apiCall, queryApi } from "$lib/api/utils";
import type { PagedResponse } from "$lib/api/apiTypes";
import type { Song } from "$shared/types/beApi";
import { get } from "svelte/store";
import { settings } from "$lib/utils/settings";
import { cleanTitle } from "$lib/utils/ui";

export { type Song };

function cleanSong(song: Song): Song {
  if (!get(settings.cleanTitles)) return song;

  return {
    ...song,
    title: cleanTitle(song.title),
  };
}

async function cleanSongs(
  response: Promise<PagedResponse<Song>>,
): Promise<PagedResponse<Song>> {
  return await response.then((res) => ({
    ...res,
    data: res.data.map(cleanSong),
  }));
}

export async function listSongs(
  page?: number,
  pageSize?: number,
): Promise<PagedResponse<Song>> {
  const response = await apiCall<PagedResponse<Song>>({
    path: "/song/list",
    method: "GET",
    query: { page, pageSize, explicit: "true" },
    auth: true,
  });

  return cleanSongs(response.getData());
}

export async function likedSongs(
  page?: number,
  pageSize?: number,
): Promise<PagedResponse<Song>> {
  const response = await apiCall<PagedResponse<Song>>({
    path: "/song/liked",
    method: "GET",
    query: { page, pageSize, explicit: "true" },
    auth: true,
  });

  return cleanSongs(response.getData());
}

export async function setLiked(
  songId: Song["id"],
  liked: boolean,
): Promise<Song> {
  const response = await apiCall<Song>({
    path: `/song/setLiked/${songId}`,
    method: "POST",
    body: { liked },
    auth: true,
  });

  return cleanSong(await response.getData());
}

export async function songById(songId: Song["id"]) {
  // @ts-expect-error in case of binding the function
  const response = await apiCall.bind(this)<Song>({
    path: `/song/byId/${songId}`,
    method: "GET",
    auth: true,
  });

  return cleanSong(await response.getData());
}

export async function songByIds(...songIds: Array<Song["id"]>) {
  // @ts-expect-error in case of binding the function
  const response = await apiCall.bind(this)<Array<Song>>({
    path: `/song/byIds`,
    body: { ids: songIds },
    method: "POST",
    auth: true,
  });

  return await response.getData().then((res) => res.map(cleanSong));
}

export async function querySongs(
  query: string,
  page?: number,
  pageSize?: number,
) {
  return cleanSongs(queryApi<Song>("song", query, page, pageSize));
}

export async function getContentLength(streamUrl: string): Promise<number> {
  const response = await fetch(streamUrl, { method: "HEAD" });
  const contentLength = response.headers.get("Content-Length");
  if (!contentLength) return 0;
  return parseInt(contentLength, 10);
}

export async function deleteSong(...songIds: Array<Song["id"]>) {
  const response = await apiCall<void>({
    path: `/song`,
    body: songIds,
    method: "DELETE",
    auth: true,
  });

  return response.getData();
}
