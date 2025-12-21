import { apiCall, queryApi } from "$lib/api/utils";
import type { PagedResponse } from "$lib/api/apiTypes";
import type { Song } from "$lib/api/songs";
import type { UserPlaylist } from "$shared/types/beApi";

export { type UserPlaylist };

export async function listUserPlaylists(
  page?: number,
  pageSize?: number,
): Promise<PagedResponse<UserPlaylist>> {
  const response = await apiCall<PagedResponse<UserPlaylist>>({
    path: "/userPlaylist/list",
    method: "GET",
    query: { page, pageSize },
    auth: true,
  });

  return response.getData();
}

export async function listSongsByUserPlaylist(
  playlistId: UserPlaylist["id"],
  page?: number,
  pageSize?: number,
): Promise<PagedResponse<Song>> {
  const response = await apiCall<PagedResponse<Song>>({
    path: `/song/byUserPlaylist/${playlistId}`,
    method: "GET",
    query: { page, pageSize, explicit: "true" },
    auth: true,
  });

  return response.getData();
}

export async function queryUserPlaylists(
  query: string,
  page?: number,
  pageSize?: number,
) {
  return queryApi<UserPlaylist>("playlist", query, page, pageSize);
}

export async function byId(albumId: UserPlaylist["id"]): Promise<UserPlaylist> {
  const response = await apiCall<UserPlaylist>({
    path: `/userPlaylist/byId/${albumId}`,
    method: "GET",
    auth: true,
  });

  return response.getData();
}
