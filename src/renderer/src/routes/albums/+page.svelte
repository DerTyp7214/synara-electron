<script lang="ts">
  import SongList from "$lib/components/SongList.svelte";
  import { page } from "$app/state";
  import type { PagedResponse } from "$lib/api/apiTypes";
  import type { Song } from "$lib/api/songs";
  import { PlayingSourceType } from "$lib/audio/mediaSession";
  import { listSongsByAlbum, type Album, byId } from "$lib/api/albums";
  import cn from "classnames";

  let albumId = $derived(page.url.searchParams.get("albumId")) as
    | Album["id"]
    | null;

  async function getSongs(
    page: number,
    pageSize: number,
  ): Promise<PagedResponse<Song>> {
    if (!albumId) return { data: [], page, pageSize, hasNextPage: false };
    return listSongsByAlbum(albumId, page, pageSize);
  }
</script>

<div class={cn("flex max-h-full w-full flex-1 flex-col overflow-y-auto")}>
  {#key albumId}
    {#if albumId}
      {#await byId(albumId) then album}
        <div>{album.name}</div>
      {/await}
      <div class="flex-1 p-8">
        <SongList
          {getSongs}
          hideAlbum
          pageSize={250}
          playingSource={{
            type: PlayingSourceType.Album,
            id: albumId,
          }}
        />
      </div>
    {/if}
  {/key}
</div>
