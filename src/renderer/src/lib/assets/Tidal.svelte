<script lang="ts">
  import cn from "classnames";

  let {
    color = "currentColor",
    size = 22,
    isHovered = false,
    class: clazz = "",
  } = $props();

  function handleMouseEnter() {
    isHovered = true;
  }

  function handleMouseLeave() {
    isHovered = false;
  }
</script>

<div
  class={cn(clazz)}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  role="img"
>
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    style="min-width: {size}px; min-height: {size}px;"
    class="fill-none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      id="shape-1"
      d="M2 22L12 12L22 22L12 32L2 22Z"
      fill={color}
      class:animate={isHovered}
    />
    <path
      id="shape-2"
      d="M42 22L32 12L22 22L32 32L42 22Z"
      fill={color}
      class:animate={isHovered}
    />
    <path
      id="shape-3"
      d="M22 42L32 32L42 42L32 52L22 42Z"
      fill={color}
      class:animate={isHovered}
    />
    <path
      id="shape-4"
      d="M42 22L52 32L62 22L52 12L42 22Z"
      fill={color}
      class:animate={isHovered}
    />
  </svg>
</div>

<style>
  div {
    display: inline-block;
  }

  path {
    transition: transform 0.2s ease-out;
  }

  .animate {
    transform: rotate(45deg) scale(1.1);
  }

  #shape-1 {
    transform-origin: 12px 22px;
  }

  #shape-2 {
    transform-origin: 32px 22px;
  }

  #shape-3 {
    transform-origin: 32px 42px;
  }

  #shape-4 {
    transform-origin: 52px 22px;
  }
</style>
