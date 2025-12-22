<script lang="ts">
  import { timecodeToMilliseconds } from "$lib/utils/utils";
  import cn from "classnames";
  import { onMount } from "svelte";
  import { audioSession } from "$lib/audio/audioSession";

  let lyricsView: HTMLDivElement;

  const {
    lyrics,
    class: clazz = "",
    timecode,
    range = 4,
    minOpacity = 0.1,
  }: {
    lyrics: string;
    class?: string;
    timecode: number;
    range?: number;
    minOpacity?: number;
  } = $props();

  const regex = /\[([\d.:]+)]/;

  let isUserScrolling = $state(false);
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

  const lyricsList = $derived.by(() => {
    const list: Record<number, string> = {};

    lyrics.split("\n").forEach((line) => {
      const match = regex.exec(line);
      if (match) {
        const trimmedLine = line.replace(match[0], "").trim();
        if (trimmedLine.length > 0)
          list[timecodeToMilliseconds(match[1])] = trimmedLine;
        else list[timecodeToMilliseconds(match[1])] = "???";
      }
    });

    return list;
  });

  let activeLine = $state("");

  const lyricsArray = $derived.by(() =>
    Object.entries(lyricsList).sort((a, b) => Number(a[0]) - Number(b[0])),
  );

  const activeIndex = $derived.by(() => {
    if (!activeLine || lyricsArray.length === 0) return -1;
    return lyricsArray.findIndex(([timestamp]) => timestamp === activeLine);
  });

  function getFactor(timestamp: string): number {
    const currentLineIndex = lyricsArray.findIndex(([t]) => t === timestamp);

    const distance = Math.abs(currentLineIndex - activeIndex);

    if (distance === 0) {
      return 1.0;
    }

    const maxOpacityChange = 1.0 - minOpacity;
    const fadeFactor = Math.min(distance, range) / range;

    return 1.0 - fadeFactor * maxOpacityChange;
  }

  $effect(() => {
    const normalizedTimecode = Math.floor(timecode);
    const keys = Object.keys(lyricsList);
    const index = keys.findIndex((t) => Number(t) >= normalizedTimecode) - 1;

    let line = keys[index];

    if (normalizedTimecode < Number(keys[0])) {
      lyricsView.scrollTo({ behavior: "smooth", top: 0 });
      line = keys[0];
    }

    if (line && activeLine !== line) {
      activeLine = line;

      if (!isUserScrolling) {
        lyricsView.querySelector(`[data-timestamp="${line}"]`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  });

  function handleScroll() {
    isUserScrolling = true;

    if (scrollTimeout) clearTimeout(scrollTimeout);

    scrollTimeout = setTimeout(() => {
      const activeElement = lyricsView.querySelector(
        `[data-timestamp="${activeLine}"]`,
      );
      if (activeElement) {
        const rect = activeElement.getBoundingClientRect();
        const viewRect = lyricsView.getBoundingClientRect();

        if (rect.top >= viewRect.top && rect.bottom <= viewRect.bottom) {
          isUserScrolling = false;
        }
      }
    }, 2000);
  }

  onMount(() => {
    handleScroll();

    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  });
</script>

<div
  class="flex flex-col items-center overflow-y-scroll {clazz} px-2"
  bind:this={lyricsView}
  onscroll={handleScroll}
>
  <div class="shrink-0" style="height: 45%;"></div>
  {#each lyricsArray as [timestamp, line] (timestamp)}
    <button
      onclick={() => audioSession.seekToMilliseconds(Number(timestamp))}
      data-timestamp={timestamp.toString()}
      class={cn(
        "h2 cursor-pointer text-center transition-all",
        "text-shadow-secondary-100 scale-(--scale) hover:scale-(--scale-hover)",
        {
          "text-secondary-100 my-2 scale-100!":
            timestamp.toString() === activeLine,
          "my-0.5 text-white": timestamp.toString() !== activeLine,
        },
      )}
      style={`opacity: ${getFactor(timestamp)}; --scale: ${60 + getFactor(timestamp) * 30}%; --scale-hover: ${65 + getFactor(timestamp) * 30}%`}
    >
      {line}
    </button>
  {/each}
  <div class="shrink-0" style="height: 45%;"></div>
</div>
