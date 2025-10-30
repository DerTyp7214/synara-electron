import { type Song } from "$lib/api/songs";
import {
  mediaSession,
  type PlayingSource,
  PlayingSourceType,
} from "$lib/audio/mediaSession";
import { listSongsByPlaylist, type Playlist } from "$lib/api/playlists";
import { tick } from "svelte";

export async function playSong(
  song: Song,
  playlist: Array<Song> = [song],
  source: PlayingSource,
  shuffle: boolean = false,
): Promise<void> {
  mediaSession.setQueue(Array.from(playlist));
  mediaSession.playingSourceType.set(source.type);
  mediaSession.playingSourceId.set(source.id);
  await tick();
  await mediaSession.playSong(song.id, shuffle);
}

export async function playPlaylist(
  playlist: Playlist,
  shuffle: boolean = false,
): Promise<void> {
  const response = await listSongsByPlaylist(
    playlist.id,
    0,
    Number.MAX_SAFE_INTEGER,
  );

  const index = shuffle ? Math.floor(Math.random() * playlist.songs.length) : 0;

  mediaSession.shuffled.set(shuffle);
  await playSong(
    response.data[index],
    response.data,
    {
      type: PlayingSourceType.Playlist,
      id: playlist.id,
    },
    shuffle,
  );
}
