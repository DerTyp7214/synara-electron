import type { Song } from "$shared/types/beApi";
import { apiCall } from "$lib/api/utils";
import {
  blackSvg,
  getImageUrl,
  getOrigin,
  getOriginalTrackId,
  getProxyUrl,
} from "$lib/utils/utils";

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

export async function getAnimatedCoverBySong<K extends Song>(song: K) {
  const response = await apiCall<{
    url?: string;
    fallbackUrl: string;
    animated: boolean;
  }>({
    path: `/metadata/tidal/imageUrl/animatedByTrack/${song.id}`,
    method: "GET",
    auth: true,
  });

  const data = await response.getData();

  if (!data.animated || !data.url)
    return { url: getImageUrl(song.coverId) ?? blackSvg, animated: false };

  const headResponse = await fetch(getProxyUrl(data.url), {
    method: "HEAD",
  });

  if (!headResponse.ok)
    return { url: getImageUrl(song.coverId) ?? blackSvg, animated: false };

  return { url: getProxyUrl(data.url), animated: true };
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
