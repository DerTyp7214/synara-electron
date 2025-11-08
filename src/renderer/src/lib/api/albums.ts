import type { Song } from "$lib/api/songs";
import type { PagedResponse } from "$lib/api/apiTypes";
import { apiCall, queryApi } from "$lib/api/utils";
import type { Album } from "$shared/types/beApi";

export { type Album };

export async function listSongsByAlbum(
  albumId: Album["id"],
  page?: number,
  pageSize?: number,
): Promise<PagedResponse<Song>> {
  const response = await apiCall<PagedResponse<Song>>({
    path: `/song/byAlbum/${albumId}`,
    method: "GET",
    query: { page, pageSize, explicit: "true" },
    auth: true,
  });

  return response.getData();
}

export async function queryAlbums(
  query: string,
  page?: number,
  pageSize?: number,
) {
  return queryApi<Album>("album", query, page, pageSize);
}

export async function byId(albumId: Album["id"]): Promise<Album> {
  const response = await apiCall<Album>({
    path: `/album/byId/${albumId}`,
    method: "GET",
    auth: true,
  });

  return response.getData();
}
