import type { UUID } from "node:crypto";

export type MinimalSong = {
  position: number;
  id: UUID;
};

export type SongWithPosition = Song & { position: number };

export interface Song {
  id: UUID;
  title: string;
  album?: Album;
  artists: Array<Artist>;
  bitRate: number;
  bitsPerSample: number;
  sampleRate: number;
  copyright: string;
  coverId?: UUID;
  discNumber: number;
  trackNumber: number;
  /** Duration in millis */
  duration: number;
  explicit: boolean;
  fileSize: number;
  originalUrl: string;
  lyrics?: string;
  path: string;
  releaseDate?: number;
  isFavourite: boolean;
  userSongCreatedAt?: string;
  userSongUpdatedAt?: string;
}

export interface Album {
  id: UUID;
  name: string;
  coverId?: UUID;
  releaseDate?: number;
  songCount: number;
  totalDuration: number;
  totalSize: number;
  artists: Array<Artist>;
}

export interface Artist {
  id: UUID;
  name: string;
  imageId?: UUID;
  about: string;
  isGroup: boolean;
  artists: Array<Artist>;
}

export interface Playlist {
  id: UUID;
  imageId: UUID;
  name: string;
  songs: Array<string>;
  totalDuration: number;
}

export type DownloadQueueEntryType = "track" | "album" | "playlist" | "artist";
export type TdnFavouriteType = "tracks" | "artists" | "albums" | "videos";

export interface DownloadQueueEntry {
  byUser: UUID;
  type: DownloadQueueEntryType;
}

export interface UrlDownloadQueueEntry extends DownloadQueueEntry {
  urls: Array<string>;
  ids: Array<string>;
}

export interface FavouriteDownloadQueueEntry extends DownloadQueueEntry {
  tdnFavouriteType: TdnFavouriteType;
}

export interface MetadataTrack {
  id: string;
  title: string;
  artists: Array<string>;
  duration: string;
  createdAt: string;
  images: Array<MetadataImage>;
}

export interface MetadataImage {
  url: string;
  width: number;
  height: number;
}
