<script lang="ts">
  import { listSongs, type Song } from "$lib/api/songs.js";
  import {
    type PlayingSource,
    PlayingSourceType,
  } from "$lib/audio/mediaSession";
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import SongItem from "$lib/components/SongItem.svelte";
  import { t } from "$lib/i18n/i18n";
  import Spinner from "$lib/components/Spinner.svelte";

  const playingSource: PlayingSource = {
    type: PlayingSourceType.LikedSongs,
    id: "----",
  };

  let items: Array<Song> = $state([]);
</script>

<InfiniteScroll
  class="max-h-full w-full flex-1 gap-2 overflow-y-auto p-8"
  pageSize={80}
  bind:items
  initialPageUp={-1}
  initialPageDown={0}
  loadMoreUp={listSongs}
  loadMoreDown={listSongs}
>
  {#snippet renderItem({ item, index })}
    <SongItem
      {...item}
      {playingSource}
      songRef={item}
      playlistRef={items}
      showNumber={index + 1}
    />
  {/snippet}
  {#snippet loadingDown()}
    <div class="ms-auto me-auto flex w-max items-center gap-3">
      <Spinner />
      <span>{$t("songs.loadMore")}</span>
    </div>
  {/snippet}
</InfiniteScroll>
