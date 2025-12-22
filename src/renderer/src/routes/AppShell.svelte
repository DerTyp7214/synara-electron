<script lang="ts">
  import "$src/app.css";
  import Logo from "$lib/components/Logo.svelte";
  import cn from "classnames";
  import { Menu } from "@lucide/svelte";
  import { ChevronLeft, Cog, Download } from "@jis3r/icons";
  import MediaPlayer from "$lib/components/MediaPlayer.svelte";
  import PlaylistList from "$lib/components/PlaylistList.svelte";
  import { t } from "$lib/i18n/i18n";
  import LightSwitch from "$lib/components/LightSwitch.svelte";
  import LikedSongsBg from "$lib/assets/LikedSongsBg.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { isMac, nativeFullscreen } from "$lib/utils/utils";
  import { onMount, type Snippet } from "svelte";
  import Search from "$lib/components/Search.svelte";
  import { type Writable, writable } from "svelte/store";
  import Looper from "$lib/components/Looper.svelte";

  const {
    children,
    mediaPlayerOpen = writable(false),
  }: {
    children: Snippet;
    mediaPlayerOpen: Writable<boolean>;
  } = $props();

  let sidebarOpen = $state(false);
  let playlists = $state<PlaylistList>();

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      sidebarOpen = false;
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  });
</script>

<div class="flex h-full w-full flex-col overflow-hidden">
  <div
    class={cn(
      "m-2 mb-28",
      "flex grow",
      "gap-2 overflow-hidden",
      "transition-opacity",
      {
        "opacity-0": $mediaPlayerOpen,
        "opacity-100": !$mediaPlayerOpen,
      },
    )}
  >
    <aside
      class={cn(
        "flex-col",
        "bg-surface-400-600 rounded-container shrink-0 overflow-hidden md:bg-transparent",
        "max-w-3xs transition-all lg:max-w-xs",
        "h-full w-full",
        "z-30 md:translate-x-0",
        {
          "-translate-x-full": !sidebarOpen,
          "translate-x-0": sidebarOpen,
        },
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
              "m-0 min-h-0 border-0": $nativeFullscreen,
            },
          )}
        ></div>
      {/if}
      <div
        class={cn(
          "bg-surface-50-950/40 flex-col",
          "shrink-0 overflow-y-auto",
          "h-full w-full",
          "app-card flex flex-1",
          "rounded-container shadow-md",
          "max-h-full transition-colors",
        )}
      >
        <div class="ms-4 me-4 mt-4 mb-2 flex flex-row gap-2">
          <button
            class="flex items-center justify-center transition-opacity hover:opacity-80 md:hidden"
            onclick={() => (sidebarOpen = false)}
          >
            <ChevronLeft />
          </button>
          <Logo small onclick={() => goto(resolve("/"))} />
        </div>

        <span class="text-surface-700-300 text-md ms-4 me-4 mt-2 font-bold"
          >{$t("likedSongs.title")}</span
        >

        <button
          class="ms-4 me-4 mt-2 mb-4"
          onclick={() => goto(resolve("/likedSongs"))}
        >
          <LikedSongsBg
            class={cn(
              "bg-secondary-950-50/20",
              "rounded-container w-full",
              "hover:text-secondary-900-100",
            )}
          />
        </button>

        <div class="bg-surface-600-400 ms-4 me-4 h-1 rounded-full"></div>

        <div class="flex flex-row items-center justify-between p-4 pb-0">
          <span class="text-surface-700-300 text-md font-bold">
            {$t("playlists.title")}
          </span>
          <Looper
            interval={60000}
            size={12}
            onInterval={() => playlists?.reload()}
          />
        </div>

        <div class="flex h-full w-full flex-col gap-2 overflow-auto p-4">
          <PlaylistList bind:this={playlists} />
        </div>
      </div>
    </aside>

    <div
      class="-ms-66 flex w-full max-w-full flex-col gap-2 overflow-hidden transition-transform md:ms-0"
    >
      <div class="flex flex-row gap-2">
        {#if isMac()}
          <div
            class={cn(
              "bg-surface-50-950/40 flex md:hidden",
              "rounded-container shadow-md",
              "app-card transition-colors",
              "min-w-20",
              {
                draggable: !sidebarOpen,
              },
            )}
          ></div>
        {/if}
        <div
          class={cn(
            "bg-surface-50-950/40 flex-1",
            "shrink-0 overflow-y-auto p-4",
            "rounded-container shadow-md",
            "app-card transition-colors",
            "flex items-center gap-2",
            "justify-between",
          )}
        >
          <button
            onclick={() => (sidebarOpen = !sidebarOpen)}
            class="flex transition-opacity hover:opacity-80 md:hidden"
          >
            <Menu />
          </button>
          <Search />
          <button
            class="ms-2 me-auto"
            onclick={() => goto(resolve("/allSongs"))}
          >
            {$t("songs.all")}
          </button>
          <LightSwitch />
          <button
            onclick={() => goto(resolve("/downloads"))}
            class={cn(
              "ms-2",
              "flex items-center justify-center",
              "rounded-md p-2",
              "transition-colors",
              "hover:bg-surface-950-50/20",
            )}
          >
            <Download />
          </button>
          <button
            onclick={() => goto(resolve("/settings"))}
            class={cn(
              "me-2",
              "flex items-center justify-center",
              "rounded-md p-2",
              "transition-colors",
              "hover:bg-surface-950-50/20",
            )}
          >
            <Cog />
          </button>
        </div>
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

  <MediaPlayer isOpen={mediaPlayerOpen} />
</div>
