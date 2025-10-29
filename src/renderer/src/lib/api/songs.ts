import { apiCall } from "$lib/api/utils";
import type { PagedResponse } from "$lib/api/apiTypes";
import type { UUID } from "node:crypto";
import type { Artist } from "$lib/api/artists";
import type { Album } from "$lib/api/albums";

export interface Song {
  id: UUID;
  title: string;
  album?: Album;
  artists: Array<Artist>;
  bitRate: number;
  bitsPerSample: number;
  sampleRate: number;
  copyright: string;
  coverId?: UUID;
  discNumber: number;
  trackNumber: number;
  duration: number;
  explicit: boolean;
  fileSize: number;
  originalUrl: string;
  path: string;
  releaseDate?: number;
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

export async function getContentLength(streamUrl: string): Promise<number> {
  const response = await fetch(streamUrl, { method: "HEAD" });
  const contentLength = response.headers.get("Content-Length");
  if (!contentLength) return 0;
  return parseInt(contentLength, 10);
}
