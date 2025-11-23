import {
  AppSettings,
  MediaSettings,
  PlayingSourceType,
  QueueSettings,
  TokenSettings,
} from "./types/settings";
import { RepeatMode } from "./models/repeatMode";

export const DEFAULT_SETTINGS: AppSettings &
  TokenSettings &
  MediaSettings &
  QueueSettings = {
  theme: "light",
  apiBase: undefined,
  volume: 50,
  hideOnClose: false,
  discordRpc: false,
  audioVisualizer: {
    minDecibels: -90,
    maxDecibels: -20,
    smoothingTimeConstant: 0.75,
  },
  downloadDir: "",
  locale: "us",

  token: {},

  currentIndex: -1,
  playingSourceType: PlayingSourceType.LikedSongs,
  playingSourceId: "----",
  shuffle: false,
  repeatMode: RepeatMode.None,

  queue: [],
  shuffleMap: [],
};
