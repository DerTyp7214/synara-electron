<script lang="ts">
  import { listPlaylists, type Playlist } from "$lib/api/playlists.js";
  import PlaylistItem from "$lib/components/PlaylistItem.svelte";
  import { t } from "$lib/i18n/i18n.js";
  import { debugLog } from "$lib/utils/logger";
  import { onMount } from "svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { getImageUrl } from "$lib/utils/utils";

  let isLoading = $state(false);
  let hasNextPage = $state(true);
  let playlistPage = $state(0);
  let allPlaylists = $state<Array<Playlist>>([]);

  async function loadPlaylistPage() {
    if (isLoading || !hasNextPage) return;

    isLoading = true;
    try {
      const response = await listPlaylists(playlistPage);

      hasNextPage = response.hasNextPage;
      allPlaylists = [...allPlaylists, ...response.data];
      playlistPage = response.page + 1;
    } catch (e) {
      debugLog("error", e);
    }

    isLoading = false;
  }

  const { size }: { size?: number } = $props();

  onMount(() => {
    loadPlaylistPage();
  });
</script>

{#each allPlaylists as playlist (playlist.id)}
  <PlaylistItem
    playlistRef={playlist}
    name={playlist.name}
    imageUrl={getImageUrl(playlist.imageId, size)}
    songCount={playlist.songs.length}
    {size}
  />
{/each}
{#if hasNextPage}
  <button
    disabled={isLoading}
    type="button"
    class="btn btn-sm preset-outlined-surface-700-300 mt-2"
    onclick={loadPlaylistPage}
  >
    {#if isLoading}
      <Spinner size={12} />
    {/if}
    {$t("playlists.loadMore")}
  </button>
{/if}
