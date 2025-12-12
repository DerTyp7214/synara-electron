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

  class Particle {
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    life = 0;
    maxLife = 0;

    constructor(centerX: number, centerY: number, size: number, speed: number) {
      this.maxLife = Math.floor(Math.random() * 120) + 240;

      const halfSize = size / 2;
      const perimeter = size * 4;

      const randomLength = Math.random() * perimeter;

      if (randomLength < size) {
        this.x = centerX - halfSize + randomLength;
        this.y = centerY - halfSize;
      } else if (randomLength < size * 2) {
        this.x = centerX + halfSize;
        this.y = centerY - halfSize + (randomLength - size);
      } else if (randomLength < size * 3) {
        this.x = centerX + halfSize - (randomLength - size * 2);
        this.y = centerY + halfSize;
      } else {
        this.x = centerX - halfSize;
        this.y = centerY + halfSize - (randomLength - size * 3);
      }

      const dx = this.x - centerX;
      const dy = this.y - centerY;

      let radialAngle = Math.atan2(dy, dx);

      const spreadFactor = 0.3;
      const spread = (Math.random() - 0.5) * spreadFactor;

      let angle = radialAngle + spread;

      const baseSpeed = (Math.random() * 1.5 + 0.5) * speed;

      this.vx = Math.cos(angle) * baseSpeed;
      this.vy = Math.sin(angle) * baseSpeed;

      this.x += this.vx;
      this.y += this.vy;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life++;
      return this.life < this.maxLife;
    }
  }

  let particles: Particle[] = [];
  let canvasElement: HTMLCanvasElement | null = $state(null);
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrameId = 0;

  function emitParticles(
    centerX: number,
    centerY: number,
    emissionSpeed: number,
  ) {
    const count = Math.ceil(emissionRate);

    for (let i = 0; i < count; i++) {
      particles.push(
        new Particle(centerX, centerY, startOffset, emissionSpeed),
      );
    }
  }
  const color = $derived(
    oklchToRgb(
      sortedByLightnessOklch(
        rgbToOklch(transformColor(colors[0], 300)),
        rgbToOklch(transformColor(colors[1], 300)),
      )[0],
    ),
  );

  let lastTime = 0;

  const FRAME_INTERVAL = 1000 / 60;

  function animate(time: number) {
    animationFrameId = requestAnimationFrame(animate);

    const deltaTime = time - lastTime;

    if (deltaTime < FRAME_INTERVAL) {
      return;
    }

    lastTime = time - (deltaTime % FRAME_INTERVAL);

    if (!canvasElement) return;

    if (!ctx) ctx = canvasElement.getContext("2d");
    if (!ctx) return;

    const width = canvasElement.width;
    const height = canvasElement.height;
    const centerX = width / 2 + xOffset;
    const centerY = height / 2 + yOffset;

    ctx.clearRect(0, 0, width, height);

    emitParticles(centerX, centerY, velocityMultiplier);

    particles = particles.filter((p) => p.update());
    particles.forEach((p) => {
      if (!ctx) return;

      const alpha = 1 - p.life / p.maxLife;
      //ctx.shadowBlur = alpha * 5;
      //ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.5 + 0.5})`;
      ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.5 + 0.5})`;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.5 + alpha, 0, Math.PI * 2.5);
      ctx.fill();
    });
  }

  onMount(() => {
    const cleanupResizeListener = createResizeListener(canvasElement!);
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cleanupResizeListener();
      cancelAnimationFrame(animationFrameId);
    };
  });
</script>

<canvas class={cn("h-full w-full", clazz)} bind:this={canvasElement}></canvas>
