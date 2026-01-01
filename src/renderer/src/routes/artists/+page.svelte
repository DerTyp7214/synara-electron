<script lang="ts">
  import { Avatar } from "@skeletonlabs/skeleton-svelte";
  import { page } from "$app/state";
  import type { PagedResponse } from "$lib/api/apiTypes";
  import { byId, listSongsByArtist, type Artist } from "$lib/api/artists";
  import type { Song } from "$lib/api/songs";
  import { copy, distinctBy, getImageUrl } from "$lib/utils/utils";
  import { t } from "$lib/i18n/i18n";
  import { Play, Shuffle } from "@lucide/svelte";
  import { ChevronRight } from "@jis3r/icons";
  import { playArtist } from "$lib/utils/mediaPlayer";
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import SongItem from "$lib/components/SongItem.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { PlayingSourceType } from "$shared/types/settings";
  import type { Album } from "$shared/types/beApi";
  import { byArtistId } from "$lib/api/albums";
  import AlbumItem from "$lib/components/AlbumItem.svelte";
  import cn from "classnames";
  import type { Snapshot } from "@sveltejs/kit";
  import { tick } from "svelte";

  let artistId = $derived(page.url.searchParams.get("artistId")) as
    | Artist["id"]
    | null;

  let albumPage = $state(0);
  let albumPageSize = 25;
  let albumHasNext = $state(true);
  let albumExpanded = $state(false);

  let singlePage = $state(0);
  let singlePageSize = 25;
  let singleHasNext = $state(true);
  let singleExpanded = $state(false);

  async function getSongs(
    page: number,
    pageSize: number,
  ): Promise<PagedResponse<Song>> {
    if (!artistId) return { data: [], page, pageSize, hasNextPage: false };
    return listSongsByArtist(artistId, page, pageSize);
  }

  async function getAlbums(): Promise<Array<Album>> {
    if (!artistId || !albumHasNext) return [];
    const newAlbums = await byArtistId(
      artistId,
      albumPage,
      albumPageSize,
      false,
    );
    albumHasNext = newAlbums.hasNextPage;
    albumItems = distinctBy(
      [...albumItems, ...newAlbums.data],
      (item) => item.id,
    );

    return albumItems;
  }

  async function getSingles(): Promise<Array<Album>> {
    if (!artistId || !singleHasNext) return [];
    const newSingles = await byArtistId(
      artistId,
      singlePage,
      singlePageSize,
      true,
    );
    singleHasNext = newSingles.hasNextPage;
    singleItems = distinctBy(
      [...singleItems, ...newSingles.data],
      (item) => item.id,
    );

    return singleItems;
  }

  let singleItems: Array<Album> = $state([]);
  let albumItems: Array<Album> = $state([]);
  let songItems: Array<Song> = $state([]);

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    artistId;

    songItems = [];

    albumPage = 0;
    albumItems = [];
    albumHasNext = true;
    albumExpanded = false;

    singlePage = 0;
    singleItems = [];
    singleHasNext = true;
    singleExpanded = false;

    nextUpPage = -1;
    nextDownPage = 0;
  });

  $effect(() => {
    if (artistId) {
      getAlbums();
      getSingles();
    }
  });

  let scrollContainer: HTMLDivElement | undefined = $state();
  let nextUpPage: number = $state(-1);
  let nextDownPage: number = $state(0);

  export const snapshot: Snapshot<{
    songItems: Array<Song>;
    albumPage: number;
    albumItems: Array<Album>;
    albumExpanded: boolean;
    singlePage: number;
    singleItems: Array<Album>;
    singleExpanded: boolean;

    nextUpPage: number;
    nextDownPage: number;

    scrollPosition: number;
  }> = {
    capture: () => ({
      songItems: copy(songItems),
      albumPage,
      albumItems,
      albumExpanded,
      singlePage,
      singleItems,
      singleExpanded,

      nextUpPage,
      nextDownPage,

      scrollPosition: scrollContainer?.scrollTop ?? 0,
    }),
    restore: async (state) => {
      songItems = state.songItems;
      albumPage = state.albumPage;
      albumItems = state.albumItems;
      albumExpanded = state.albumExpanded;
      singlePage = state.singlePage;
      singleItems = state.singleItems;
      singleExpanded = state.singleExpanded;

      nextDownPage = state.nextDownPage;
      nextUpPage = state.nextUpPage;

      await tick();

      scrollContainer?.scrollTo({
        top: state.scrollPosition,
        behavior: "instant",
      });
    },
  };
