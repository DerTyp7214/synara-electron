import type { Song } from "./beApi";
import type { RepeatMode } from "../models/repeatMode";
import { UUID } from "node:crypto";

export enum PlayingSourceType {
  Playlist = "playlist",
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
    minDecibels: number;
    maxDecibels: number;
    smoothingTimeConstant: number;
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

export interface QueueSettings {
  queue: Array<Song>;
  shuffleMap: Array<number>;
  lastFmScrobbleQueue: Array<LastFmSong>;
}

export const nullSong: Song & { position: number } = {
  bitsPerSample: 0,
  copyright: "",
  discNumber: 0,
  explicit: false,
  fileSize: 0,
  id: crypto.randomUUID().replaceAll("-", "") as UUID,
  originalUrl: "",
  path: "",
  sampleRate: 0,
  trackNumber: 0,
  title: "No Song",
  bitRate: 0,
  duration: 0,
  artists: [],
  position: 0,
  isFavourite: false,
};

export const APP_SETTINGS_KEYS: Array<keyof AppSettings> = [
  "theme",
  "apiBase",
  "volume",
  "hideOnClose",
  "discordRpc",
  "audioVisualizer",
  "lastFm",
  "cleanTitles",
];

export const TOKEN_SETTINGS_KEYS: Array<keyof TokenSettings> = [
  "token",
  "lastFmTokens",
  "lastFmSession",
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
  get<K extends keyof Settings>(key: K): Promise<Settings[K]>;
  set<K extends keyof Settings>(key: K, value: Settings[K]): void;
}
