// noinspection DuplicatedCode

import { settings } from "$lib/settings";
import { get } from "svelte/store";
import { Md5 } from "ts-md5";
import { apiCall } from "$lib/api/utils";
import type { LastFmSong } from "$shared/types/settings";
import { removeUndefined } from "$lib/utils";

const apiEndpoint = "http://ws.audioscrobbler.com/2.0/";

function getApiSignature(params: Record<string, string>): string {
  const { sharedSecret } = get(settings.lastFmTokens);
  if (!sharedSecret) return "";

  const keys = Object.keys(params).sort();

  let signatureString = "";
  for (const key of keys) {
    signatureString += key + params[key];
  }

  signatureString += sharedSecret;

  return Md5.hashStr(signatureString);
}

export async function getRequestToken() {
  const { apiKey, sharedSecret } = get(settings.lastFmTokens);

  if (!apiKey || !sharedSecret) return "";

  const methodParams = {
    method: "auth.getToken",
    api_key: apiKey,
  };

  const apiSignature = getApiSignature(methodParams);

  const response = await apiCall<{ token: string }>({
    method: "get",
    host: apiEndpoint,
    query: {
      ...methodParams,
      api_sig: apiSignature,
      format: "json",
    },
    auth: false,
  });

  if (!response.isOk()) return "";

  const data = await response.getData();

  return data.token;
}

export async function getSessionKey(token: string) {
  const { apiKey, sharedSecret } = get(settings.lastFmTokens);

  if (!apiKey || !sharedSecret) return null;

  const methodParams = {
    method: "auth.getSession",
    api_key: apiKey,
    token,
  };

  const apiSignature = getApiSignature(methodParams);

  const response = await apiCall<{
    session: {
      key: string;
      name: string;
      subscriber: number;
    };
  }>({
    method: "post",
    host: apiEndpoint,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    formBody: new URLSearchParams({
      ...methodParams,
      api_sig: apiSignature,
      format: "json",
    }),
  });

  if (!response.isOk()) return null;

  const data = await response.getData();

  settings.lastFmSession.set({
    name: data.session.name,
    key: data.session.key,
  });

  return data.session;
}

export async function updateNowPlaying(song: LastFmSong) {
  const { apiKey, sharedSecret } = get(settings.lastFmTokens);
  const { key: sessionKey } = get(settings.lastFmSession);

  if (!sessionKey || !apiKey || !sharedSecret) return null;

  const baseParams = removeUndefined({
    method: "track.updateNowPlaying",
    api_key: apiKey,
    sk: sessionKey,

    album: song.album,
    artist: song.artist.join(", "),
    track: song.track,
    trackNumber: song.trackNumber?.toString(),
    albumArtist: song.albumArtist?.join(", "),
    chosenByUser: song.chosenByUser ? "1" : "0",
  });

  const apiSignature = getApiSignature(baseParams);

  const response = await apiCall({
    method: "post",
    host: apiEndpoint,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    formBody: new URLSearchParams({
      ...baseParams,
      api_sig: apiSignature,
      format: "json",
    }),
  });

  if (!response.isOk()) return null;

  return response.getData();
}

export async function scrobble(song: LastFmSong) {
  const { apiKey, sharedSecret } = get(settings.lastFmTokens);
  const { key: sessionKey } = get(settings.lastFmSession);

  if (!sessionKey || !apiKey || !sharedSecret) return false;

  const baseParams = removeUndefined({
    method: "track.scrobble",
    api_key: apiKey,
    sk: sessionKey,

    album: song.album,
    artist: song.artist.join(", "),
    timestamp: song.timestamp.toString(),
    track: song.track,
    trackNumber: song.trackNumber?.toString(),
    albumArtist: song.albumArtist?.join(", "),
    chosenByUser: song.chosenByUser ? "1" : "0",
  });

  const apiSignature = getApiSignature(baseParams);

  const response = await apiCall({
    method: "post",
    host: apiEndpoint,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    formBody: new URLSearchParams({
      ...baseParams,
      api_sig: apiSignature,
      format: "json",
    }),
  });

  return response.isOk();
}
