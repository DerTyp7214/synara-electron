import { type Song } from "$lib/api/songs";
import { mediaSession } from "$lib/audio/mediaSession";

export async function playSong(song: Song, playlist: Array<Song> = [song]) {
  mediaSession.setQueue(Array.from(playlist));
  await mediaSession.playSong(song.id);
}
