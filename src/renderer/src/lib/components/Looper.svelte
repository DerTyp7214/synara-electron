<script lang="ts">
  import { Progress } from "@skeletonlabs/skeleton-svelte";
  import cn from "classnames";
  import { onDestroy } from "svelte";
  import ToolTip from "$lib/components/ToolTip.svelte";

  const {
    size = 18,
    class: clazz = "",
    trackClass = "",
    rangeClass = "",
    interval,
    disabled = false,
    onInterval,
  }: {
    size?: number;
    class?: string;
    trackClass?: string;
    rangeClass?: string;
    interval: number;
    disabled?: boolean;
    onInterval: () => void;
  } = $props();

  let value = $state(100);
  let currentInterval: NodeJS.Timeout | undefined;
  let currentProgressInterval: NodeJS.Timeout | undefined;

  $effect(() => {
    if (currentInterval) clearInterval(currentInterval);
    if (currentProgressInterval) clearInterval(currentProgressInterval);

    currentInterval = setInterval(() => {
      if (!disabled) onInterval();
    }, interval);

    currentProgressInterval = setInterval(() => {
      value -= (100 / interval) * 100;
      if (value < 0) value = 100;
    }, 100);
  });

  onDestroy(() => {
    if (currentInterval) clearInterval(currentInterval);
    if (currentProgressInterval) clearInterval(currentProgressInterval);
  });
</script>

<div class={cn(clazz)}>
  <ToolTip
    text={`Refresh in ${(((interval / 100) * value) / 1000).toFixed(1)} seconds.`}
  >
    <Progress {value} class="w-fit items-center">
      <Progress.Circle style="--size: {size}px; --thickness: {size / 6}px">
        <Progress.CircleTrack class={trackClass} />
        <Progress.CircleRange class={rangeClass} />
      </Progress.Circle>
    </Progress>
  </ToolTip>
</div>
