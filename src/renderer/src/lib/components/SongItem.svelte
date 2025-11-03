<script lang="ts">
  import { Avatar } from "@skeletonlabs/skeleton-svelte";
  import { Play } from "@lucide/svelte";
  import Spotify from "$lib/assets/Spotify.svelte";
  import Tidal from "$lib/assets/Tidal.svelte";
  import type { Song } from "$lib/api/songs";
  import { getImageUrl, millisecondsToHumanReadable } from "$lib/utils";
  import cn from "classnames";
  import { resolve } from "$app/paths";
  import ToolTip from "$lib/components/ToolTip.svelte";
  import { playSong } from "$lib/mediaPlayer";
  import Explicit from "$lib/assets/Explicit.svelte";
  import { mediaSession } from "$lib/audio/mediaSession";
  import type { PlayingSource } from "$shared/types/settings";

  type SongOrigin = "tidal" | "spotify";

  const {
    id,
    title,
    artists,
    album,
    duration,
    coverId,
    explicit,
    showNumber,
    hideAlbum,
    size = 46,
    addedAt,
    originalUrl = "",
    class: clazz = "",
    playingSource,
    playlistRef,
    songRef,
    scrollIntoActive = false,
  }: Song & {
    class?: string;
    hideAlbum?: boolean;
    showNumber?: number;
    addedAt?: number;
    size?: number;
    playingSource: PlayingSource;
    playlistRef: Array<Song>;
    songRef: Song;
    scrollIntoActive?: boolean;
  } = $props();

  let songElement: HTMLDivElement;

  function getOrigin(): SongOrigin | null {
    if (originalUrl.includes("tidal.com")) return "tidal";
    else if (originalUrl.includes("spotify.com")) return "spotify";
    return null;
  }

  const baseTextClasses = [
    "text-surface-contrast-50-950/50",
    "hover:text-surface-contrast-50-950/80",
    "transition-colors",
    "text-sm",
  ];

  const textClasses = ["line-clamp-1", "overflow-ellipsis", ...baseTextClasses];

  const currentQueue = mediaSession.getDerivedQueue();
  const currentSong = $derived($currentQueue.currentSong);

  $effect(() => {
    if (scrollIntoActive && $currentSong?.id === id) {
      setTimeout(() => {
        songElement?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 400);
    }
  });
</script>

<div
  bind:this={songElement}
  data-songId={id}
  class={cn(
    "rounded-container box-border",
    "flex flex-row gap-2 p-3 shadow-md",
    "transition-colors",
    clazz,
    {
      "bg-surface-300-700/40": $currentSong?.id !== id,
      "bg-secondary-300-700/40": $currentSong?.id === id,
    },
  )}
>
  {#if showNumber}
    <span
      class="text-surface-contrast-50-950/50 me-2 mt-auto mb-auto text-sm font-medium tabular-nums"
      >{showNumber}.</span
    >
  {/if}
  <div
    class="rounded-base relative overflow-clip"
    style="min-width: {size}px; min-height: {size}px; max-width: {size}px; max-height: {size}px;"
  >
    <Avatar class="h-full w-full rounded-none">
      <Avatar.Image src={getImageUrl(coverId, size)} />
      <Avatar.Fallback
        >{title
          .split(" ")
          .slice(0, 2)
          .map((s) => s.substring(0, 1).toUpperCase())
          .join("")}</Avatar.Fallback
      >
    </Avatar>
    <button
      onclick={() => playSong(songRef, playlistRef, playingSource)}
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
        <a
          href="{resolve('/artists')}?artistId={artist.id}"
          class={cn(baseTextClasses, "font-medium", "whitespace-nowrap")}
          >{artist.name}</a
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
        <a href="{resolve('/albums')}?albumId={album.id}">
          <span
            class={cn(textClasses, "font-bold", "overflow-hidden break-all")}
          >
            {album.name}
          </span>
        </a>
      </div>
    {:else}
      <div class="flex-1"></div>
    {/if}
  {/if}
  {#if addedAt}
    <span class={cn(textClasses, "me-2 mt-auto mb-auto font-bold")}>
      {addedAt}
    </span>
  {/if}
  <span class={cn(textClasses, "me-2 mt-auto mb-auto font-bold")}>
    {millisecondsToHumanReadable(duration)}
  </span>
  {#if getOrigin() === "spotify"}
    <Spotify class="ms-auto mt-auto mb-auto" size={size / 2.5} />
  {:else if getOrigin() === "tidal"}
    <ToolTip text={originalUrl}>
      <Tidal class="ms-auto mt-auto mb-auto" size={size / 3} />
    </ToolTip>
  {/if}
</div>
