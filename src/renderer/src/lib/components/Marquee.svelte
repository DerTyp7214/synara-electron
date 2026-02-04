<script lang="ts">
  import { onMount } from "svelte";
  import cn from "classnames";

  let {
    text,
    class: className,
    speed = 50,
    delay = 2000,
  }: {
    text: string;
    class?: string;
    speed?: number;
    delay?: number;
  } = $props();

  let container: HTMLDivElement;
  let content: HTMLDivElement;
  let shouldScroll = $state(false);
  let duration = $state(0);

  function checkScroll() {
    if (container && content) {
      const containerWidth = container.clientWidth;
      const contentWidth = content.scrollWidth;
      shouldScroll = contentWidth > containerWidth;
      if (shouldScroll) {
        duration = contentWidth / speed;
      }
    }
  }

  onMount(() => {
    checkScroll();
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  });
</script>

<div
  bind:this={container}
  class={cn("relative overflow-hidden whitespace-nowrap", className)}
>
  <div
    bind:this={content}
    class={cn("inline-block", { "animate-marquee": shouldScroll })}
    style:--duration="{duration}s"
    style:--delay="{delay}ms"
  >
    {text}
    {#if shouldScroll}
      <span class="pl-8">{text}</span>
    {/if}
  </div>
</div>

<style>
  @keyframes marquee {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }

  .animate-marquee {
    display: inline-flex;
    animation: marquee var(--duration) linear infinite;
    animation-delay: var(--delay);
  }
</style>
