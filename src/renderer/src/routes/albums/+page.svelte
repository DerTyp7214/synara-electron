<script lang="ts">
  import { Avatar } from "@skeletonlabs/skeleton-svelte";
  import { page } from "$app/state";
  import type { PagedResponse } from "$lib/api/apiTypes";
  import type { Song } from "$lib/api/songs";
  import { type Album, byId, listSongsByAlbum } from "$lib/api/albums";
  import { defaultNavigation, getImageUrl } from "$lib/utils/utils";
  import { t } from "$lib/i18n/i18n";
  import { millisecondsToHumanReadable } from "$lib/utils/utils";
  import { Play, Shuffle } from "@lucide/svelte";
  import { playAlbum } from "$lib/utils/mediaPlayer";
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import SongItem from "$lib/components/SongItem.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import cn from "classnames";
  import { resolve } from "$app/paths";
  import { PlayingSourceType } from "$shared/types/settings";
  import { onNavigate } from "$app/navigation";

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

  let items: Array<Song> = $state([]);

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    albumId;

    items = [];
  });

  onNavigate(defaultNavigation);
</script>

{#key albumId}
  {#if albumId}
    <InfiniteScroll
      class="flex h-full max-h-full w-full flex-col gap-2 overflow-y-auto"
      pageSize={80}
      bind:items
      initialPageUp={-1}
      initialPageDown={0}
      loadMoreUp={getSongs}
      loadMoreDown={getSongs}
    >
      {#snippet head()}
        {#await byId(albumId) then album}
          <div class="flex flex-col p-4">
            <div class="flex flex-row">
              <Avatar
                class="rounded-container"
                style="min-width: 128px; min-height: 128px; max-width: 128px; max-height: 128px;"
              >
                <Avatar.Image src={getImageUrl(album.coverId, 128)} />
                <Avatar.Fallback class="bg-tertiary-100-900"
                  >{album.name
                    .split(" ")
                    .slice(0, 2)
                    .map((s) => s.substring(0, 1).toUpperCase())
                    .join("")}</Avatar.Fallback
                >
              </Avatar>
              <div class="flex flex-col px-4 py-2">
                <span class="h3">{album.name}</span>
                <div class="text-surface-contrast-50-950/50">
                  <span class="text-sm">
                    {album.releaseDate}
                  </span>
                  <span class="min-w-max">·</span>
                  {#each album.artists as artist, i (artist.id)}
                    <a
                      href="{resolve('/artists')}?artistId={artist.id}"
                      class={cn(
                        "hover:text-surface-contrast-50-950/80",
                        "transition-colors",
                        "text-sm",
                        "font-medium",
                        "whitespace-nowrap",
                      )}>{artist.name}</a
                    >
                    {#if i < album.artists.length - 1}
                      <span>,&nbsp;</span>
                    {/if}
                  {/each}
                </div>
                <span class="text-surface-contrast-50-950/70">
                  {$t("duration")}: {millisecondsToHumanReadable(
                    album.totalDuration,
                  )}
                </span>
                <span class="text-surface-contrast-50-950/70"
                  >{$t("n-songs", {
                    amount: album.songCount.toString(),
                  })}</span
                >
              </div>
            </div>
            <div class="flex flex-row gap-3 p-4 pb-0">
              <button
                type="button"
                class="btn preset-filled-secondary-500 rounded-container px-12"
                onclick={() => playAlbum(album)}
              >
                <Play size="18" />
                Play
              </button>
              <button
                type="button"
                class="btn preset-filled-secondary-900-100 rounded-container px-12"
                onclick={() => playAlbum(album, true)}
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
          hideAlbum
          playingSource={{
            type: PlayingSourceType.Album,
            id: albumId,
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
