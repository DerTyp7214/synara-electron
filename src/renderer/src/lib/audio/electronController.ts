import { type Song } from "$lib/api/songs";
import {
  getImageUrl,
  getStreamUrl,
  idToUuid,
  uuidToId,
} from "$lib/utils/utils";
import { isElectron } from "$lib/consts";
import type { ElectronAPI } from "@electron-toolkit/preload";
import type { MediaInfo } from "$shared/models/mediaInfo";
import type { CustomApi, MprisEventData } from "$shared/types/api";
import { PlaybackStatus } from "$shared/models/playbackStatus";
import type { RepeatMode } from "$shared/models/repeatMode";
import { get } from "svelte/store";
import { scopedDebugLog, scopeStyle } from "$lib/utils/logger";
import { audioSession } from "$lib/audio/audioSession";
import {
  playAlbumById,
  playPlaylistById,
  playSongById,
} from "$lib/utils/mediaPlayer";
import { mediaSession } from "$lib/audio/mediaSession";
import { playBackStateToMediaSessionState } from "$lib/audio/utils";
import type { SettingsAPI } from "$shared/types/settings";
import { getImageUrlBySong } from "$lib/api/metadata";

declare global {
  // noinspection JSUnusedGlobalSymbols
  interface Window {
    electron: ElectronAPI;
    api: CustomApi & SettingsAPI;
  }
}

class ElectronController {
  private logScope = {
    name: "ElectronController",
    style: scopeStyle("#8f6406"),
  };

  private lastImageUrl: { id: string; url: string | null; loading: boolean } = {
    id: "",
    url: "",
    loading: false,
  };

  constructor() {
    void this.initElectron();
  }

  private async initElectron() {
    if (!isElectron()) return;

    window.api.registerListener(async (event, data) => {
      const player = {
        repeat: data as RepeatMode,
        volume: get(mediaSession.volume) / 100,
        status: get(mediaSession.paused)
          ? PlaybackStatus.Paused
          : PlaybackStatus.Playing,
        shuffle: get(mediaSession.shuffled),
      };
      switch (event) {
        case "loopStatus": {
          mediaSession.repeatMode.set(data as RepeatMode);
          player.repeat = data as RepeatMode;
          break;
        }
        case "shuffle": {
          mediaSession.shuffled.set(data as boolean);
          player.shuffle = data as boolean;
          break;
        }
        case "pause": {
          mediaSession.pause();
          return;
        }
        case "play": {
          void mediaSession.play();
          return;
        }
        case "playpause": {
          if (get(mediaSession.paused)) void mediaSession.play();
          else mediaSession.pause();
          return;
        }
        case "previous": {
          void mediaSession.playPrev();
          return;
        }
        case "next": {
          void mediaSession.playNext();
          return;
        }
        case "stop": {
          mediaSession.pause();
          return;
        }
        case "volume": {
          mediaSession.volume.set((data as number) * 100);
          player.volume = data as number;
          break;
        }
        case "position": {
          audioSession.seekToMilliseconds(
            Number((data as MprisEventData<"position">).position) / 1000,
          );
          return;
        }
        case "open": {
          const { uri } = data as MprisEventData<"open">;
          let trackId: string | undefined;

          if (uri.startsWith("/org/mpris/MediaPlayer2/")) {
            const regex = /\/org\/mpris\/MediaPlayer2\/(.+)\/(.+)/;
            const result = uri.match(regex);
            if (result?.length !== 3) return;

            const type = result[1];
            const id = idToUuid(result[2]);

            switch (type) {
              case "track": {
                await playSongById(id);
                return;
              }
              case "playlist": {
                await playPlaylistById(id);
                return;
              }
              case "album": {
                await playAlbumById(id);
                return;
              }
            }
          } else if (uri.startsWith("synara:")) {
            /* empty */
          }

          if (!trackId) return;
          return;
        }
        default: {
          scopedDebugLog(
            "warn",
            this.logScope,
            "uncaught mpris-event",
            event,
            data,
          );
        }
      }
      window.api.updateMpris({ player });
    });
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
    if ("mediaSession" in navigator && song) {
      try {
        const artwork: Array<MediaImage> = [];

        if (song.coverId)
          artwork.push({
            src: getImageUrl(song.coverId),
          });

        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          album: song.album?.name ?? song.title,
          artist: song.artists.map((a) => a.name).join(", "),
          artwork: artwork,
        });

        if (position <= song.duration) {
          navigator.mediaSession.setPositionState({
            position: position / 1000,
            duration: song.duration / 1000,
          });
        }

        navigator.mediaSession.playbackState =
          playBackStateToMediaSessionState(playbackStatus);
      } catch (e) {
        scopedDebugLog(
          "error",
          this.logScope,
          "updateMediaControls > mediaSession",
          e,
        );
      }
    }

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

    if (metadata.trackId.length > 0) {
      window.api.updateMpris(metadata);

      if (this.lastImageUrl.id !== metadata.trackId) {
        this.lastImageUrl.loading = true;
        const imageUrl = await getImageUrlBySong(song)
          .then((image) => image?.url ?? null)
          .catch(() => null);
        this.lastImageUrl.loading = false;
        this.lastImageUrl.id = metadata.trackId;
        this.lastImageUrl.url = imageUrl;
      }

      window.api.updateDiscordRPC({
        ...metadata,
        image: this.lastImageUrl.url ?? undefined,
      });
    }
  }
}

export const electronController = new ElectronController();
