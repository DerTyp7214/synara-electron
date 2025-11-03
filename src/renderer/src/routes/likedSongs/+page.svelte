<script lang="ts">
  import { listSongs, type Song } from "$lib/api/songs.js";
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import SongItem from "$lib/components/SongItem.svelte";
  import SvelteVirtualList from "@humanspeak/svelte-virtual-list";
  import { t } from "$lib/i18n/i18n";
  import Spinner from "$lib/components/Spinner.svelte";
  import { onMount } from "svelte";
  import { MAX_INT } from "$lib/consts";
  import {
    type PlayingSource,
    PlayingSourceType,
  } from "$shared/types/settings";

  const playingSource: PlayingSource = {
    type: PlayingSourceType.LikedSongs,
    id: "----",
  };

  let items: Array<Song> = $state([]);

  onMount(async () => {
    const response = await listSongs(0, MAX_INT);
    items = [...response.data];
  });
</script>

<SvelteVirtualList {items} itemsClass="gap-2 flex flex-col p-8">
  {#snippet renderItem(item, index)}
    <SongItem
      {...item}
      {playingSource}
      songRef={item}
      playlistRef={items}
      showNumber={index + 1}
    />
  {/snippet}
</SvelteVirtualList>

<!--
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
-->
