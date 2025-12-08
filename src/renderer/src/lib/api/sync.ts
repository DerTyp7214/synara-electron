import type { Song } from "$shared/types/beApi";
import { apiCall } from "$lib/api/utils";
import { getOrigin, getOriginalTrackId } from "$lib/utils";

export async function getImageUrlBySong<K extends Song>(song: K) {
  const service = getOrigin(song.originalUrl);
  const trackId = getOriginalTrackId(song.originalUrl);

  const response = await apiCall<{
    url: string;
    width: number;
    height: number;
  }>({
    path: `/metadata/${service}/imageUrl/byTrackId/${trackId}`,
    method: "GET",
    auth: true,
  });

  return response.getData();
}
