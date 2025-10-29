<script lang="ts">
  import { Avatar } from "@skeletonlabs/skeleton-svelte";
  import { t } from "$lib/i18n/i18n";
  import Spotify from "$lib/assets/Spotify.svelte";
  import Tidal from "$lib/assets/Tidal.svelte";

  type PlaylistOrigin = "tidal" | "spotify";

  const {
    name,
    by,
    songCount,
    origin,
    imageUrl,
    size = 64,
  }: {
    name: string;
    by?: string;
    songCount: number;
    origin?: PlaylistOrigin;
    imageUrl?: string;
    size?: number;
  } = $props();
</script>

<div
  class="bg-surface-300-700/40 rounded-container flex flex-row gap-2 p-3 shadow-md"
>
  <Avatar
    class="rounded-base"
    style="min-width: {size}px; min-height: {size}px; max-width: {size}px; max-height: {size}px;"
  >
    <Avatar.Image src={imageUrl} />
    <Avatar.Fallback
      >{name
        .split(" ")
        .slice(0, 2)
        .map((s) => s.substring(0, 1).toUpperCase())
        .join("")}</Avatar.Fallback
    >
  </Avatar>
  <div class="flex flex-grow flex-col justify-center font-medium">
    <span class="line-clamp-1 overflow-ellipsis">{name}</span>
    <span
      class="text-surface-contrast-50-950/50 line-clamp-1 text-sm overflow-ellipsis"
      >{by ? `${by} · ` : ""}{songCount} {$t("songs")}</span
    >
  </div>
  {#if origin === "spotify"}
    <Spotify class="ms-auto mt-auto mb-auto" size={size / 2.5} />
  {:else if origin === "tidal"}
    <Tidal class="ms-auto mt-auto mb-auto" size={size / 3} />
  {/if}
</div>
