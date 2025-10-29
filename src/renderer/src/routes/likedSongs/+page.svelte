<script lang="ts">
  import { listSongs, type Song } from "$lib/api/songs.js";
  import { t } from "$lib/i18n/i18n.js";
  import { debugLog } from "$lib/logger";
  import { onMount } from "svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import SongItem from "$lib/components/SongItem.svelte";

  let isLoading = $state(false);
  let hasNextPage = $state(true);
  let songPage = $state(0);
  let allSongs = $state<Array<Song>>([]);

  async function loadSongPage() {
    if (isLoading || !hasNextPage) return;

    isLoading = true;
    try {
      const response = await listSongs(songPage, 120);

      hasNextPage = response.hasNextPage;
      allSongs = [...allSongs, ...response.data];
      songPage = response.page + 1;
    } catch (e) {
      debugLog("error", e);
    }

    isLoading = false;
  }

  onMount(() => {
    loadSongPage();
  });
</script>

<div class="flex flex-col gap-2">
  {#each allSongs as song, i (song.id)}
    <SongItem
      {...song}
      songRef={song}
      playlistRef={allSongs}
      showNumber={i + 1}
    />
  {/each}
  {#if hasNextPage}
    <button
      disabled={isLoading}
      type="button"
      class="btn btn-sm preset-outlined-surface-700-300 mt-2"
      onclick={loadSongPage}
    >
      {#if isLoading}
        <Spinner size={12} />
      {/if}
      {$t("songs.loadMore")}</button
    >
  {/if}
</div>
