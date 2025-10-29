import { PlaybackStatus } from "./playbackStatus";
import { RepeatMode } from "./repeatMode";

export interface MediaPlayerInfo {
  status: PlaybackStatus;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
}
