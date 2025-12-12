<script lang="ts">
  import { onMount } from "svelte";
  import cn from "classnames";
  import { createResizeListener } from "$lib/utils/utils";
  import { oklchToRgb, sortedByLightnessOklch } from "$lib/color/converters";
  import type { RGBColor } from "colorthief";
  import { transformColor } from "$lib/color/utils";
  import { rgbToOklch } from "$lib/color/converters";

  let {
    velocityMultiplier = $bindable(1),
    emissionRate = $bindable(5),
    xOffset = 0,
    yOffset = 0,
    startOffset = 1,
    colors = $bindable([
      [255, 255, 255],
      [255, 255, 255],
    ]),
    class: clazz = "",
  }: {
    velocityMultiplier?: number;
    emissionRate?: number;
    xOffset?: number;
    yOffset?: number;
    startOffset?: number;
    colors?: RGBColor[];
    class?: string;
  } = $props();

  const color = $derived(
    oklchToRgb(
      sortedByLightnessOklch(
        rgbToOklch(transformColor(colors[0], 300)),
        rgbToOklch(transformColor(colors[1], 300)),
      )[0],
    ),
  );

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    velocityMultiplier;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    emissionRate;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    startOffset;

    worker?.postMessage({
      type: "updateProps",
      velocityMultiplier,
      emissionRate,
      startOffset,
    });
  });

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    color;

    worker?.postMessage({
      type: "updateColor",
      color: color,
    });
  });

  let canvasElement: HTMLCanvasElement | null = $state(null);
  let worker: Worker | null = null;

  onMount(() => {
    if (!canvasElement) return;
    canvasElement.width = canvasElement.clientWidth;
    canvasElement.height = canvasElement.clientHeight;

    worker = new Worker(
      new URL("../workers/particle-worker.js", import.meta.url),
      {
        type: "module",
      },
    );

    const offscreenCanvas = canvasElement.transferControlToOffscreen();

    worker.postMessage(
      {
        type: "init",
        canvas: offscreenCanvas,
        width: canvasElement.width,
        height: canvasElement.height,
        initialState: {
          velocityMultiplier,
          emissionRate,
          xOffset,
          yOffset,
          startOffset,
          color: color,
        },
      },
      [offscreenCanvas],
    );

    const cleanupResizeListener = createResizeListener(
      canvasElement!,
      (width, height) => {
        if (worker) {
          worker.postMessage({
            type: "resize",
            width,
            height,
          });
        }
      },
    );

    return () => {
      cleanupResizeListener();
      worker?.terminate();
    };
  });
</script>

<canvas class={cn("h-full w-full", clazz)} bind:this={canvasElement}></canvas>
