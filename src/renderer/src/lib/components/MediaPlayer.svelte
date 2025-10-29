<script lang="ts">
  import { Avatar } from "@skeletonlabs/skeleton-svelte";
  import {
    ListMusic,
    MicVocal,
    Pause,
    Play,
    Repeat,
    Repeat1,
    Shuffle,
    SkipBack,
    SkipForward,
    Volume,
    Volume1,
    Volume2,
    VolumeX,
  } from "@lucide/svelte";
  import cn from "classnames";
  import { onMount } from "svelte";
  import {
    createResizeListener,
    getImageUrl,
    millisecondsToHumanReadable,
  } from "$lib/utils";
  import { resolve } from "$app/paths";
  import Explicit from "$lib/assets/Explicit.svelte";
  import { t } from "$lib/i18n/i18n";
  import Slider from "$lib/components/Slider.svelte";
  import { audioSession } from "$lib/audio/audioSession";
  import { mediaSession } from "$lib/audio/mediaSession";
  import { RepeatMode } from "$shared/models/repeatMode";

  let { isOpen = $bindable(false) } = $props();

  let visualizerCanvas = $state<HTMLCanvasElement>();

  const currentPosition = $derived(mediaSession.currentPosition);
  const currentBuffer = $derived(mediaSession.currentBuffer);
  const currentVolume = $derived(mediaSession.volume);
  const currentSong = $derived(mediaSession.currentSong);
  const repeatMode = $derived(mediaSession.repeatMode);
  const shuffled = $derived(mediaSession.shuffled);
  const isPaused = $derived(mediaSession.paused);
  const bitrate = $derived(mediaSession.bitrate);
  const muted = $derived(mediaSession.muted);

  function handleActionClick(
    action: "shuffle" | "play" | "repeat" | "skipBack" | "skipForward",
  ) {
    return (event: MouseEvent) => {
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();

      switch (action) {
        case "shuffle": {
          $shuffled = !$shuffled;
          break;
        }
        case "play": {
          if (mediaSession.isPaused()) mediaSession.play();
          else mediaSession.pause();

          break;
        }
        case "skipBack": {
          mediaSession.playPrev();
          break;
        }
        case "skipForward": {
          mediaSession.playNext();
          break;
        }
        case "repeat": {
          switch ($repeatMode) {
            case RepeatMode.None:
              $repeatMode = RepeatMode.List;
              break;
            case RepeatMode.List:
              $repeatMode = RepeatMode.Track;
              break;
            case RepeatMode.Track:
              $repeatMode = RepeatMode.None;
              break;
          }
        }
      }
    };
  }

  onMount(() => {
    mediaSession.drawVisualizer(visualizerCanvas!);

    const cleanupResizeListener = createResizeListener(visualizerCanvas!);

    return () => {
      audioSession.kill();
      cleanupResizeListener();
    };
  });

  const song = $derived.by(() => ({
    title: "No Song",
    bitRate: 0,
    duration: 0,
    artists: [],
    ...$currentSong,
  }));

  const baseTextClasses = [
    "text-surface-contrast-50-950/50",
    "hover:text-surface-contrast-50-950/80",
    "transition-colors",
    "text-sm",
  ];
</script>

<footer
  class={cn("flex flex-shrink-0", "fixed mt-0", "flex-col transition-all", {
    "bg-surface-50-950/70": !isOpen,
    "bg-surface-50-950/40": isOpen,
    "rounded-container shadow-md": !isOpen,
    "rounded-none shadow-none": isOpen,
    "right-0 bottom-0 left-0 m-2 h-24 ": !isOpen,
    "right-0 bottom-0 left-0 m-0 h-full ": isOpen,
  })}
