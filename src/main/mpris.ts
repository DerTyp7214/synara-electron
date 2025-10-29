import Player from "mpris-service";
import { MediaInfo } from "../shared/models/mediaInfo";
import { PlaybackStatus } from "../shared/models/playbackStatus";
import { RepeatMode } from "../shared/models/repeatMode";
import { ObjectToDotNotation } from "../preload/utils";

let player: Player;

export function addMPRIS() {
  if (process.platform === "linux") {
    try {
      player = new Player({
        name: "synara",
        identity: "dev.dertyp.synara",
        supportedUriSchemes: ["file"],
        supportedMimeTypes: ["audio/mpeg", "audio/flac", "application/ogg"],
        supportedInterfaces: ["player"],
      });
    } catch (_) {}
  }
}

export function updateMpris(mediaInfo: MediaInfo) {
  if (player) {
    player.metadata = {
      "xesam:title": mediaInfo.title,
      "xesam:artist": mediaInfo.artists,
      "xesam:album": mediaInfo.album,
      "xesam:url": mediaInfo.url,
      "mpris:artUrl": mediaInfo.image,
      "mpris:length": mediaInfo.duration,
      "mpris:trackid": "/org/mpris/MediaPlayer2/track/" + mediaInfo.trackId,
      ...ObjectToDotNotation(mediaInfo, "custom:"),
    };
    player.playbackStatus = mediaInfo.player?.status ?? PlaybackStatus.Stopped;
    player.shuffle = mediaInfo.player?.shuffle === true;
    player.loopStatus = mediaInfo.player?.repeat ?? RepeatMode.None;
    player.volume = mediaInfo.player?.volume ?? 0;
  }
}
