<script lang="ts">
  import { onMount } from "svelte";
  import cn from "classnames";
  import { createResizeListener } from "$lib/utils/utils";
  import type { RGBColor } from "colorthief";
  import { sortRgbColors } from "$lib/color/utils";

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

  const color = $derived(sortRgbColors(colors[0], colors[1], 300)[0]);

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    velocityMultiplier;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    startOffset;

    particleWorkers.forEach((worker) => {
      worker.postMessage({
        type: "updateProps",
        velocityMultiplier,
        startOffset,
      });
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

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    emissionRate;

    const workerCount = Math.ceil(Math.max(emissionRate / (100 / 60), 1));
    const newWorkerCount = workerCount - particleWorkers.length;

    const realEmissionRate = emissionRate / workerCount;

    if (newWorkerCount > 0) {
      for (let i = 0; i < workerCount; i++) {
        setupParticleWorker(realEmissionRate);
      }
    }

    particleWorkers.forEach((worker, index) => {
      worker.postMessage({
        type: "updateEmissionRate",
        emissionRate: index < workerCount ? realEmissionRate : 0,
      });
    });
  });

  let canvasElement: HTMLCanvasElement | null = $state(null);
  let offscreenCanvas: OffscreenCanvas | null = $state(null);
  let worker: Worker | null = null;

  const particleWorkers: Array<Worker> = [];
  const channel = new MessageChannel();
  const portToManager = channel.port1;
  const portToWorkers = channel.port2;

  function setupParticleWorker(emissionRate: number): Worker | undefined {
    if (!offscreenCanvas || !canvasElement) return;

    const workerChannel = new MessageChannel();
    const portForParticle = workerChannel.port1;
    const portForMainRelay = workerChannel.port2;

    const worker = new Worker(
      new URL("../workers/particle-worker.js", import.meta.url),
      {
        type: "module",
      },
    );

    particleWorkers.push(worker);

    worker.postMessage(
      {
        type: "init",
        id: particleWorkers.length,
        messagePort: portForParticle,
        width: canvasElement.width,
        height: canvasElement.height,
        initialState: {
          velocityMultiplier,
          emissionRate,
          xOffset,
          yOffset,
          startOffset,
        },
      },
      [portForParticle],
    );

    portForMainRelay.onmessage = (
      event: MessageEvent<{ id: number; buffer: Float32Array }>,
    ) => {
      const { id, buffer } = event.data;

      portToWorkers.postMessage({ id, buffer }, [buffer.buffer]);
    };
  }

  onMount(() => {
    if (!canvasElement) return;
    canvasElement.width = canvasElement.clientWidth;
    canvasElement.height = canvasElement.clientHeight;

    worker = new Worker(
      new URL("../workers/particle-manager-worker.js", import.meta.url),
      {
        type: "module",
      },
    );

    offscreenCanvas = canvasElement.transferControlToOffscreen();

    setTimeout(() => {
      if (!offscreenCanvas || !canvasElement) return;
      worker?.postMessage(
        {
          type: "init",
          messagePort: portToManager,
          canvas: offscreenCanvas,
          width: canvasElement.width,
          height: canvasElement.height,
          color: color,
        },
        [offscreenCanvas, portToManager],
      );
    }, 150);

    const cleanupResizeListener = createResizeListener(
      canvasElement!,
      (width, height) => {
        particleWorkers.forEach((worker) => {
          worker.postMessage({
            type: "resize",
            width,
            height,
          });
        });

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

      while (particleWorkers.length) {
        particleWorkers.pop()?.terminate();
      }
    };
  });
</script>

<canvas class={cn("h-full w-full", clazz)} bind:this={canvasElement}></canvas>
