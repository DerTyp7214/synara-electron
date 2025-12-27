<script lang="ts">
  import type { RGBColor } from "colorthief";
  import ParticleEmitter from "$lib/components/ParticleEmitter.svelte";
  import { settings } from "$lib/utils/settings";

  const audioVisualizerSettings = $derived(settings.audioVisualizer);

  let {
    velocityMultiplier = $bindable(1),
    emissionRate = $bindable(5),
    xOffset,
    yOffset,
    startOffset,
    colors,
    class: clazz,
  }: {
    velocityMultiplier?: number;
    emissionRate?: number;
    xOffset?: number;
    yOffset?: number;
    startOffset?: number;
    colors?: RGBColor[];
    class?: string;
  } = $props();

  const factor = $derived(
    Math.ceil(
      ($audioVisualizerSettings.particleMultiplier /
        $audioVisualizerSettings.velocityMultiplier) *
        1.5,
    ),
  );
</script>

{#each new Array(factor) as _, i (i)}
  <ParticleEmitter
    emissionRate={emissionRate / factor}
    {velocityMultiplier}
    {xOffset}
    {yOffset}
    {startOffset}
    {colors}
    class={clazz}
  />
{/each}
