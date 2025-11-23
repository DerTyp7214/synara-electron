<!--suppress ALL -->
<script lang="ts">
  import { Avatar } from "@skeletonlabs/skeleton-svelte";
  import {
    ArrowUp,
    ListMusic,
    MicVocal,
    Play,
    Repeat,
    Repeat1,
    Shuffle,
    Volume,
    Volume1,
    Volume2,
    VolumeX,
    Heart,
    HeartPlus,
  } from "@lucide/svelte";
  import { Minimize, Maximize, AudioLines, ChevronUp } from "@jis3r/icons";
  import cn from "classnames";
  import { onMount, setContext } from "svelte";
  import {
    createResizeListener,
    getImageUrl,
    millisecondsToHumanReadable,
    fullscreen,
    nativeFullscreen,
    isMac,
    globalKeydown,
  } from "$lib/utils";
  import { resolve } from "$app/paths";
  import { Explicit, SkipBack, SkipForward, Pause } from "$lib/assets";
  import { t } from "$lib/i18n/i18n";
  import Slider from "$lib/components/Slider.svelte";
  import { audioSession } from "$lib/audio/audioSession";
  import { mediaSession } from "$lib/audio/mediaSession";
  import { RepeatMode } from "$shared/models/repeatMode";
  import ContextMenuManager from "$lib/contextMenu/ContextMenuManager.svelte";
  import LyricsView from "$lib/components/LyricsView.svelte";
  import SongItem from "$lib/components/SongItem.svelte";
  import { get, type Writable, writable } from "svelte/store";
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { setLiked, type Song } from "$lib/api/songs";
  import { MEDIA_PLAYER_CONTEXT_KEY } from "$lib/consts";
  import {
    getColorCssVars,
    imageColors as derivedImageColors,
  } from "$lib/color/utils";
  import { debugLog } from "$lib/logger";

  let {
    isOpen = writable(false),
    showQueue = writable(false),
    showLyrics = writable(false),
  }: {
    isOpen?: Writable<boolean>;
    showQueue?: Writable<boolean>;
    showLyrics?: Writable<boolean>;
  } = $props();

  setContext(MEDIA_PLAYER_CONTEXT_KEY, { isOpen, showQueue, showLyrics });

  let showVisualizer = $state(true);

  let footerElement = $state<HTMLElement>();
  let visualizerCanvas = $state<HTMLCanvasElement>();
  let queueElement = $state<HTMLElement>();

  const bassAmplitude = $derived(mediaSession.bassAmplitude(0, 1, 2));
  const playingSourceId = $derived(mediaSession.playingSourceId);
  const currentPosition = $derived(mediaSession.currentPosition);
  const currentBuffer = $derived(mediaSession.currentBuffer);
  const currentVolume = $derived(mediaSession.volume);
  const currentQueue = $derived(mediaSession.getDerivedQueue());
  const currentSongQueue = $derived($currentQueue.queue);
  const currentSong = $derived($currentQueue.currentSong);
  const repeatMode = $derived(mediaSession.repeatMode);
  const sampleRate = $derived(mediaSession.sampleRate);
  const shuffled = $derived(mediaSession.shuffled);
  const isPaused = $derived(mediaSession.paused);
  const bitrate = $derived(mediaSession.bitrate);
  const muted = $derived(mediaSession.muted);

  const imageColors = $derived(derivedImageColors($currentQueue.currentSong));

  const hasLyrics = $derived.by(() => ($currentSong?.lyrics ?? "") !== "");

  function handleActionClick(
    action: "shuffle" | "play" | "repeat" | "skipBack" | "skipForward",
  ) {
    return (event: MouseEvent) => {
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();

      switch (action) {
        case "shuffle": {
          $currentQueue.setShuffled(!$shuffled);
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

  function scrollIntoActiveSong() {
    if (queueElement) {
      const songElement = queueElement.querySelector(
        `[data-songId="${$currentSong?.id}"]`,
      );
      if (songElement)
        songElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }
  }

  function handleVolumeWheel(event: WheelEvent) {
    event.preventDefault();

    const direction = event.deltaY < 0 ? 1 : -1;

    let newValue = $currentVolume + direction * 5;

    if (newValue > 100) $currentVolume = 100;
    else if (newValue < 0) $currentVolume = 0;
    else $currentVolume = newValue;
  }

  const baseTextClasses = [
    "text-surface-contrast-50-950/50",
    "hover:text-surface-contrast-50-950/80",
    "transition-colors",
    "text-sm",
  ];

  let togglingFavourite = $state(false);
  async function toggleFavourite() {
    if (togglingFavourite) return;
    togglingFavourite = true;

    try {
      const updatedSong = await setLiked(
        $currentSong.id,
        !$currentSong.isFavourite,
      );

      if (updatedSong.isFavourite !== $currentSong.isFavourite) {
        get(mediaSession.getDerivedQueue()).updateSong(
          {
            ...$currentSong,
            isFavourite: updatedSong.isFavourite,
          },
          true,
        );
      }
    } catch (e) {
      debugLog("error", e);
    }

    togglingFavourite = false;
  }

  $effect(() => {
    if (!$isOpen) {
      $showQueue = false;
      $showLyrics = false;

      if ($fullscreen) document.exitFullscreen();
    }
  });

  const pageSize = 30;

  let queue: Array<Song> = $state([]);
  let nextUpPage: number = $state($currentQueue.getPage(pageSize) - 1);
  let nextDownPage: number = $state($currentQueue.getPage(pageSize));
  let hasMoreUp: boolean = $state(true);
  let hasMoreDown: boolean = $state(true);

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    $shuffled;
    $currentSongQueue;
    $playingSourceId;

    nextUpPage = $currentQueue.getPage(pageSize) - 1;
    nextDownPage = $currentQueue.getPage(pageSize);

    hasMoreUp = true;
    hasMoreDown = true;

    queue = [];
  });

  $effect(() => {
    if ($showQueue) setTimeout(scrollIntoActiveSong, 100);
  });

  onMount(() => {
    const animationFrame = mediaSession.drawVisualizer(visualizerCanvas!);

    const cleanupResizeListener = createResizeListener(visualizerCanvas!);

    return () => {
      audioSession.kill();
      cleanupResizeListener();
      cancelAnimationFrame(get(animationFrame));
    };
  });

  const audioVisualEffects = $derived.by(() => {
    if (!showVisualizer) return "--tw-brightness: brightness(30%);";
    return `--tw-saturate: saturate(${0.8 + ($bassAmplitude / 255) * 0.8}); --tw-brightness: brightness(${20 + ($bassAmplitude / 255) * 15}%);`;
  });

  function handleKeyDown(
    event: KeyboardEvent,
    audioInteractiveFocused: boolean,
  ) {
    if (event.code === "KeyR" && event.shiftKey && event.ctrlKey) return;
    if (event.code === "KeyI" && event.shiftKey && event.ctrlKey) return;

    if (!audioInteractiveFocused) event.preventDefault();

    switch (event.code) {
      case "KeyF":
        if ($isOpen) {
          if ($fullscreen) document.exitFullscreen();
          else footerElement?.requestFullscreen();
        }
        break;
      case "Space":
        if (audioInteractiveFocused) return;
        if (mediaSession.isPaused()) mediaSession.play();
        else mediaSession.pause();
        break;
      case "KeyN":
        if (event.shiftKey) mediaSession.playNext();
        break;
      case "KeyP":
        if (event.shiftKey) mediaSession.playPrev();
        break;
      case "KeyO":
        if (event.shiftKey) $isOpen = !$isOpen;
        break;
      case "ArrowRight":
        audioSession.seekBy(5);
        break;
      case "ArrowLeft":
        audioSession.seekBy(-5);
        break;
      default:
        console.log(event);
    }
  }
</script>

<footer
  bind:this={footerElement}
  data-mode={$isOpen ? "dark" : undefined}
  use:globalKeydown={handleKeyDown}
  style={$isOpen ? getColorCssVars($imageColors) : ""}
  class={cn(
    "flex flex-shrink-0",
    "fixed mt-0",
    "flex-col transition-all",
    "text-surface-950-50",
    {
      "app-card": !$isOpen,
      "bg-surface-50-950/40": !$isOpen,
      "bg-surface-50-950/70": $isOpen,
      "rounded-container shadow-md": !$isOpen,
      "rounded-none shadow-none": $isOpen,
      "right-0 bottom-0 left-0 m-2 h-24 max-h-24": !$isOpen,
      "right-0 bottom-0 left-0 m-0 h-full max-h-[100vh]": $isOpen,
    },
  )}
>
  {#if $isOpen}
    <ContextMenuManager />
  {/if}

  {#if $currentSong?.coverId}
    <div
      style="background-image: url({getImageUrl(
        $currentSong.coverId,
      )}); {audioVisualEffects}"
      class={cn(
        "absolute top-0 left-0 h-full w-full",
        "scale-110 bg-cover bg-center",
        "z-0 transition-opacity",
        "blur-2xl",
        {
          "opacity-100": $isOpen,
          "opacity-0": !$isOpen,
        },
      )}
    ></div>
  {/if}

  <!-- Cover and visualizer/Lyrics/Queue -->
  <div
    style="--max-player-height: calc(100vh - 6rem)"
    class={cn("relative z-20 flex flex-1 flex-grow flex-row transition-all", {
      "max-h-0 opacity-0": !$isOpen,
      "max-h-(--max-player-height) opacity-100": $isOpen,
    })}
  >
    <div
      class={cn(
        "flex h-full max-h-full min-w-[100vw] transition-transform",
        "flex-col items-center justify-center overflow-hidden",
        "relative",
        {
          "-translate-x-full": !$showQueue,
          "translate-x-0": $showQueue,
        },
      )}
    >
      {#if $showQueue}
        {#key [$shuffled, $playingSourceId, $currentSongQueue]}
          <InfiniteScroll
            class="flex w-full flex-1 flex-col gap-2 overflow-y-auto p-8"
            initialPageUp={$currentQueue.getPage(pageSize) - 1}
            initialPageDown={$currentQueue.getPage(pageSize)}
            bind:scrollContainer={queueElement}
            bind:nextUpPage
            bind:nextDownPage
            bind:hasMoreUp
            bind:hasMoreDown
            {pageSize}
            loadMoreUp={mediaSession.loadSongsFromQueue.bind(mediaSession)}
            loadMoreDown={mediaSession.loadSongsFromQueue.bind(mediaSession)}
            bind:items={queue}
          >
            {#snippet renderItem({ item, index })}
              <SongItem
                {...item}
                playingSource={{
                  type: get(mediaSession.playingSourceType),
                  id: $playingSourceId,
                }}
                songRef={item}
                playlistRef={$currentSongQueue}
                showNumber={index + 1}
              />
            {/snippet}
            {#snippet loadingDown()}
              <div class="ms-auto me-auto flex w-max items-center gap-3">
                <Spinner />
                <span>{$t("songs.loadMore")}</span>
              </div>
            {/snippet}
          </InfiniteScroll>
        {/key}
        <button
          type="button"
          class={cn("btn-icon preset-filled", "absolute right-7 bottom-2")}
          onclick={scrollIntoActiveSong}
        >
          <ArrowUp />
        </button>
      {/if}
    </div>
    <div
      class={cn(
        "flex h-full min-w-[100vw] transition-transform",
        "flex-col items-center justify-center select-none",
        {
          "translate-x-0": $showQueue,
          "-translate-x-[200%]": $showLyrics && hasLyrics,
          "-translate-x-full": !$showQueue && !($showLyrics && hasLyrics),
        },
      )}
    >
      <img
        src={getImageUrl($currentSong.coverId)}
        alt="cover"
        class={cn(
          "transition-all duration-75",
          "aspect-square h-[40vh] min-w-[40vh]",
          "rounded-container overflow-hidden",
          {
            "max-h-0 opacity-0": !$isOpen,
            "max-h-[40vh] opacity-100": $isOpen,
          },
        )}
      />
      <canvas
        class={cn(
          "h-[20vh] w-11/12 transition-all",
          "absolute right-auto bottom-0 left-auto",
          "overflow-hidden",
          {
            "max-h-0": !$isOpen || !showVisualizer,
            "max-h-[20vh]": $isOpen && showVisualizer,
          },
        )}
        bind:this={visualizerCanvas}
      ></canvas>
    </div>
    <div
      class={cn(
        "flex max-h-full max-w-[100vw] min-w-[100vw] ",
        "flex-col transition-transform select-none",
        {
          "-translate-x-[200%]": $showLyrics && hasLyrics,
          "translate-x-0": !($showLyrics && hasLyrics),
        },
      )}
    >
      {#if $currentSong?.lyrics && $showLyrics && hasLyrics}
        <LyricsView
          class="max-h-full flex-1"
          timecode={$currentPosition}
          lyrics={$currentSong.lyrics}
        />
      {/if}
    </div>
    <div
      style="width: calc(100% - 0.75rem)"
      class={cn(
        "absolute",
        "top-0 left-0",
        "me-3 flex",
        "justify-between p-3 pe-0",
        "transition-all",
        {
          "draggable ps-20":
            isMac() && !$fullscreen && $isOpen && !$nativeFullscreen,
        },
      )}
    >
      <button
        class={cn("interactive p-2", "transition-opacity hover:opacity-80", {
          hidden: $showQueue,
        })}
        onclick={() =>
          $fullscreen
            ? document.exitFullscreen()
            : footerElement?.requestFullscreen()}
      >
        {#if $fullscreen}
          <Minimize />
        {:else}
          <Maximize />
        {/if}
      </button>
      <button
        onclick={() => (showVisualizer = !showVisualizer)}
        class={cn("interactive p-2 transition-all hover:opacity-80", {
          "text-secondary-400": showVisualizer,
          hidden: $showQueue || ($showLyrics && hasLyrics),
        })}
      >
        <AudioLines
          class={cn({
            "audio-lines-icon animate": showVisualizer && !$isPaused,
          })}
        />
      </button>
    </div>
  </div>

  <!-- Bottombar -->
  <div
    class={cn(
      "z-20 flex",
      "max-h-24 min-h-24 w-full",
      "items-center gap-2 p-4",
      "select-none",
      {
        "opacity-30 transition-opacity duration-500 hover:opacity-100": $isOpen,
      },
    )}
  >
    <div class="flex flex-1 overflow-hidden">
      <div class="rounded-base relative min-h-16 min-w-16 overflow-hidden">
        <Avatar class="rounded-base h-16 w-16">
          <Avatar.Image src={getImageUrl($currentSong.coverId, 64)} />
          <Avatar.Fallback class="bg-tertiary-100-900"
            >{$currentSong.title
              .split(" ")
              .slice(0, 2)
              .map((s) => s.substring(0, 1).toUpperCase())
              .join("")}</Avatar.Fallback
          >
        </Avatar>
        <button
          onclick={() => ($isOpen = !$isOpen)}
          class={cn(
            "transition-opacity",
            "absolute flex",
            "top-0 left-0",
            "h-full w-full",
            "bg-black/40 text-white",
            "items-center justify-center",
            "opacity-0 hover:opacity-100",
          )}
        >
          <div
            class={cn("p-2 transition-transform", {
              "rotate-180": $isOpen,
              "rotate-0": !$isOpen,
            })}
          >
            <ChevronUp />
          </div>
        </button>
      </div>
      <div
        class="ms-2 mb-auto flex flex-grow flex-col justify-center overflow-hidden"
      >
        <div class="flex flex-row items-center gap-2 pe-1">
          <span
            class="line-clamp-1 font-medium break-all overflow-ellipsis"
            title={$currentSong.title}>{$currentSong.title}</span
          >
          {#if $currentSong.explicit}
            <Explicit />
          {/if}
          <button onclick={toggleFavourite}>
            {#if $currentSong.isFavourite}
              <Heart
                class="size-5 transition-transform hover:scale-110"
                fill="currentColor"
              />
            {:else}
              <HeartPlus class="size-5 transition-transform hover:scale-110" />
            {/if}
          </button>
        </div>
        <div class="line-clamp-1 flex flex-row">
          {#each $currentSong.artists as artist, i (artist.id)}
            <a
              onclick={() => ($isOpen = false)}
              href="{resolve('/artists')}?artistId={artist.id}"
              class={cn(baseTextClasses, "font-medium", "whitespace-nowrap")}
              >{artist.name}</a
            >
            {#if i < $currentSong.artists.length - 1}
              <span class="text-surface-contrast-50-950/50">,&nbsp;</span>
            {/if}
          {/each}
        </div>
        <span
          class="text-secondary-700-300 text-2xs line-clamp-1 text-start font-bold text-ellipsis"
          title={$t("player.playingAt", {
            bitrate: $bitrate.toString(),
            sampleRate: ($sampleRate / 1000).toString(),
          })}
        >
          {$t("player.playingAt", {
            bitrate: $bitrate.toString(),
            sampleRate: ($sampleRate / 1000).toString(),
          })}
        </span>
      </div>
    </div>

    <div class="flex flex-[1.75] flex-col items-center">
      <div class="audio-interactive flex flex-row items-center gap-2 pe-1">
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
          class="flex items-center transition-opacity hover:opacity-80"
        >
          <SkipBack size={22} />
        </button>
        <button
          onclick={handleActionClick("play")}
          class="flex items-center transition-opacity hover:opacity-80"
        >
          {#if $isPaused}
            <Play size="26" />
          {:else}
            <Pause size={26} />
          {/if}
        </button>
        <button
          onclick={handleActionClick("skipForward")}
          class="flex items-center transition-opacity hover:opacity-80"
        >
          <SkipForward size={22} />
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
          max={$currentSong.duration}
          buffer={$currentBuffer}
          onValueChanged={(value) => audioSession.seekToMilliseconds(value)}
          class="w-full"
        />
        <span class="tabular-nums"
          >{millisecondsToHumanReadable($currentSong.duration)}</span
        >
      </div>
    </div>

    <div class="flex h-full flex-1 flex-row items-center justify-end gap-2">
      <button
        onclick={() => {
          $isOpen = true;
          $showLyrics = false;
          $showQueue = !$showQueue;
        }}
        class={cn("me-2 transition-all hover:opacity-80", {
          "text-secondary-700-300": $showQueue,
        })}
      >
        <ListMusic />
      </button>
      <button
        onclick={() => {
          $isOpen = true;
          $showQueue = false;
          $showLyrics = !$showLyrics;
        }}
        class={cn("overflow-hidden transition-all hover:opacity-80", {
          "-ms-2 me-0 max-w-0": !hasLyrics,
          "me-2": $currentSong?.lyrics,
          "text-secondary-700-300": $showLyrics && hasLyrics,
        })}
      >
        <MicVocal />
      </button>
      <div class="group relative flex py-2">
        <button
          class="transition-opacity hover:opacity-80"
          onclick={() => ($muted = !$muted)}
          onwheel={handleVolumeWheel}
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
        <div
          class={cn(
            "bg-surface-400-600 absolute",
            "rounded-base bottom-full",
            "-left-2 hidden",
            "min-h-28 items-center p-2.5",
            "group-hover:flex hover:flex",
            "md:group-hover:hidden",
          )}
        >
          <Slider
            max={100}
            thumb={false}
            class="h-24 w-2 flex-1"
            sliderClass="bg-tertiary-700-300"
            value={$currentVolume}
            orientation="vertical"
            scrollAction
            onValueChanged={(value) => mediaSession.volume.set(value)}
          />
        </div>
      </div>
      <Slider
        max={100}
        thumb={false}
        class="hidden max-w-24 flex-1 md:block"
        value={$currentVolume}
        scrollAction
        onValueChanged={(value) => mediaSession.volume.set(value)}
      />
    </div>
  </div>
</footer>
