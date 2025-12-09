import type { Song } from "$shared/types/beApi";
import { apiCall } from "$lib/api/utils";
import { getOrigin, getOriginalTrackId } from "$lib/utils";

export async function getImageUrlBySong<K extends Song>(song: K) {
  if (await supportsImageCache()) {
    const response = await apiCall<string>({
      path: `/metadata/imageCache/imageUrlById/${song.coverId}`,
      method: "GET",
      auth: true,
    });

    if (!response.isOk()) return null;

    const url = await response.getRawText();

    return {
      url,
    };
  }

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

const lastSupportedCheck = 0;
let supported = false;

export async function supportsImageCache(): Promise<boolean> {
  if (lastSupportedCheck + 1000 > Date.now()) {
    return supported;
  }
  const response = await apiCall<string>({
    path: "/metadata/imageCache/supported",
    method: "GET",
    auth: true,
    expectedErrorStatus: 404,
  });

  supported =
    response.isOk() && (await response.getData().then((res) => Boolean(res)));
  return supported;
}
