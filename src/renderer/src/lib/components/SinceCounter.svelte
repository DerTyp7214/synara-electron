<script lang="ts">
  import cn from "classnames";
  import dayjs from "$lib/utils/dayJsUtils";
  import ToolTip from "$lib/components/ToolTip.svelte";
  import { onMount } from "svelte";

  const {
    time,
    refresh = 1000 * 60,
    textClasses,
    toolTipClasses,
  }: {
    time: number | string;
    refresh?: number;
    textClasses: string | Array<string>;
    toolTipClasses: string | Array<string>;
  } = $props();

  let refreshedTime = $state(Date.now());
  let interval: NodeJS.Timeout | undefined;

  function refreshTime() {
    refreshedTime = Date.now();
  }

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refresh;

    clearInterval(interval);
    interval = setInterval(refreshTime, refresh);
  });

  onMount(() => {
    interval = setInterval(refreshTime, refresh);

    return () => clearInterval(interval);
  });
</script>

{#key refreshedTime}
  <ToolTip text={dayjs(time).format("LLL")} class={cn(toolTipClasses)}>
    <span class={cn(textClasses)}>
      {dayjs(time).fromNow()}
    </span>
  </ToolTip>
{/key}
