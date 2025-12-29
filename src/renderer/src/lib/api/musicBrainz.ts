// noinspection DuplicatedCode

import { settings } from "$lib/utils/settings";
import { get } from "svelte/store";
import { apiCall } from "$lib/api/utils";
import type { MbSong } from "$shared/types/settings";

const apiEndpoint = "https://api.listenbrainz.org";

export async function updateNowPlaying(song: MbSong) {
  return scrobble({ ...song, listened_at: undefined }, true);
}

export async function scrobble(song: MbSong, nowPlaying: boolean = false) {
  const token = get(settings.listenBrainzToken);

  if (!token || !token.length) return false;

  // @ts-expect-error in case of binding the function
  const response = await apiCall.bind(this)({
    method: "post",
    host: apiEndpoint,
    path: "/1/submit-listens",
    headers: {
      Authorization: `Token ${token}`,
    },
    body: {
      listen_type: nowPlaying ? "playing_now" : "single",
      payload: [song],
    },
  });

  return response.isOk();
}
