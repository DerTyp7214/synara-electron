<script lang="ts">
  import { timecodeToMilliseconds } from "$lib/utils.js";
  import cn from "classnames";
  import { onDestroy } from "svelte";

  let lyricsView: HTMLDivElement;

  const {
    lyrics,
    class: clazz = "",
    timecode,
    range = 8,
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
        list[timecodeToMilliseconds(match[1])] = line
          .replace(match[0], "")
          .trim();
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

  function getOpacity(timestamp: string): number {
    const currentLineIndex = lyricsArray.findIndex(([t]) => t === timestamp);

    if (currentLineIndex === -1 || activeIndex === -1) {
      return 0.55;
    }

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

    const line = keys[index];

    if (line) {
      activeLine = line;

      if (!isUserScrolling) {
        lyricsView.querySelector(`[data-timestamp="${line}"]`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    } else if (normalizedTimecode < Number(keys[0])) {
      lyricsView.scrollTo({ behavior: "smooth", top: 0 });
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

  onDestroy(() => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
  });
</script>

<div
  class="flex flex-col items-center overflow-y-scroll {clazz} h-[400px] px-2"
  bind:this={lyricsView}
  onscroll={handleScroll}
>
  <div class="flex-shrink-0" style="height: 45%;"></div>

  {#each lyricsArray as [timestamp, line] (timestamp)}
    <span
      data-timestamp={timestamp.toString()}
      class={cn("h2 my-0.5 text-center transition-all", {
        "scale-100": timestamp.toString() === activeLine,
        "scale-70": timestamp.toString() !== activeLine,
      })}
      style={`opacity: ${getOpacity(timestamp)}`}>{line}</span
    >
  {/each}
  <div class="flex-shrink-0" style="height: 45%;"></div>
</div>
