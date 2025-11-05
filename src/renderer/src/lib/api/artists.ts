import { type Artist } from "$shared/types/beApi";
import { apiCall } from "$lib/api/utils";

export { type Artist };

export async function byId(artistId: Artist["id"]): Promise<Artist> {
  const response = await apiCall<Artist>({
    path: `/artist/byId/${artistId}`,
    method: "GET",
    auth: true,
  });

  return response.getData();
}
