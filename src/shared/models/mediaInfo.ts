import { MediaPlayerInfo } from "./mediaPlayerInfo";

export interface MediaInfo {
  title: string;
  artists: Array<string>;
  album: string;
  icon?: string;
  url: string;
  playingFrom?: string;
  current: number;
  duration: number;
  image?: string;
  favorite: boolean;
  trackId: string;
  player?: MediaPlayerInfo;
}
