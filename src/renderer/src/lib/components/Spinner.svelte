<script lang="ts">
  import { Progress } from "@skeletonlabs/skeleton-svelte";

  const { size = 18 } = $props();
</script>

<Progress class="w-fit items-center gap-0" value={null}>
  <Progress.Circle style="--size: {size}px; --thickness: {size / 6}px">
    <Progress.CircleTrack class="stroke-surface-800-200" />
    <Progress.CircleRange class="stroke-secondary-400-600" />
  </Progress.Circle>
  <Progress.ValueText />
</Progress>
