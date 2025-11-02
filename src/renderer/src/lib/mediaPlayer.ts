import { type Song, songById } from "$lib/api/songs";
import {
  mediaSession,
  type PlayingSource,
  PlayingSourceType,
} from "$lib/audio/mediaSession";
import { listSongsByPlaylist, type Playlist } from "$lib/api/playlists";
import { type Album, listSongsByAlbum } from "$lib/api/albums";

export async function playSongById(id: Song["id"]) {
  if (!mediaSession.getQueue().find((s) => s.id === id)) {
    const song = await songById(id as Song["id"]);
    mediaSession.setQueue([song]);
  }
  mediaSession.playingSourceType.set(PlayingSourceType.Playlist);
  mediaSession.playingSourceId.set(id);
  await mediaSession.playSong(id);
}

export async function playAlbumById(id: Album["id"]) {
  const songs = await listSongsByAlbum(id, 0, Number.MAX_SAFE_INTEGER);
  mediaSession.setQueue(songs.data);
  mediaSession.playingSourceType.set(PlayingSourceType.Album);
  mediaSession.playingSourceId.set(id);
  await mediaSession.playSong(songs.data[0].id);
}

export async function playPlaylistById(id: Playlist["id"]) {
  const songs = await listSongsByPlaylist(id, 0, Number.MAX_SAFE_INTEGER);
  mediaSession.setQueue(songs.data);
  mediaSession.playingSourceType.set(PlayingSourceType.Playlist);
  mediaSession.playingSourceId.set(id);
  await mediaSession.playSong(songs.data[0].id);
}

export async function playSong(
  song: Song,
  playlist: Array<Song> = [song],
  source: PlayingSource,
  shuffle: boolean = false,
): Promise<void> {
  mediaSession.setQueue(Array.from(playlist));
  mediaSession.playingSourceType.set(source.type);
  mediaSession.playingSourceId.set(source.id);
  await mediaSession.playSong(song.id, shuffle);
  mediaSession.shuffled.set(shuffle);
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

export async function playAlbum(
  album: Album,
  shuffle: boolean = false,
): Promise<void> {
  const response = await listSongsByAlbum(album.id, 0, Number.MAX_SAFE_INTEGER);

  const index = shuffle ? Math.floor(Math.random() * album.songCount) : 0;

  mediaSession.shuffled.set(shuffle);
  await playSong(
    response.data[index],
    response.data,
    {
      type: PlayingSourceType.Album,
      id: album.id,
    },
    shuffle,
  );
}
