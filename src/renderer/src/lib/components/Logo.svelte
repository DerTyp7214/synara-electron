<script lang="ts">
  import { Music2 } from "@lucide/svelte";
  import { t } from "$lib/i18n/i18n";
  import cn from "classnames";
  import type { MouseEventHandler } from "svelte/elements";

  const {
    small = false,
    class: clazz = "",
    onclick = null,
  }: {
    small?: boolean;
    class?: string;
    onclick?: MouseEventHandler<HTMLButtonElement> | undefined | null;
  } = $props();
</script>

<button
  {onclick}
  class={cn("flex h-max w-max items-center justify-center gap-1", clazz, {
    "flex-col": !small,
    "flex-row": small,
    "cursor-default": !onclick,
  })}
>
  <div class="flex">
    <Music2 class="mt-2" size={small ? "18" : "32"} />
    <Music2 class="-ms-1" size={small ? "18" : "32"} />
    <Music2 class="mt-2" size={small ? "18" : "32"} />
    <Music2 class="-ms-1" size={small ? "18" : "32"} />
  </div>
  <span class={cn("font-major-mono-display text-2xl uppercase")}
    >{$t("title")}</span
  >
</button>
