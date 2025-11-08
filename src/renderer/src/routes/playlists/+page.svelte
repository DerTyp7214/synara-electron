<script lang="ts">
  import { Avatar } from "@skeletonlabs/skeleton-svelte";
  import { page } from "$app/state";
  import type { PagedResponse } from "$lib/api/apiTypes";
  import { byId, listSongsByPlaylist, type Playlist } from "$lib/api/playlists";
  import type { Song } from "$lib/api/songs";
  import { getImageUrl } from "$lib/utils";
  import { t } from "$lib/i18n/i18n";
  import { millisecondsToHumanReadable } from "$lib/utils.js";
  import { Play, Shuffle } from "@lucide/svelte";
  import { playPlaylist } from "$lib/mediaPlayer";
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import SongItem from "$lib/components/SongItem.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { PlayingSourceType } from "$shared/types/settings";

  let playlistId = $derived(page.url.searchParams.get("playlistId")) as
    | Playlist["id"]
    | null;

  async function getSongs(
    page: number,
    pageSize: number,
  ): Promise<PagedResponse<Song>> {
    if (!playlistId) return { data: [], page, pageSize, hasNextPage: false };
    return listSongsByPlaylist(playlistId, page, pageSize);
  }

  let items: Array<Song> = $state([]);

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    playlistId;

    items = [];
  });
</script>

{#key playlistId}
  {#if playlistId}
    <InfiniteScroll
      class="flex h-full max-h-full w-full flex-1 flex-col gap-2 overflow-y-auto"
      pageSize={80}
      bind:items
      initialPageUp={-1}
      initialPageDown={0}
      loadMoreUp={getSongs}
      loadMoreDown={getSongs}
    >
      {#snippet head()}
        {#await byId(playlistId) then playlist}
          <div class="flex flex-col p-4">
            <div class="flex flex-row">
              <Avatar
                class="rounded-container"
                style="min-width: 128px; min-height: 128px; max-width: 128px; max-height: 128px;"
              >
                <Avatar.Image src={getImageUrl(playlist.imageId, 128)} />
                <Avatar.Fallback class="bg-tertiary-100-900"
                  >{playlist.name
                    .split(" ")
                    .slice(0, 2)
                    .map((s) => s.substring(0, 1).toUpperCase())
                    .join("")}</Avatar.Fallback
                >
              </Avatar>
              <div class="flex flex-col px-4 py-2">
                <span class="h3">{playlist.name}</span>
                <span class="text-surface-contrast-50-950/70">
                  {$t("duration")}: {millisecondsToHumanReadable(
                    playlist.totalDuration,
                  )}
                </span>
                <span class="text-surface-contrast-50-950/70"
                  >{$t("n-songs", {
                    amount: playlist.songs.length.toString(),
                  })}</span
                >
              </div>
            </div>
            <div class="flex flex-row gap-3 p-4 pb-0">
              <button
                type="button"
                class="btn preset-filled-secondary-500 rounded-container px-12"
                onclick={() => playPlaylist(playlist)}
              >
                <Play size="18" />
                Play
              </button>
              <button
                type="button"
                class="btn preset-filled-secondary-900-100 rounded-container px-12"
                onclick={() => playPlaylist(playlist, true)}
              >
                <Shuffle size="18" />
                Shuffle
              </button>
            </div>
          </div>
        {/await}
      {/snippet}
      {#snippet renderItem({ item, index })}
        <SongItem
          {...item}
          class="mx-8"
          songRef={item}
          playlistRef={items}
          showNumber={index + 1}
          playingSource={{
            type: PlayingSourceType.Playlist,
            id: playlistId,
          }}
        />
      {/snippet}
      {#snippet loadingDown()}
        <div class="ms-auto me-auto flex w-max items-center gap-3">
          <Spinner />
          <span>{$t("songs.loadMore")}</span>
        </div>
      {/snippet}
    </InfiniteScroll>
  {/if}
{/key}
