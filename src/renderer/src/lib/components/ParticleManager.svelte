<script lang="ts">
  import type { RGBColor } from "colorthief";
  import ParticleEmitter from "$lib/components/ParticleEmitter.svelte";

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

  const factor = 5;
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
