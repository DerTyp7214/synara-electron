import { UUID } from "node:crypto";

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
  duration: number;
  explicit: boolean;
  fileSize: number;
  originalUrl: string;
  lyrics?: string;
  path: string;
  releaseDate?: number;
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
