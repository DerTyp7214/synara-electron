<script>
  /**
   * @typedef {Object} Props
   * @property {string} [color]
   * @property {number} [size]
   * @property {number} [strokeWidth]
   * @property {boolean} [isHovered]
   * @property {string} [class]
   */

  /** @type {Props} */
  let {
    color = "currentColor",
    size = 24,
    strokeWidth = 2,
    isHovered = false,
    class: className = "",
  } = $props();

  function handleMouseEnter() {
    isHovered = true;
    setTimeout(() => (isHovered = false), 200);
  }
</script>

<div
  class={className}
  aria-label="arrow-big-left"
  role="img"
  onmouseenter={handleMouseEnter}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="fill-none"
    stroke={color}
    stroke-width={strokeWidth}
  >
    <rect
      x="14"
      y="3"
      width="5"
      height="18"
      rx="1"
      class:animateR={isHovered}
    />
    <rect x="5" y="3" width="5" height="18" rx="1" class:animateL={isHovered} />
  </svg>
</div>

<style>
  div {
    display: inline-block;
  }

  rect {
    transition: transform 0.2s ease-out;
  }

  .animateL {
    transform: translateX(-1px);
  }

  .animateR {
    transform: translateX(1px);
  }
</style>
