import type { MediaInfo } from "../models/mediaInfo";
import type { MediaPlayerInfo } from "../models/mediaPlayerInfo";
import { RepeatMode } from "../models/repeatMode";
import type { Service } from "bonjour-service";

export type MprisEventName =
  | "next"
  | "previous"
  | "pause"
  | "playpause"
  | "stop"
  | "play"
  | "loopStatus"
  | "shuffle"
  | "seek"
  | "position"
  | "open"
  | "volume";

export type MprisEventData<T extends MprisEventName> = T extends "loopStatus"
  ? RepeatMode
  : T extends "shuffle"
    ? boolean
    : T extends "volume"
      ? number
      : T extends "position"
        ? {
            position: number; // position in microseconds
            trackId: string;
          }
        : T extends "open"
          ? {
              uri: string;
            }
          : undefined;

export type MprisEventListener<T extends MprisEventName> = (
  eventName: T,
  data: MprisEventData<T>,
) => void;

export type BonjourEventListener = (service: Service) => void;

export interface CustomApi {
  updateMpris(
    mediaInfo: Partial<
      Omit<MediaInfo, "player"> & { player: Partial<MediaPlayerInfo> }
    >,
  ): void;
  updateDiscordRPC(
    mediaInfo: Partial<
      Omit<MediaInfo, "player"> & { player: Partial<MediaPlayerInfo> }
    >,
  ): void;
  isMac(): boolean;
  isLinux(): boolean;
  isWindows(): boolean;
  getIsFullScreen(): Promise<boolean>;
  onFullScreenChange(callback: (isFullscreen: boolean) => void): () => void;
  registerListener(listener: MprisEventListener<MprisEventName>): void;
  registerBonjourListener(listener: BonjourEventListener): () => void;
  openExternal(url: string): void;
  setBadgeColor(color: string): void;
  clearBadge(): void;
  minimizeWindow(): void;
  maximizeWindow(): void;
  closeWindow(): void;
  getIsMaximized(): Promise<boolean>;
  onMaximizedChange(callback: (isMaximized: boolean) => void): () => void;
}
