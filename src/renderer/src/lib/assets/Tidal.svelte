<script lang="ts">
  import cn from "classnames";

  const { size = 22, class: clazz = "" } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 64 64"
  style="min-width: {size}px; min-height: {size}px;"
  class={cn("fill-none", clazz)}
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M2 22L12 12L22 22L12 32L2 22ZM42 22L32 12L22 22L32 32L22 42L32 52L42 42L32 32L42 22ZM42 22L52 32L62 22L52 12L42 22Z"
    fill="currentColor"
  />
</svg>
