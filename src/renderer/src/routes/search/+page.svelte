<script lang="ts">
  import { page } from "$app/state";
  import { Search } from "@jis3r/icons";
  import { querySongs } from "$lib/api/songs";
  import SongItem from "$lib/components/SongItem.svelte";
  import { PlayingSourceType } from "$shared/types/settings";
  import type { Album, Artist, Playlist, Song } from "$shared/types/beApi";
  import { queryAlbums } from "$lib/api/albums";
  import { queryArtists } from "$lib/api/artists";
  import { queryPlaylists } from "$lib/api/playlists";
  import PlaylistItem from "$lib/components/PlaylistItem.svelte";
  import ArtistItem from "$lib/components/ArtistItem.svelte";
  import { getImageUrl } from "$lib/utils";
  import AlbumItem from "$lib/components/AlbumItem.svelte";

  let searchQuery = $derived(page.url.searchParams.get("query")) as
    | string
    | null;

  let songs = $state<Array<Song>>([]);
  let albums = $state<Array<Album>>([]);
  let artists = $state<Array<Artist>>([]);
  let playlists = $state<Array<Playlist>>([]);

  async function search(query: string | null) {
    if (!query || query.length < 3) return;

    songs = await querySongs(query, 0, 5).then((r) => r.data);
    albums = await queryAlbums(query, 0, 5).then((r) => r.data);
    artists = await queryArtists(query, 0, 5).then((r) => r.data);
    playlists = await queryPlaylists(query, 0, 5).then((r) => r.data);
  }

  $effect(() => {
    search(searchQuery);
  });
</script>

<div class="flex h-full max-h-full w-full flex-col gap-4 overflow-y-auto p-4">
  <span class="h2">Results for: <span class="italic">{searchQuery}</span></span>
  <div class="flex flex-col gap-2 p-4">
    <span class="h3">Songs</span>
    {#each songs as song (song.id)}
      <SongItem
        {...song}
        songRef={song}
        playlistRef={songs}
        playingSource={{
          id: song.id,
          type: PlayingSourceType.SongSearch,
        }}
      />
    {/each}

    {#if songs.length > 0}
      <button
        type="button"
        class="btn preset-filled-secondary-300-700 me-auto mt-4"
      >
        <span>Button</span>
        <Search size={18} />
      </button>
    {:else}
      <span>No results</span>
    {/if}
  </div>

  <div class="flex flex-col gap-2 p-4">
    <span class="h3">Albums</span>
    <div class="flex w-full flex-row gap-2 overflow-x-auto">
      {#each albums as album (album.id)}
        <AlbumItem
          class="w-max max-w-sm flex-1"
          albumRef={album}
          name={album.name}
          songCount={album.songCount}
          by={album.artists}
          imageUrl={getImageUrl(album.coverId)}
        />
      {/each}
    </div>

    {#if albums.length > 0}
      <button
        type="button"
        class="btn preset-filled-secondary-300-700 me-auto mt-4"
      >
        <span>Button</span>
        <Search size={18} />
      </button>
    {:else}
      <span>No results</span>
    {/if}
  </div>

  <div class="flex flex-col gap-2 p-4">
    <span class="h3">Artists</span>
    <div class="flex w-full flex-row gap-2 overflow-x-auto">
      {#each artists as artist (artist.id)}
        <ArtistItem
          artistRef={artist}
          name={artist.name}
          size={96}
          imageUrl={getImageUrl(artist.imageId)}
        />
      {/each}
    </div>

    {#if artists.length > 0}
      <button
        type="button"
        class="btn preset-filled-secondary-300-700 me-auto mt-4"
      >
        <span>Button</span>
        <Search size={18} />
      </button>
    {:else}
      <span>No results</span>
    {/if}
  </div>

  <div class="flex flex-col gap-2 p-4">
    <span class="h3">Playlists</span>
    <div class="flex w-full flex-row gap-2 overflow-x-auto">
      {#each playlists as playlist (playlist.id)}
        <PlaylistItem
          playlistRef={playlist}
          name={playlist.name}
          songCount={playlist.songs.length}
        />
      {/each}
    </div>

    {#if playlists.length > 0}
      <button
        type="button"
        class="btn preset-filled-secondary-300-700 me-auto mt-4"
      >
        <span>Button</span>
        <Search size={18} />
      </button>
    {:else}
      <span>No results</span>
    {/if}
  </div>
</div>
