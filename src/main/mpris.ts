import Player from "mpris-service";
import { MediaInfo } from "../shared/models/mediaInfo";
import { PlaybackStatus } from "../shared/models/playbackStatus";
import { RepeatMode } from "../shared/models/repeatMode";
import { ObjectToDotNotation } from "../preload/utils";
import { APP_ID } from "../shared/consts";
import { platform } from "@electron-toolkit/utils";
import {
  MprisEventData,
  MprisEventListener,
  MprisEventName,
} from "../shared/types/api";
import { MediaPlayerInfo } from "../shared/models/mediaPlayerInfo";

let player: Player;

export function addMPRIS(eventListener: MprisEventListener<MprisEventName>) {
  if (platform.isLinux) {
    try {
      player = new Player({
        name: "synara",
        identity: APP_ID,
        supportedUriSchemes: ["file"],
        supportedMimeTypes: ["audio/mpeg", "audio/flac", "application/ogg"],
        supportedInterfaces: ["player"],
      });

      const events: Array<MprisEventName> = [
        "next",
        "previous",
        "pause",
        "playpause",
        "stop",
        "play",
        "loopStatus",
        "shuffle",
        "seek",
        "volume",
        "position",
        "open",
      ];
      events.forEach(function (eventName) {
        player.on(eventName, function (event: MprisEventData<MprisEventName>) {
          eventListener(eventName, event);
        });
      });
    } catch (_) {
      /* empty */
    }
  }
}

export function updateMpris(mediaInfo: MediaInfo) {
  if (player) {
    try {
      const mediaPlayer: MediaPlayerInfo = {
        ...(mediaInfo.player ?? {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...((player.metadata as any)?.player ?? {}),
      };
      player.metadata = {
        ...player.metadata,
        ...{
          "xesam:title": mediaInfo.title,
          "xesam:artist": mediaInfo.artists,
          "xesam:album": mediaInfo.album,
          "xesam:url": mediaInfo.url,
          "mpris:artUrl": mediaInfo.image,
          "mpris:length": mediaInfo.duration,
          "mpris:trackid": "/org/mpris/MediaPlayer2/track/" + mediaInfo.trackId,
        },
        ...ObjectToDotNotation(
          { ...mediaInfo, player: mediaPlayer },
          "custom:",
        ),
      };
      player.getPosition = () => mediaInfo.current * 1000;
      player.playbackStatus = mediaPlayer?.status ?? PlaybackStatus.Stopped;
      player.shuffle = mediaPlayer?.shuffle === true;
      player.loopStatus = mediaPlayer?.repeat ?? RepeatMode.None;
      player.volume = mediaPlayer?.volume ?? 0;

      player.canPlay = true;
      player.canPause = true;
      player.canSeek = true;
      player.canControl = true;
      player.canGoNext = true;
      player.canGoPrevious = true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(mediaInfo);
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }
}
