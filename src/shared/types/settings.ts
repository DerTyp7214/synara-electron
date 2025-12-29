import type { MinimalSong, Song } from "./beApi";
import type { RepeatMode } from "../models/repeatMode";
import type { UUID } from "node:crypto";

export enum PlayingSourceType {
  Playlist = "playlist",
  UserPlaylist = "userPlaylist",
  Album = "album",
  Artist = "artist",
  LikedSongs = "likedSongs",

  SongSearch = "songSearch",
  ArtistSearch = "artistSearch",
  AlbumSearch = "albumSearch",
  PlaylistSearch = "playlistSearch",
}

export type PlayingSource = {
  type: PlayingSourceType;
  id: UUID;
};

export type Settings = AppSettings &
  TokenSettings &
  MediaSettings &
  QueueSettings;

export interface AppSettings {
  theme: "dark" | "light";
  apiBase: string | undefined;
  volume: number;
  hideOnClose: boolean;
  discordRpc: boolean;
  downloadDir: string;
  lastFm: boolean;
  cleanTitles: boolean;
  locale: string;
  audioVisualizer: {
    enabled: boolean;
    minDecibels: number;
    maxDecibels: number;
    smoothingTimeConstant: number;
    particleMultiplier: number;
    velocityMultiplier: number;
  };
}

export interface TokenSettings {
  token: { jwt?: string; refreshToken?: string };
  lastFmTokens: {
    apiKey?: string;
    sharedSecret?: string;
  };
  lastFmSession: {
    key?: string;
    name?: string;
  };
  listenBrainzToken: string;
}

export interface MediaSettings {
  currentIndex: number;
  playingSourceType: PlayingSourceType;
  playingSourceId: PlayingSource["id"];
  shuffle: boolean;
  repeatMode: RepeatMode;
}

/**
 * @interface LastFmSong
 * Song object send to last.fm for scrobbling.
 */
export interface LastFmSong {
  artist: Array<string>;
  track: string;
  /** Epoch in seconds */
  timestamp: number;
  album?: string;
  /** Converted to 0/1 when send to last.fm */
  chosenByUser?: boolean;
  trackNumber?: number;
  /** MusicBrainZ Track ID */
  mbid?: string;
  albumArtist?: Array<string>;
  /** Duration in seconds */
  duration?: number;
}

export interface MbSong {
  listened_at?: number;
  track_metadata: {
    additional_info: {
      media_player: string;
      submission_client: string;
      submission_client_version: string;
      release_mbid?: string;
      artist_mbids?: Array<string>;
      recording_mbid?: string;
      tags: Array<string>;
      duration_ms: number;
    };
    artist_name: string;
    track_name: string;
    release_name: string;
  };
}

export interface QueueSettings {
  queue: Array<MinimalSong>;
  shuffleMap: Array<number>;
  lastFmScrobbleQueue: Array<
    Song & { lastFm?: boolean; listenBrainz?: boolean }
  >;
}

export const nullSong: Song & { position: number } = {
  bitsPerSample: 0,
  copyright: "",
  discNumber: 0,
  explicit: false,
  fileSize: 0,
  id: "00000000-0000-4000-a000-000000000000".replaceAll("-", "") as UUID,
  originalUrl: "",
  path: "",
  sampleRate: 0,
  trackNumber: 0,
  title: "No Song",
  bitRate: 0,
  duration: 0,
  artists: [],
  position: 0,
  album: {
    id: "00000000-0000-4000-a000-000000000000".replaceAll("-", "") as UUID,
    artists: [],
    name: "",
    songCount: 0,
    releaseDate: Date.now(),
    totalDuration: 0,
    totalSize: 0,
  },
  isFavourite: false,
};

export const APP_SETTINGS_KEYS: Array<keyof AppSettings> = [
  "theme",
  "apiBase",
  "volume",
  "hideOnClose",
  "discordRpc",
  "downloadDir",
  "audioVisualizer",
  "lastFm",
  "cleanTitles",
];

export const TOKEN_SETTINGS_KEYS: Array<keyof TokenSettings> = [
  "token",
  "lastFmTokens",
  "lastFmSession",
  "listenBrainzToken",
];

export const MEDIA_SETTINGS_KEYS: Array<keyof MediaSettings> = [
  "currentIndex",
  "playingSourceType",
  "playingSourceId",
  "shuffle",
  "repeatMode",
];

export const QUEUE_SETTINGS_KEYS: Array<keyof QueueSettings> = [
  "queue",
  "shuffleMap",
  "lastFmScrobbleQueue",
];

export const SETTINGS_KEYS: Array<keyof Settings> = [
  ...APP_SETTINGS_KEYS,
  ...TOKEN_SETTINGS_KEYS,
  ...MEDIA_SETTINGS_KEYS,
  ...QUEUE_SETTINGS_KEYS,
];

export interface SettingsAPI {
  get<K extends keyof Settings>(key: K): Promise<TypedArrayBuffer<Settings[K]>>;
  set<K extends keyof Settings>(
    key: K,
    value: TypedArrayBuffer<Settings[K]>,
  ): void;
}

export type TypedArrayBuffer<_V> = ArrayBuffer;
