import { apiCall } from "$lib/api/utils";
import type { PagedResponse } from "$lib/api/apiTypes";
import type { Song } from "$lib/api/songs";
import type { Playlist } from "$shared/types/beApi";

export { type Playlist };

export async function listPlaylists(
  page?: number,
  pageSize?: number,
): Promise<PagedResponse<Playlist>> {
  const response = await apiCall<PagedResponse<Playlist>>({
    path: "/playlist/list",
    method: "GET",
    query: { page, pageSize },
    auth: true,
  });

  return response.getData();
}

export async function listSongsByPlaylist(
  playlistId: Playlist["id"],
  page?: number,
  pageSize?: number,
): Promise<PagedResponse<Song>> {
  const response = await apiCall<PagedResponse<Song>>({
    path: `/song/byPlaylist/${playlistId}`,
    method: "GET",
    query: { page, pageSize, explicit: "true" },
    auth: true,
  });

  return response.getData();
}

export async function byId(albumId: Playlist["id"]): Promise<Playlist> {
  const response = await apiCall<Playlist>({
    path: `/playlist/byId/${albumId}`,
    method: "GET",
    auth: true,
  });

  return response.getData();
}
