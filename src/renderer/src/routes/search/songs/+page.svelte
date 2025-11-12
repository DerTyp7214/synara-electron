<script lang="ts">
  import { page } from "$app/state";
  import { querySongs, type Song } from "$lib/api/songs.js";
  import SongItem from "$lib/components/SongItem.svelte";
  import SvelteVirtualList from "@humanspeak/svelte-virtual-list";
  import { MAX_INT } from "$lib/consts";
  import {
    type PlayingSource,
    PlayingSourceType,
  } from "$shared/types/settings";
  import { ArrowLeft } from "@jis3r/icons";
  import { onNavigate } from "$app/navigation";
  import { defaultNavigation } from "$lib/utils";

  const playingSource: PlayingSource = {
    type: PlayingSourceType.LikedSongs,
    id: "--SearchedSongs--",
  };

  let searchQuery = $derived(page.url.searchParams.get("query")) as
    | string
    | null;

  let items: Array<Song> = $state([]);

  async function search(query: string) {
    const response = await querySongs(query, 0, MAX_INT);
    items = [...response.data];
  }

  $effect(() => {
    if (searchQuery) search(searchQuery);
  });

  function navigateBack() {
    window.history.back();
  }

  onNavigate(defaultNavigation);
</script>

<div class="flex h-full w-full flex-col gap-2">
  <div class="ms-4 me-auto mt-4 flex items-center gap-2">
    <button class="flex" onclick={navigateBack}>
      <ArrowLeft />
    </button>
    <span class="h5">
      Results for: <span class="italic">{searchQuery}</span>
    </span>
  </div>
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
</div>
