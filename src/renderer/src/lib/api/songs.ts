import { apiCall, queryApi } from "$lib/api/utils";
import type { PagedResponse } from "$lib/api/apiTypes";
import type { Song } from "$shared/types/beApi";
import { get } from "svelte/store";
import { settings } from "$lib/settings";

export { type Song };

function cleanSong(song: Song): Song {
  if (!get(settings.cleanTitles)) return song;

  const regex =
    /\s*([([]).*?(feat|ft|with|prod|live|remix|acoustic|radio edit|explicit|clean).*?([)\]])/gi;

  return {
    ...song,
    title: song.title.replace(regex, "").trimEnd(),
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