>
  {#if $currentSong?.coverId}
    <div
      style="background-image: url({getImageUrl($currentSong.coverId)})"
      class={cn(
        "absolute top-0 left-0 h-full w-full",
        "scale-110 bg-cover bg-center",
        "z-0 transition-opacity",
        "blur-2xl brightness-30",
        {
          "opacity-100": isOpen,
          "opacity-0": !isOpen,
        },
      )}
    ></div>
  {/if}
  <div
    class={cn(
      "z-20 flex flex-1 flex-grow flex-col",
      "relative items-center justify-center",
    )}
  >
    <img
      src={getImageUrl(song.coverId)}
      alt="cover"
      class={cn(
        "aspect-square h-[40vh] min-w-[40vh] transition-all",
        "rounded-container overflow-hidden",
        {
          "max-h-0 opacity-0": !isOpen,
          "max-h-[40vh] opacity-100": isOpen,
        },
      )}
    />
    <canvas
      class={cn(
        "h-[20vh] w-11/12 transition-all",
        "absolute right-auto bottom-0 left-auto",
        "overflow-hidden",
        {
          "max-h-0": !isOpen,
          "max-h-[20vh]": isOpen,
        },
      )}
      bind:this={visualizerCanvas}
    ></canvas>
  </div>
  <div class="z-20 flex max-h-24 min-h-24 w-full items-center gap-2 p-4">
    <div class="flex flex-1 overflow-hidden">
      <button onclick={() => (isOpen = !isOpen)}>
        <Avatar class="rounded-base h-16 w-16">
          <Avatar.Image src={getImageUrl(song?.coverId)} />
          <Avatar.Fallback
            >{song.title
              .split(" ")
              .slice(0, 2)
              .map((s) => s.substring(0, 1).toUpperCase())
              .join("")}</Avatar.Fallback
          >
        </Avatar>
      </button>
      <div
        class="ms-2 mb-auto flex flex-grow flex-col justify-center overflow-hidden"
      >
        <div class="flex flex-row items-center gap-2 pe-1">
          <span class="line-clamp-1 font-medium overflow-ellipsis"
            >{song.title}</span
          >
          {#if song.explicit}
            <Explicit />
          {/if}
        </div>
        <div class="line-clamp-1 flex flex-row">
          {#each song.artists as artist, i (artist.id)}
            <a
              href="{resolve('/artists')}?artistId={artist.id}"
              class={cn(baseTextClasses, "font-medium", "whitespace-nowrap")}
              >{artist.name}</a
            >
            {#if i < song.artists.length - 1}
              <span class="text-surface-contrast-50-950/50">,&nbsp;</span>
            {/if}
          {/each}
        </div>
        <span class="text-secondary-700-300 text-2xs text-start font-bold">
          {$t("player.playingAt", { bitrate: $bitrate.toString() })}
        </span>
      </div>
    </div>
    <div class="flex flex-2 flex-col items-center">
      <div class="flex flex-row items-center gap-2 pe-1">
        <button
          onclick={handleActionClick("shuffle")}
          class={cn("transition-all hover:opacity-80", {
            "text-secondary-700-300": $shuffled,
          })}
        >
          <Shuffle size="22" />
        </button>
        <button
          onclick={handleActionClick("skipBack")}
          class="transition-opacity hover:opacity-80"
        >
          <SkipBack size="22" />
        </button>
        <button
          onclick={handleActionClick("play")}
          class="transition-opacity hover:opacity-80"
        >
          {#if $isPaused}
            <Play size="26" />
          {:else}
            <Pause size="26" />
          {/if}
        </button>
        <button
          onclick={handleActionClick("skipForward")}
          class="transition-opacity hover:opacity-80"
        >
          <SkipForward size="22" />
        </button>
        <button
          onclick={handleActionClick("repeat")}
          class={cn("transition-all hover:opacity-80", {
            "text-secondary-700-300": $repeatMode !== RepeatMode.None,
          })}
        >
          {#if $repeatMode === RepeatMode.None}
            <Repeat size="22" />
          {:else if $repeatMode === RepeatMode.List}
            <Repeat size="22" />
          {:else}
            <Repeat1 size="22" />
          {/if}
        </button>
      </div>

      <div class="mt-2 flex w-full flex-row items-center gap-2">
        <span class="tabular-nums"
          >{millisecondsToHumanReadable($currentPosition)}</span
        >
        <Slider
          value={$currentPosition}
          max={song.duration}
          buffer={$currentBuffer}
          onValueChanged={(value) => audioSession.seekToMilliseconds(value)}
        />
        <span class="tabular-nums"
          >{millisecondsToHumanReadable(song.duration)}</span
        >
      </div>
    </div>
    <div
      class="flex h-full flex-1 flex-row items-center justify-end gap-2 overflow-hidden"
    >
      <button class="me-2 transition-opacity hover:opacity-80">
        <ListMusic />
      </button>
      <button class="me-2 transition-opacity hover:opacity-80">
        <MicVocal />
      </button>
      <button
        class="transition-opacity hover:opacity-80"
        onclick={() => ($muted = !$muted)}
      >
        {#if $muted || $currentVolume === 0}
          <VolumeX />
        {:else if $currentVolume > 66}
          <Volume2 />
        {:else if $currentVolume > 33}
          <Volume1 />
        {:else if $currentVolume > 0}
          <Volume />
        {/if}
      </button>
      <Slider
        max={100}
        thumb={false}
        class="w-24"
        value={$currentVolume}
        onValueChanged={(value) => mediaSession.volume.set(value)}
      />
    </div>
  </div>
</footer>
