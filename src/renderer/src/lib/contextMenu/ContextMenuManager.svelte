<script lang="ts">
  import ContextMenu from "$lib/contextMenu/ContextMenu.svelte";
  import { closeContextMenu, contextMenu } from "$lib/contextMenu/store.svelte";
  import { onMount } from "svelte";

  function noop() {}

  function handleWindowResize() {
    if (contextMenu.isOpen) closeContextMenu();
  }

  onMount(() => {
    window.addEventListener("resize", handleWindowResize);

    return () => window.removeEventListener("resize", handleWindowResize);
  });
</script>

<svelte:document onclick={closeContextMenu} onkeydown={noop} />

{#if contextMenu.isOpen}
  <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} />
{/if}
