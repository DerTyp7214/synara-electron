<script lang="ts">
  import { Portal, Tooltip } from "@skeletonlabs/skeleton-svelte";

  const { children, text, class: clazz = "" } = $props();
</script>

<Tooltip>
  <Tooltip.Trigger class={clazz}>{@render children()}</Tooltip.Trigger>
  <Portal>
    <Tooltip.Positioner>
      <Tooltip.Content class="card bg-surface-100-900 max-w-md p-2 shadow-xl">
        {text}
        <Tooltip.Arrow
          style="--arrow-size: calc(var(--spacing) * 2); --arrow-background: var(--color-surface-100-900);"
        >
          <Tooltip.ArrowTip />
        </Tooltip.Arrow>
      </Tooltip.Content>
    </Tooltip.Positioner>
  </Portal>
</Tooltip>
