<script lang="ts">
  import { Avatar } from "@skeletonlabs/skeleton-svelte";
  import { t } from "$lib/i18n/i18n";
  import cn from "classnames";
  import { resolve } from "$app/paths";
  import { goto } from "$app/navigation";
  import { Play } from "@lucide/svelte";
  import { mediaSession } from "$lib/audio/mediaSession";
  import { PlayingSourceType } from "$shared/types/settings";
  import { openContextMenu } from "$lib/contextMenu/store.svelte";
  import { addToQueue, playAlbum, playNext } from "$lib/utils/mediaPlayer";
  import { getContext } from "svelte";
  import { TOAST_CONTEXT_KEY, type ToasterContext } from "$lib/consts";
  import type { Album, Artist, Song } from "$shared/types/beApi";
  import { listSongsByAlbum } from "$lib/api/albums";
  import { copy } from "$lib/utils/utils";
  import type { PagedResponse } from "$lib/api/apiTypes";

  const {
    albumRef,
    name,
    by,
    songCount,
    imageUrl,
    size = 64,
    class: clazz = "",
    style = "",
  }: {
    albumRef: Album;
    name: string;
    by?: Array<Artist>;
    songCount: number;
    imageUrl?: string;
    size?: number;
    class?: string;
    style?: string;
  } = $props();

  const playingSourceType = $derived(mediaSession.playingSourceType);
  const playingSourceId = $derived(mediaSession.playingSourceId);

  const toastContext = getContext<ToasterContext>(TOAST_CONTEXT_KEY);

  const isSameSource = $derived(
    $playingSourceType === PlayingSourceType.Album &&
      $playingSourceId === albumRef.id,
  );

  async function handleContextPlay(
    texts: {
      loading: { title: string; description: string };
      success: (response: PagedResponse<Song>) => {
        title: string;
        description: string;
      };
      error: (error: unknown) => { title: string; description: string };
    },
    action: (...songs: Array<Song>) => Promise<void>,
  ) {
    const promise = new Promise<Awaited<ReturnType<typeof listSongsByAlbum>>>(
      (resolve, reject) => {
        listSongsByAlbum(albumRef.id, 0, Number.MAX_SAFE_INTEGER)
          .then((response) => {
            action(...response.data)
              .then(() => resolve(response))
              .catch(reject);
          })
          .catch(reject);
      },
    );

    toastContext.promise(promise, {
      loading: {
        title: texts.loading.title,
        description: texts.loading.description,
      },
      success: (response) => ({
        title: texts.success(response).title,
        description: texts.success(response).description,
        duration: 4000,
      }),
      error: (response: unknown) => ({
        title: texts.error(response).title,
        description: texts.error(response).description,
        duration: 4000,
      }),
    });
  }

  async function handlePlayNext() {
    await handleContextPlay(
      {
        loading: {
          title: $t("play.fetch.title"),
          description: $t("play.fetch.description"),
        },
        success: (response: PagedResponse<Song>) => ({
          title: $t("play.next"),
          description: $t("play.next.success", {
            songTitle: response.data[0].title,
          }),
        }),
        error: (response: unknown) => ({
          title: $t("play.next"),
          description: $t("play.next.error", {
            message: response as never,
          }),
        }),
      },
      playNext,
    );
  }

  async function handleAddToQueue() {
    await handleContextPlay(
      {
        loading: {
          title: $t("play.fetch.title"),
          description: $t("play.fetch.description"),
        },
        success: (response: PagedResponse<Song>) => ({
          title: $t("play.addToQueue"),
          description: $t("play.addToQueue.success", {
            songCount: response.data.length.toString(),
          }),
        }),
        error: (response: unknown) => ({
          title: $t("play.addToQueue"),
          description: $t("play.addToQueue.error", {
            message: response as never,
          }),
        }),
      },
      addToQueue,
    );
  }

  function handleContextMenu(event: MouseEvent) {
    openContextMenu(event, [
      {
        label: $t("play.next"),
        action: handlePlayNext,
      },
      {
        label: $t("play.addToQueue"),
        action: handleAddToQueue,
      },
    ]);
  }

  function handlePlay(event: MouseEvent) {
    event.stopPropagation();
    event.stopImmediatePropagation();

    playAlbum(copy(albumRef));
  }
</script>

<div
  {style}
  class={cn(
    "rounded-container flex flex-row",
    "gap-2 p-3 shadow-md select-none",
    "text-start transition-colors",
    clazz,
    {
      "bg-surface-contrast-800-200/40": !isSameSource,
      "bg-secondary-300-700/40": isSameSource,
    },
  )}
  role="button"
  tabindex="0"
  onkeydown={() => {}}
  oncontextmenu={handleContextMenu}
  onclick={() => {
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(`${resolve("/albums")}?albumId=${albumRef.id}`);
  }}
>
  <div
    class="rounded-base relative overflow-clip"
    style="min-width: {size}px; min-height: {size}px; max-width: {size}px; max-height: {size}px;"
  >
    <Avatar class="rounded-base h-full w-full">
      <Avatar.Image src={imageUrl} />
      <Avatar.Fallback class="bg-tertiary-100-900"
        >{name
          .split(" ")
          .slice(0, 2)
          .map((s) => s.substring(0, 1).toUpperCase())
          .join("")}</Avatar.Fallback
      >
    </Avatar>
    <button
      onclick={handlePlay}
      class={cn(
        "bg-surface-50-950/60",
        "absolute top-0 left-0",
        "flex h-full w-full",
        "items-center justify-center",
        "opacity-0 transition-opacity hover:opacity-100",
      )}
    >
      <Play />
    </button>
  </div>
  <div
    class="flex flex-grow flex-col justify-center overflow-hidden font-medium"
  >
    <span class="line-clamp-1 overflow-ellipsis" title={name}>{name}</span>
    <span class="text-surface-contrast-50-950/50 flex flex-row gap-1 text-sm">
      {#if by}
        <div
          class="line-clamp-1 flex w-max flex-row overflow-hidden break-all"
          title={by.map((a) => a.name).join(", ")}
        >
          {#each by as artist, i (artist.id)}
            <span class="line-clamp-1">{artist.name}</span>
            {#if i < by.length - 1}
              <span class="text-surface-contrast-50-950/50">,&nbsp;</span>
            {/if}
          {/each}
        </div>
        <span class="min-w-max">·</span>
      {/if}
      <span class="min-w-max">{songCount} {$t("songs")}</span>
    </span>
    <span class="text-surface-contrast-50-950/50 min-w-max"
      >{albumRef.releaseDate}</span
    >
  </div>
</div>
