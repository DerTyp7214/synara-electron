// noinspection DuplicatedCode

import { settings } from "$lib/utils/settings";
import { get } from "svelte/store";
import { apiCall } from "$lib/api/utils";
import type { MbSong } from "$shared/types/settings";
import type { Listen } from "$lib/api/musicBrainz.d";

const apiEndpoint = "https://api.listenbrainz.org";

export async function updateNowPlaying(song: MbSong) {
  return scrobble({ ...song, listened_at: undefined }, true);
}

export async function scrobble(song: MbSong, nowPlaying: boolean = false) {
  const { token } = get(settings.listenBrainz);

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

export async function getListens(count: number = 50) {
  const { user, token } = get(settings.listenBrainz);

  if (!token || !token.length || !user || !user.length) return null;

  // @ts-expect-error in case of binding the function
  const response = await apiCall.bind(this)<{ payload: Payload }>({
    method: "get",
    host: apiEndpoint,
    path: `/1/user/${user}/listens?count=${count}`,
    headers: {
      Authorization: `Token ${token}`,
    },
  });

  if (!response.isOk()) return null;

  return await response.getData().then((data) => data.payload);
}

interface Payload {
  count: number;
  latest_listen_ts: number;
  listens: Listen[];
  oldest_listen_ts: number;
  user_id: string;
}