</script>

{#key artistId}
  {#if artistId}
    <InfiniteScroll
      class="flex h-full max-h-full w-full flex-1 flex-col gap-2 overflow-y-auto"
      pageSize={80}
      bind:items={songItems}
      bind:scrollContainer
      bind:nextUpPage
      bind:nextDownPage
      loadMoreUp={getSongs}
      loadMoreDown={getSongs}
    >
      {#snippet head()}
        {#await byId(artistId) then artist}
          <div class="flex flex-col p-4">
            <div class="flex flex-row">
              <Avatar
                class="rounded-container"
                style="min-width: 128px; min-height: 128px; max-width: 128px; max-height: 128px;"
              >
                <Avatar.Image src={getImageUrl(artist.imageId, 128)} />
                <Avatar.Fallback class="bg-tertiary-100-900"
                  >{artist.name
                    .split(" ")
                    .slice(0, 2)
                    .map((s) => s.substring(0, 1).toUpperCase())
                    .join("")}</Avatar.Fallback
                >
              </Avatar>
              <div class="flex flex-col px-4 py-2">
                <span class="h3">{artist.name}</span>
              </div>
            </div>
            <div class="flex flex-row gap-3 p-4 pb-0">
              <button
                type="button"
                class="btn preset-filled-secondary-500 rounded-container px-12"
                onclick={() => playArtist(artist)}
              >
                <Play size="18" />
                Play
              </button>
              <button
                type="button"
                class="btn preset-filled-secondary-900-100 rounded-container px-12"
                onclick={() => playArtist(artist, true)}
              >
                <Shuffle size="18" />
                Shuffle
              </button>
            </div>
          </div>
        {/await}
        <div class="flex flex-col p-4">
          <button
            class="h5 flex items-center ps-4 text-start"
            onclick={() => (albumExpanded = !albumExpanded)}
          >
            <span>Albums</span>
            <ChevronRight
              class={cn("transition-transform", {
                "rotate-90": albumExpanded,
              })}
            />
          </button>
          <div
            class="3xl:grid-cols-5 grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          >
            {#each albumExpanded ? albumItems : albumItems.slice(0, 5) as album, i (album.id + i)}
              <AlbumItem
                class="h-full w-full"
                albumRef={album}
                name={album.name}
                songCount={album.songCount}
                by={album.artists}
                imageUrl={getImageUrl(album.coverId)}
              />
            {/each}
            {#if albumHasNext}
              <button
                type="button"
                class="btn preset-filled-secondary-300-700 me-auto mt-4"
                onclick={getAlbums}
              >
                <span>Button</span>
              </button>
            {/if}
          </div>
        </div>
        <div class="flex flex-col p-4">
          <button
            class="h5 flex items-center ps-4 text-start"
            onclick={() => (singleExpanded = !singleExpanded)}
          >
            <span>Singles</span>
            <ChevronRight
              class={cn("transition-transform", {
                "rotate-90": singleExpanded,
              })}
            />
          </button>
          <div
            class="3xl:grid-cols-5 grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          >
            {#each singleExpanded ? singleItems : singleItems.slice(0, 5) as single, i (single.id + i)}
              <AlbumItem
                class="h-full w-full"
                albumRef={single}
                name={single.name}
                songCount={single.songCount}
                by={single.artists}
                imageUrl={getImageUrl(single.coverId)}
              />
            {/each}
            {#if singleHasNext}
              <button
                type="button"
                class="btn preset-filled-secondary-300-700 me-auto mt-4"
                onclick={getSingles}
              >
                <span>Button</span>
              </button>
            {/if}
          </div>
        </div>
      {/snippet}
      {#snippet renderItem({ item, index })}
        <SongItem
          {...item}
          bind:isFavourite={item.isFavourite}
          class="mx-8"
          songRef={item}
          playlistRef={songItems}
          showNumber={index + 1}
          playingSource={{
            type: PlayingSourceType.Artist,
            id: artistId,
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
