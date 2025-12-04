<script lang="ts">
  import { Progress } from "@skeletonlabs/skeleton-svelte";

  const {
    size = 18,
    trackClass = "stroke-surface-800-200",
    rangeClass = "stroke-secondary-400-600",
  } = $props();
</script>

<Progress class="w-fit items-center gap-0" value={null}>
  <Progress.Circle style="--size: {size}px; --thickness: {size / 6}px">
    <Progress.CircleTrack class={trackClass} />
    <Progress.CircleRange class={rangeClass} />
  </Progress.Circle>
  <Progress.ValueText />
</Progress>
