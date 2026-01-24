<script lang="ts">
  import { onMount } from "svelte";

  // State using Svelte 5 runes
  let isMaximized = $state(false);
  let showIcons = $state(false);

  onMount(async () => {
    isMaximized = await window.api.getIsMaximized();
    return window.api.onMaximizedChange((maximized) => {
      isMaximized = maximized;
    });
  });

  function handleMinimize() {
    window.api.minimizeWindow();
  }

  function handleMaximize() {
    window.api.maximizeWindow();
  }

  function handleClose() {
    window.api.closeWindow();
  }
</script>

<header
  role="banner"
  aria-label="Window controls"
  class="bg-surface-50-950/60 draggable flex h-8 w-full items-center gap-2 px-3"
  onmouseenter={() => (showIcons = true)}
  onmouseleave={() => (showIcons = false)}
  ondblclick={handleMaximize}
>
  <button
    class="interactive group flex h-3 w-3 items-center justify-center rounded-full bg-[#FF5F57] transition-colors hover:bg-[#FF4136]"
    onclick={handleClose}
    aria-label="Close"
  >
    {#if showIcons}
      <svg
        class="h-2 w-2 text-[#8B0000] group-hover:text-black"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 2L10 10M10 2L2 10"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    {/if}
  </button>

  <button
    class="interactive group flex h-3 w-3 items-center justify-center rounded-full bg-[#FFBD2E] transition-colors hover:bg-[#FFB000]"
    onclick={handleMinimize}
    aria-label="Minimize"
  >
    {#if showIcons}
      <svg
        class="h-2 w-2 text-[#8B6F00] group-hover:text-black"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 6H10"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    {/if}
  </button>

  <button
    class="interactive group flex h-3 w-3 items-center justify-center rounded-full bg-[#28C840] transition-colors hover:bg-[#20B030]"
    onclick={handleMaximize}
    aria-label={isMaximized ? "Restore" : "Maximize"}
  >
    {#if showIcons}
      {#if isMaximized}
        <svg
          class="h-2 w-2 text-[#006400] group-hover:text-black"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 5V3H9V9H7M3 5H7V9H3V5Z"
            stroke="currentColor"
            stroke-width="1"
            fill="none"
          />
        </svg>
      {:else}
        <svg
          class="h-2 w-2 text-[#006400] group-hover:text-black"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 4L2 2L4 2M8 2H10V4M10 8V10H8M4 10H2V8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      {/if}
    {/if}
  </button>
</header>
