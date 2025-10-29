import type { Song } from "$lib/api/songs";
import { mediaSession } from "$lib/audio/mediaSession";
import { getImageUrl, getStreamUrl, uuidToId } from "$lib/utils";
import { isElectron } from "$lib/consts";
import type { ElectronAPI } from "@electron-toolkit/preload";
import type { MediaInfo } from "$shared/models/mediaInfo";
import type { CustomApi } from "$shared/types/api";
import type { PlaybackStatus } from "$shared/models/playbackStatus";
import type { RepeatMode } from "$shared/models/repeatMode";

declare global {
  interface Window {
    electron: ElectronAPI;
    api: CustomApi;
  }
}

class ElectronController {
  private unsubscribers: Array<() => void> = [];

  constructor() {
    this.cleanup();
    void this.initElectron();
  }

  private async initElectron() {
    if (!isElectron()) return;
  }

  /**
   * @param song
   * @param playbackStatus
   * @param shuffle
   * @param repeatMode
   * @param position position in milliseconds
   * @param volume the volume (between 0.0 and 1.0)
   */
  async updateMediaControls(
    song: Song | undefined | null,
    playbackStatus: PlaybackStatus,
    shuffle: boolean,
    repeatMode: RepeatMode,
    position: number,
    volume: number,
  ) {
    if (!isElectron() || !song) return;

    const metadata: MediaInfo = {
      title: song.title,
      artists: song.artists.map((artist) => artist.name),
      album: song.album?.name ?? song?.title,
      image: getImageUrl(song.coverId),
      duration: song.duration,
      current: position,
      trackId: uuidToId(song.id),
      url: getStreamUrl(song.id),
      favorite: false,
      player: {
        volume: volume,
        status: playbackStatus,
        shuffle: shuffle,
        repeat: repeatMode,
      },
    };

    window.api.updateMpris(metadata);
  }

  cleanup() {
    for (const unsubscriber of this.unsubscribers) {
      unsubscriber?.();
    }
  }
}

export const electronController = new ElectronController();
