<script lang="ts">
  import { onMount } from "svelte";
  import {
    defaultNavigation,
    getMetadataImage,
    openUrl,
  } from "$lib/utils/utils";
  import { onNavigate } from "$app/navigation";
  import {
    authenticated,
    currentDl,
    dl,
    dlQueue,
    getTidalTracksByIds,
    login,
  } from "$lib/api/downloads";
  import type {
    MetadataImage,
    MetadataTrack,
    UrlDownloadQueueEntry,
  } from "$shared/types/beApi";
  import { Avatar } from "@skeletonlabs/skeleton-svelte";
  import cn from "classnames";
  import { t } from "$lib/i18n/i18n";
  import Spinner from "$lib/components/Spinner.svelte";
  import Looper from "$lib/components/Looper.svelte";

  let isActive = $state(false);
  let isAuthenticated = $state(false);
  let authenticationLoading = $state(false);
  let logsLoading = $state(false);

  let logs: Array<string> = $state([]);
  let logsContainer: HTMLDivElement | null = $state(null);

  let queue: Array<CustomMetadataTrack> = $state([]);
  let currentDownload: Array<CustomMetadataTrack> = $state([]);

  function scrollLogsToBottom() {
    if (logsContainer) {
      logsContainer.scrollTo({
        top: logsContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  }

  async function fetchLogs() {
    if (!isActive || logsLoading) return;
    logsLoading = true;

    let scrollTimeout: NodeJS.Timeout | undefined;

    logs = [];
    await dl([], (line) => {
      logs = [...logs, line];

      if (scrollTimeout) {
        scrollLogsToBottom();
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(scrollLogsToBottom, 100);
    });

    logsLoading = false;
  }

  async function fetchQueue() {
    if (!isActive) return;

    currentDownload = await currentDl().then((response) =>
      response && Object.hasOwn(response, "ids")
        ? fetchTidalTracks((<UrlDownloadQueueEntry>response).ids, 48)
        : [],
    );
    queue = await dlQueue()
      .then((response) =>
        Promise.all(
          response.map((entry) =>
            entry && Object.hasOwn(entry, "ids")
              ? fetchTidalTracks((<UrlDownloadQueueEntry>entry).ids, 48)
              : [],
          ),
        ),
      )
      .then((tracks) => tracks.flat());
  }

  function fetch() {
    void fetchLogs();
    void fetchQueue();
  }

  async function checkAuth() {
    isAuthenticated = await authenticated();
    isActive = true;

    if (isAuthenticated) fetch();
  }

  async function authenticate() {
    authenticationLoading = true;
    const success = await login((url) => {
      openUrl(url);
    });

    if (success) await checkAuth();

    authenticationLoading = false;
  }

  async function fetchTidalTracks(
    ids: Array<string>,
    imageSize?: number,
  ): Promise<Array<CustomMetadataTrack>> {
    const tracks = await getTidalTracksByIds(ids);

    return tracks.map((track) => ({
      ...track,
      images: getMetadataImage(track.images, imageSize),
    }));
  }

  onMount(() => {
    checkAuth();

    return () => {
      isActive = false;
    };
  });

  const card = cn(
    "border-surface-700-300 bg-surface-200-800/80",
    "m-3 flex flex-col",
    "min-h-[20vh] max-h-[20vh]",
    "overflow-auto rounded-lg",
    "border-2 p-2 font-mono",
  );

  onNavigate(defaultNavigation);

  type bool = boolean;
  type CustomMetadataTrack = Omit<MetadataTrack, "images"> & {
    images: MetadataImage | undefined;
  };
</script>

{#snippet trackSnippet(track: CustomMetadataTrack, loading: bool)}
  <div class="flex flex-row gap-2">
    <div
      class="rounded-base relative overflow-clip"
      style="min-width: {48}px; min-height: {48}px; max-width: {48}px; max-height: {48}px;"
    >
      <Avatar class="h-full w-full rounded-none">
        <Avatar.Image src={track.images?.url} />
        <Avatar.Fallback class="bg-tertiary-100-900"
          >{track.title
            .split(" ")
            .slice(0, 2)
            .map((s) => s.substring(0, 1).toUpperCase())
            .join("")}</Avatar.Fallback
        >
      </Avatar>
      <div
        class:hidden={!loading}
        class={cn(
          "bg-surface-50-950/60",
          "absolute top-0 left-0",
          "flex h-full w-full",
          "items-center justify-center",
        )}
      >
        <Spinner />
      </div>
    </div>
    <div class="flex flex-1 grow flex-col justify-center overflow-hidden">
      <span class="line-clamp-1 pe-1 font-medium overflow-ellipsis"
        >{track.title}</span
      >
      <div class="line-clamp-1 flex flex-row">
        {#each track.artists as artist, i (i)}
          <span
            class={cn(
              "text-surface-contrast-50-950/50",
              "hover:text-surface-contrast-50-950/80",
              "transition-colors",
              "text-sm",
              "font-medium",
              "whitespace-nowrap",
            )}>{artist}</span
          >
          {#if i < track.artists.length - 1}
            <span class="text-surface-contrast-50-950/50">,&nbsp;</span>
          {/if}
        {/each}
      </div>
    </div>
  </div>
{/snippet}

<div class="flex h-full w-full flex-col gap-1 overflow-y-auto">
  {#if isAuthenticated}
    <div bind:this={logsContainer} class={card}>
      {#if logs.length > 3}
        {#each logs as log, i (i)}
          <span class="text-nowrap">{log}</span>
        {/each}
      {:else}
        <span>{$t("downloads.noLogs")}</span>
      {/if}
    </div>
    <div class={cn("m-3 flex grow flex-col p-2")}>
      <div class="flew-row flex items-center justify-between">
        <span class="text-xl">{$t("downloads.queue")}</span>
        <Looper interval={10000} onInterval={fetch} />
      </div>
      <div class="flex flex-col gap-2">
        {#each currentDownload as track, i (i)}
          {@render trackSnippet(track, true)}
        {/each}
        {#each queue as track, i (i)}
          {@render trackSnippet(track, false)}
        {/each}
      </div>
    </div>
  {:else if isActive}
    <div class="flex flex-col items-center gap-2 p-8">
      <span class="text-lg">{$t("downloads.notAuthenticated")}</span>
      <button
        onclick={authenticate}
        disabled={authenticationLoading}
        class="btn preset-filled"
      >
        {$t("downloads.login")}
        {#if authenticationLoading}
          <Spinner />
        {/if}
      </button>
    </div>
  {:else}
    <div class="flex w-full flex-col items-center p-8">
      <Spinner size={45} />
    </div>
  {/if}
</div>
