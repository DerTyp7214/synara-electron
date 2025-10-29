import { MediaInfo } from "../models/mediaInfo";

export interface CustomApi {
  updateMpris(mediaInfo: MediaInfo): void;
  isMac(): boolean;
  isLinux(): boolean;
  isWindows(): boolean;
}
