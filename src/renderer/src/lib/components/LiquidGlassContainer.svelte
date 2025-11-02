<script lang="ts">
  import cn from "classnames";

  const { children, class: clazz = "", active = false } = $props();
</script>

<div
  class={cn("transition-all", {
    "liquid-glass-card": active,
    [clazz]: active,
  })}
>
  {@render children()}
</div>

<svg style="display: none;">
  <filter id="displacementFilter">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.01"
      numOctaves="2"
      result="turbulence"
    />

    <feDisplacementMap
      in="SourceGraphic"
      in2="turbulence"
      scale="200"
      xChannelSelector="R"
      yChannelSelector="G"
    />
  </filter>
</svg>

<style>
  .liquid-glass-card {
    width: 100%;
    flex-wrap: wrap;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: opacity 0.26s ease-out;
    border-radius: 28px;
    filter: drop-shadow(-8px -10px 46px #0000005f);
    backdrop-filter: brightness(1.1) blur(2px) url(#displacementFilter);
  }

  .liquid-glass-card::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    border-radius: 28px;
    pointer-events: none;
    -webkit-box-shadow:
      inset 2px 2px 0 -2px rgba(255, 255, 255, 0.7),
      inset 0 0 3px 1px rgba(255, 255, 255, 0.7);
    box-shadow:
      inset 6px 6px 0 -6px rgba(255, 255, 255, 0.7),
      inset 0 0 8px 1px rgba(255, 255, 255, 0.7);
  }
</style>
