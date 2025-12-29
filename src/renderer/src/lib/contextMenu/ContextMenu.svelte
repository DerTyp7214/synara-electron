<script lang="ts">
  import {
    type ActionFn,
    closeContextMenu,
    type MenuItem,
  } from "$lib/contextMenu/store.svelte";
  import cn from "classnames";

  let {
    x,
    y,
    items,
  }: {
    items: Array<MenuItem<unknown>>;
    x: number;
    y: number;
  } = $props();

  function handleClick<TArgs>(actionFunction: ActionFn<TArgs>, args: TArgs) {
    actionFunction(args);
    closeContextMenu();
  }
</script>

<div
  class={cn(
    "rounded-base fixed",
    "z-50 flex flex-col",
    "bg-surface-contrast-900-100 min-w-40",
    "p-1 shadow-lg",
  )}
  style="top: {y}px; left: {x}px;"
  role="menu"
  aria-hidden="false"
>
  {#each items as item, i (i)}
    {#if item.divider}
      <hr class="my-1 opacity-50" />
    {:else}
      <button
        onclick={() => handleClick(item.action, item.args)}
        class={cn(
          "rounded-base",
          "px-3 py-2 text-start",
          "text-sm transition-colors",
          item.class,
          {
            "text-surface-contrast-100-900 hover:bg-secondary-500 hover:text-white":
              !item.class,
          },
        )}
        role="menuitem"
      >
        {item.label}
      </button>
    {/if}
  {/each}
</div>
