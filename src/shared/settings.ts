import {
  type AppSettings,
  type MediaSettings,
  PlayingSourceType,
  type QueueSettings,
  type TokenSettings,
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
    enabled: true,
    minDecibels: -90,
    maxDecibels: -20,
    smoothingTimeConstant: 0.75,
    particleMultiplier: 1.2,
    velocityMultiplier: 2.2,
  },
  downloadDir: "",
  lastFm: false,
  cleanTitles: false,
  locale: "us",

  token: {},
  lastFmTokens: {
    apiKey: import.meta.env.MAIN_VITE_LAST_FM_API_KEY,
    sharedSecret: import.meta.env.MAIN_VITE_LAST_FM_SHARED_SECRET,
  },
  lastFmSession: {},
  listenBrainzToken: "",

  currentIndex: -1,
  playingSourceType: PlayingSourceType.LikedSongs,
  playingSourceId: "----",
  shuffle: false,
  repeatMode: RepeatMode.None,

  queue: [],
  shuffleMap: [],
  lastFmScrobbleQueue: [],
};
