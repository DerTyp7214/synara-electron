import { apiCall, queryApi } from "$lib/api/utils";
import type { PagedResponse } from "$lib/api/apiTypes";
import type { Song } from "$shared/types/beApi";

export { type Song };

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

  return response.getData();
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

  return response.getData();
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

  return response.getData();
}

export async function songById(songId: Song["id"]) {
  const response = await apiCall<Song>({
    path: `/song/byId/${songId}`,
    method: "GET",
    auth: true,
  });

  return response.getData();
}

export async function querySongs(
  query: string,
  page?: number,
  pageSize?: number,
) {
  return queryApi<Song>("song", query, page, pageSize);
}

export async function getContentLength(streamUrl: string): Promise<number> {
  const response = await fetch(streamUrl, { method: "HEAD" });
  const contentLength = response.headers.get("Content-Length");
  if (!contentLength) return 0;
  return parseInt(contentLength, 10);
}
