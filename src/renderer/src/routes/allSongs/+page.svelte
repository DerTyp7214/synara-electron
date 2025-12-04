<script lang="ts">
  import { listSongs, type Song } from "$lib/api/songs.js";
  import SongItem from "$lib/components/SongItem.svelte";
  import SvelteVirtualList from "@humanspeak/svelte-virtual-list";
  import { onMount } from "svelte";
  import { MAX_INT } from "$lib/consts";
  import {
    type PlayingSource,
    PlayingSourceType,
  } from "$shared/types/settings";
  import { defaultNavigation } from "$lib/utils";
  import { onNavigate } from "$app/navigation";

  const playingSource: PlayingSource = {
    type: PlayingSourceType.LikedSongs,
    id: "--LikedSongs--",
  };

  let items: Array<Song> = $state([]);

  onMount(async () => {
    const response = await listSongs(0, MAX_INT);
    items = [...response.data];
  });

  onNavigate(defaultNavigation);
</script>

<SvelteVirtualList
  {items}
  defaultEstimatedItemHeight={72}
  itemsClass="gap-2 flex flex-col p-8"
>
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
