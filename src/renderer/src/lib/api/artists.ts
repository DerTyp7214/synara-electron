import { type Artist, type Song } from "$shared/types/beApi";
import { apiCall } from "$lib/api/utils";
import type { PagedResponse } from "$lib/api/apiTypes";

export { type Artist };

export async function listSongsByArtist(
  artistId: Artist["id"],
  page?: number,
  pageSize?: number,
): Promise<PagedResponse<Song>> {
  const response = await apiCall<PagedResponse<Song>>({
    path: `/song/byArtist/${artistId}`,
    method: "GET",
    query: { page, pageSize, explicit: "true" },
    auth: true,
  });

  return response.getData();
}

export async function byId(artistId: Artist["id"]): Promise<Artist> {
  const response = await apiCall<Artist>({
    path: `/artist/byId/${artistId}`,
    method: "GET",
    auth: true,
  });

  return response.getData();
}
