<script lang="ts">
  import SongItem from "$lib/components/SongItem.svelte";
  import type { PagedResponse } from "$lib/api/apiTypes";
  import type { Song } from "$lib/api/songs";
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import type { PlayingSource } from "$shared/types/settings";

  const {
    getSongs,
    pageSize = 120,
    playingSource,
    hideAlbum = false,
  }: {
    getSongs(page: number, pageSize: number): Promise<PagedResponse<Song>>;
    pageSize: number;
    playingSource: PlayingSource;
    hideAlbum?: boolean;
  } = $props();

  let items: Array<Song> = $state([]);
</script>

<InfiniteScroll
  class="gap-2"
  {pageSize}
  bind:items
  initialPageUp={-1}
  initialPageDown={0}
  loadMoreUp={getSongs}
  loadMoreDown={getSongs}
>
  {#snippet renderItem({ item, index })}
    <SongItem
      {...item}
      {playingSource}
      songRef={item}
      playlistRef={items}
      showNumber={index + 1}
      {hideAlbum}
    />
  {/snippet}
</InfiniteScroll>
