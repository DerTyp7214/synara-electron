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
    <path
      class:animate={isHovered}
      d="M17.971 4.285A2 2 0 0 1 21 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432z"
    />
    <path d="M3 20V4" />
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
    transform: translateX(2px);
  }
</style>
