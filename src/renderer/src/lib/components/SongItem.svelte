<script lang="ts">
  import { Avatar } from "@skeletonlabs/skeleton-svelte";
  import { Play, HeartPlus, Heart } from "@lucide/svelte";
  import Spotify from "$lib/assets/Spotify.svelte";
  import Tidal from "$lib/assets/Tidal.svelte";
  import { setLiked, type Song } from "$lib/api/songs";
  import {
    copy,
    getImageUrl,
    getOrigin,
    millisecondsToHumanReadable,
    SongOrigin,
  } from "$lib/utils";
  import cn from "classnames";
  import { resolve } from "$app/paths";
  import ToolTip from "$lib/components/ToolTip.svelte";
  import { addToQueue, playNext, playSong } from "$lib/mediaPlayer";
  import Explicit from "$lib/assets/Explicit.svelte";
  import { mediaSession } from "$lib/audio/mediaSession";
  import type { PlayingSource } from "$shared/types/settings";
  import { openContextMenu } from "$lib/contextMenu/store.svelte";
  import { getContext } from "svelte";
  import {
    MEDIA_PLAYER_CONTEXT_KEY,
    TOAST_CONTEXT_KEY,
    type ToasterContext,
  } from "$lib/consts";
  import { t } from "$lib/i18n/i18n";
  import type { SongWithPosition } from "$shared/types/beApi";
  import { goto } from "$app/navigation";
  import { get, type Writable } from "svelte/store";
  import dayjs from "$lib/dayJsUtils";
  import { debugLog } from "$lib/logger";

  let {
    id,
    title,
    artists,
    album,
    duration,
    coverId,
    explicit,
    showNumber,
    hideAlbum,
    isFavourite = $bindable(false),
    size = 46,
    addedAt,
    originalUrl = "",
    class: clazz = "",
    style = "",
    playingSource,
    playlistRef,
    songRef = $bindable(),
    scrollIntoActive = false,
  }: Song & {
    class?: string;
    style?: string;
    hideAlbum?: boolean;
    showNumber?: number;
    addedAt?: string;
    size?: number;
    playingSource: PlayingSource;
    playlistRef: Array<Song>;
    songRef: Song | SongWithPosition;
    scrollIntoActive?: boolean;
  } = $props();

  let songElement: HTMLDivElement;

  const baseTextClasses = [
    "text-surface-contrast-50-950/50",
    "hover:text-surface-contrast-50-950/80",
    "transition-colors",
    "text-sm",
  ];

  const textClasses = ["line-clamp-1", "overflow-ellipsis", ...baseTextClasses];

  const currentQueue = mediaSession.getDerivedQueue();
  const currentSong = $derived($currentQueue.currentSong);

  const toastContext = getContext<ToasterContext>(TOAST_CONTEXT_KEY);

  $effect(() => {
    if (scrollIntoActive && sameSong) {
      setTimeout(() => {
        songElement?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 400);
    }
  });

  async function handlePlayNext(song: Song) {
    await playNext(song);

    toastContext.success({
      title: $t("play.next"),
      description: $t("play.next.success", { songTitle: song.title }),
      duration: 4000,
    });
  }

  async function handleAddToQueue(song: Song) {
    await addToQueue(song);

    toastContext.success({
      title: $t("play.addToQueue"),
      description: $t("play.addToQueue.success", { songCount: "1" }),
      duration: 4000,
    });
  }

  function handleContextMenu(event: MouseEvent) {
    openContextMenu(event, [
      {
        label: $t("play.next"),
        action: handlePlayNext,
        args: songRef,
      },
      {
        label: $t("play.addToQueue"),
        action: handleAddToQueue,
        args: songRef,
      },
    ]);
  }

  let togglingFavourite = $state(false);
  async function toggleFavourite() {
    if (togglingFavourite) return;
    togglingFavourite = true;

    try {
      const updatedSong = await setLiked(id, !isFavourite);

      if (updatedSong.isFavourite !== isFavourite) {
        songRef.isFavourite = updatedSong.isFavourite;

        if ("position" in songRef)
          get(mediaSession.getDerivedQueue()).updateSong({
            ...songRef,
            isFavourite,
          });
      }
    } catch (e) {
      debugLog("error", e);
    }

    togglingFavourite = false;
  }

  const sameSong = $derived.by(
    () =>
      $currentSong?.id === id &&
      ("position" in songRef
        ? $currentSong?.position === songRef.position
        : true),
  );

  const mediaPlayerContext = getContext<{
    isOpen: Writable<boolean>;
    showQueue: Writable<boolean>;
    showLyrics: Writable<boolean>;
  }>(MEDIA_PLAYER_CONTEXT_KEY);

  function handleClick(block: () => void) {
    return () => {
      if (mediaPlayerContext) mediaPlayerContext.isOpen.set(false);
      block();
    };
  }
</script>

<div
  bind:this={songElement}
  data-songId={id}
  oncontextmenu={handleContextMenu}
  role="listitem"
  {style}
  class={cn(
    "rounded-container box-border",
    "flex flex-row gap-2 p-3 shadow-md",
    "transition-colors select-none",
    clazz,
    {
      "bg-surface-contrast-800-200/40": !sameSong,
      "bg-secondary-300-700/40": sameSong,
    },
  )}
>
  {#if showNumber}
    <span
      class="text-surface-contrast-50-950/50 me-2 mt-auto mb-auto text-sm font-medium tabular-nums"
      >{"position" in songRef ? songRef.position + 1 : showNumber}.</span
    >
  {/if}
  <div
    class="rounded-base relative overflow-clip"
    style="min-width: {size}px; min-height: {size}px; max-width: {size}px; max-height: {size}px;"
  >
    <Avatar class="h-full w-full rounded-none">
      <Avatar.Image src={getImageUrl(coverId, size)} />
      <Avatar.Fallback class="bg-tertiary-100-900"
        >{title
          .split(" ")
          .slice(0, 2)
          .map((s) => s.substring(0, 1).toUpperCase())
          .join("")}</Avatar.Fallback
      >
    </Avatar>
    <button
      onclick={() => playSong(copy(songRef), playlistRef, playingSource)}
      class={cn(
        "bg-surface-50-950/60",
        "absolute top-0 left-0",
        "flex h-full w-full",
        "items-center justify-center",
        "opacity-0 transition-opacity hover:opacity-100",
      )}
    >
      <Play />
    </button>
  </div>
  <div class="flex flex-1 flex-grow flex-col justify-center overflow-hidden">
    <div class="flex flex-row items-center gap-2 pe-1">
      <span class="line-clamp-1 font-medium overflow-ellipsis">{title}</span>
      {#if explicit}
        <Explicit />
      {/if}
    </div>
    <div class="line-clamp-1 flex flex-row">
      {#each artists as artist, i (artist.id)}
        <button
          onclick={handleClick(() =>
            // eslint-disable-next-line svelte/no-navigation-without-resolve
            goto(`${resolve("/artists")}?artistId=${artist.id}`),
          )}
          class={cn(baseTextClasses, "font-medium", "whitespace-nowrap")}
          >{artist.name}</button
        >
        {#if i < artists.length - 1}
          <span class="text-surface-contrast-50-950/50">,&nbsp;</span>
        {/if}
      {/each}
    </div>
  </div>
  {#if !hideAlbum}
    {#if album}
      <div class="mt-auto mb-auto flex flex-1">
        <button
          onclick={handleClick(() =>
            // eslint-disable-next-line svelte/no-navigation-without-resolve
            goto(`${resolve("/albums")}?albumId=${album.id}`),
          )}
        >
          <span
            class={cn(textClasses, "font-bold", "overflow-hidden break-all")}
          >
            {album.name}
          </span>
        </button>
      </div>
    {:else}
      <div class="flex-1"></div>
    {/if}
  {/if}
  {#if addedAt}
    <ToolTip
      text={dayjs(addedAt).format("LLL")}
      class={cn(
        "me-2 mt-auto mb-auto flex flex-[0.5] items-center justify-center",
      )}
    >
      <span class={cn(textClasses, "font-bold")}>
        {dayjs(addedAt).fromNow()}
      </span>
    </ToolTip>
  {/if}
  <span class={cn(textClasses, "me-2 mt-auto mb-auto font-bold")}>
    {millisecondsToHumanReadable(duration)}
  </span>
  <button
    class="me-2 flex items-center justify-center transition-transform hover:scale-110"
    onclick={toggleFavourite}
  >
    {#if isFavourite}
      <Heart fill="currentColor" size={size / 2} />
    {:else}
      <HeartPlus size={size / 2} />
    {/if}
  </button>
  {#if getOrigin(originalUrl) === SongOrigin.Spotify}
    <Spotify class="ms-auto mt-auto mb-auto" size={size / 2.5} />
  {:else if getOrigin(originalUrl) === SongOrigin.Tidal}
    <ToolTip text={originalUrl} class="flex items-center justify-center">
      <Tidal class="ms-auto mt-auto mb-auto" size={size / 3} />
    </ToolTip>
  {/if}
</div>
