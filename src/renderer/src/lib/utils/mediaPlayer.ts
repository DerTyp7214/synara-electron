import { type Song, songById } from "$lib/api/songs";
import { mediaSession } from "$lib/audio/mediaSession";
import {
  listSongsByPlaylist,
  type Playlist,
  byId as playlistById,
} from "$lib/api/playlists";
import {
  type Album,
  listSongsByAlbum,
  byId as albumById,
} from "$lib/api/albums";
import { type PlayingSource, PlayingSourceType } from "$shared/types/settings";
import { Queue } from "$lib/audio/queue";
import { get } from "svelte/store";
import { settings } from "$lib/utils/settings";
import type {
  Artist,
  MinimalSong,
  SongWithPosition,
} from "$shared/types/beApi";
import { listSongsByArtist } from "$lib/api/artists";
import { listSongsByUserPlaylist } from "$lib/api/userPlaylists";

export async function playSongById(id: Song["id"]) {
  if (!mediaSession.getQueue().find((s) => s.id === id)) {
    const song = await songById(id as Song["id"]);
    mediaSession.setQueue(
      new Queue({ id: song.id, name: song.title, initialQueue: [song] }),
    );
  }
  mediaSession.playingSourceType.set(PlayingSourceType.Playlist);
  await mediaSession.playSong(id);
}

export async function playAlbumById(id: Album["id"]) {
  const album = await albumById(id);
  const songs = await listSongsByAlbum(id, 0, Number.MAX_SAFE_INTEGER);
  mediaSession.setQueue(
    new Queue({
      id: id,
      name: album.name,
      initialQueue: songs.data,
    }),
  );
  mediaSession.playingSourceType.set(PlayingSourceType.Album);
  await mediaSession.playSong(songs.data[0].id);
}

export async function playPlaylistById(id: Playlist["id"]) {
  const playlist = await playlistById(id);
  const songs = await listSongsByPlaylist(id, 0, Number.MAX_SAFE_INTEGER);
  mediaSession.setQueue(
    new Queue({
      id: id,
      name: playlist.name,
      initialQueue: songs.data,
    }),
  );
  mediaSession.playingSourceType.set(PlayingSourceType.Playlist);
  await mediaSession.playSong(songs.data[0].id);
}

export async function playSong(
  song: Song | SongWithPosition,
  playlist: Array<Omit<MinimalSong, "position">> = [song],
  source: PlayingSource,
  shuffle: boolean = get(settings.shuffle),
): Promise<void> {
  const currentQueue = get(mediaSession.getDerivedQueue());
  const newQueue =
    currentQueue.id !== source.id || currentQueue.length() !== playlist.length;
  if (newQueue) {
    const queue = new Queue({
      id: source.id,
      name: source.type,
      initialQueue: playlist,
      shuffled: shuffle,
    });
    mediaSession.setQueue(queue);
    queue.shuffle(shuffle);
    mediaSession.playingSourceType.set(source.type);
  }
  if ("position" in song)
    await mediaSession.playSongWithPosition(song, shuffle);
  else await mediaSession.playSong(song.id);
}

export async function playNext(...songs: Array<Song>) {
  const currentQueue = get(mediaSession.getDerivedQueue());
  currentQueue.playNext(...songs);
}

export async function addToQueue(...songs: Array<Song>) {
  const currentQueue = get(mediaSession.getDerivedQueue());
  currentQueue.addToQueue(...songs);
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

export async function playUserPlaylist(
  playlist: Playlist,
  shuffle: boolean = false,
): Promise<void> {
  const response = await listSongsByUserPlaylist(
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
      type: PlayingSourceType.UserPlaylist,
      id: playlist.id,
    },
    shuffle,
  );
}

export async function playArtist(
  artist: Artist,
  shuffle: boolean = false,
): Promise<void> {
  const response = await listSongsByArtist(
    artist.id,
    0,
    Number.MAX_SAFE_INTEGER,
  );

  const index = shuffle ? Math.floor(Math.random() * response.data.length) : 0;

  mediaSession.shuffled.set(shuffle);
  await playSong(
    response.data[index],
    response.data,
    {
      type: PlayingSourceType.Artist,
      id: artist.id,
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
