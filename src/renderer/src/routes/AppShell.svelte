<script lang="ts">
  import "$src/app.css";
  import Logo from "$lib/components/Logo.svelte";
  import cn from "classnames";
  import MediaPlayer from "$lib/components/MediaPlayer.svelte";
  import PlaylistList from "$lib/components/PlaylistList.svelte";
  import { t } from "$lib/i18n/i18n";
  import LightSwitch from "$lib/components/LightSwitch.svelte";
  import LikedSongsBg from "$lib/assets/LikedSongsBg.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { isMac, nativeFullscreen } from "$lib/utils";

  const { children } = $props();

  let mediaPlayerOpen = $state(false);
</script>

<div class="flex h-full w-full flex-col overflow-hidden">
  <div
    class={cn(
      "m-2 mb-28",
      "flex flex-grow",
      "gap-2 overflow-hidden",
      "transition-opacity",
      {
        "opacity-0": mediaPlayerOpen,
        "opacity-100": !mediaPlayerOpen,
      },
    )}
  >
    <aside
      class={cn(
        "flex-col",
        "flex-shrink-0 overflow-hidden",
        "max-w-3xs lg:max-w-xs",
        "!hidden md:!flex",
      )}
    >
      {#if isMac()}
        <div
          class={cn(
            "bg-surface-50-950/40",
            "rounded-container shadow-md",
            "app-card w-full",
            "draggable transition-all",
            {
              "mb-2 min-h-10": !$nativeFullscreen,
              "m-0 min-h-0": $nativeFullscreen,
            },
          )}
        ></div>
      {/if}
      <div
        class={cn(
          "bg-surface-50-950/40 flex-col",
          "flex-shrink-0 overflow-y-auto",
          "app-card flex w-full flex-1",
          "rounded-container shadow-md",
          "transition-colors",
        )}
      >
        <Logo
          small
          class="ms-4 me-4 mt-4 mb-2"
          onclick={() => goto(resolve("/"))}
        />

        <span class="text-surface-700-300 text-md ms-4 me-4 mt-2 font-bold"
          >{$t("likedSongs.title")}</span
        >

        <button
          class="bg-secondary-950-50/20 rounded-container ms-4 me-4 mt-2 mb-4 p-2"
          onclick={() => goto(resolve("/likedSongs"))}
        >
          <LikedSongsBg />
        </button>

        <div class="bg-surface-600-400 ms-4 me-4 h-1 rounded-full"></div>

        <span class="text-surface-700-300 text-md ms-4 me-4 mt-4 font-bold"
          >{$t("playlists.title")}</span
        >

        <div class="flex h-full w-full flex-col gap-2 overflow-auto p-4">
          <PlaylistList />
        </div>
      </div>
    </aside>

    <div class="flex w-full max-w-full flex-col gap-2 overflow-hidden">
      <div
        class={cn(
          "bg-surface-50-950/40",
          "flex-shrink-0 overflow-y-auto p-8",
          "rounded-container shadow-md",
          "app-card transition-colors",
        )}
      >
        Top Bar
        <LightSwitch />
      </div>

      <main
        class={cn(
          "bg-surface-50-950/40 overflow-hidden",
          "rounded-container shadow-md",
          "app-card flex-1 transition-colors",
        )}
      >
        {@render children()}
      </main>
    </div>
  </div>

  <MediaPlayer bind:isOpen={mediaPlayerOpen} />
</div>
