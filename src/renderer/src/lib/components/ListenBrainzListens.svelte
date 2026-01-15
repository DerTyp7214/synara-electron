<script lang="ts">
  import { Avatar } from "@skeletonlabs/skeleton-svelte";
  import Looper from "$lib/components/Looper.svelte";
  import type { Listen } from "$lib/api/musicBrainz.d";
  import musicScrobbler from "$lib/audio/musicScrobbler";
  import { getListens } from "$lib/api/musicBrainz";
  import { onMount } from "svelte";
  import cn from "classnames";
  import SinceCounter from "$lib/components/SinceCounter.svelte";

  const hasScrobbled = $derived(musicScrobbler.hasScrobbled());

  let listens = $state<Array<Listen>>([]);
  let looper = $state<Looper | undefined>();

  const baseTextClasses = [
    "text-surface-contrast-50-950/50",
    "hover:text-surface-contrast-50-950/80",
    "transition-colors",
    "text-sm",
  ];

  const textClasses = ["line-clamp-1", "overflow-ellipsis", ...baseTextClasses];

  async function fetchListens() {
    listens = await getListens()
      .then((payload) => payload?.listens ?? [])
      .catch(() => []);
  }

  $effect(() => {
    if ($hasScrobbled) {
      setTimeout(() => {
        looper?.reset();
        fetchListens();
      }, 2 * 1000);
    }
  });

  onMount(() => {
    fetchListens();
  });
</script>

<div class="flex h-full flex-col">
  <Looper
    bind:this={looper}
    interval={1000 * 60 * 5}
    size={12}
    onInterval={fetchListens}
  />

  <div class="flex h-full flex-col gap-2 overflow-auto p-4">
    {#each listens as listen (listen.listened_at + listen.recording_msid)}
      {@const release_mbid =
        listen.track_metadata?.mbid_mapping?.caa_release_mbid}
      <div class="flex flex-row gap-2 select-none">
        <Avatar class="rounded-base h-16 w-16">
          {#if release_mbid}
            <Avatar.Image
              class="h-16 w-16 object-cover object-center"
              src="https://coverartarchive.org/release/{release_mbid}/front-250"
            />
          {/if}
          <Avatar.Fallback class="bg-tertiary-100-900">
            {listen.track_metadata.track_name
              .split(" ")
              .slice(0, 2)
              .map((s) => s.substring(0, 1).toUpperCase())
              .join("")}
          </Avatar.Fallback>
        </Avatar>
        <div class="flex flex-col">
          <span class="line-clamp-1 font-medium overflow-ellipsis">
            {listen.track_metadata.track_name}
          </span>
          <span class={cn(baseTextClasses, "font-medium", "whitespace-nowrap")}>
            {listen.track_metadata.artist_name}
          </span>
          <SinceCounter
            time={listen.listened_at * 1000}
            refresh={1000 * 60}
            textClasses={cn(textClasses, "text-xs", "font-medium")}
            toolTipClasses={cn("me-auto")}
          />
        </div>
      </div>
    {/each}
  </div>
</div>
