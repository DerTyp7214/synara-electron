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
    <path d="M21 4v16" />
    <path
      class:animate={isHovered}
      d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z"
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
    transform: translateX(-2px);
  }
</style>
