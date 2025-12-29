<script lang="ts">
  import { Avatar } from "@skeletonlabs/skeleton-svelte";
  import { t } from "$lib/i18n/i18n";
  import Spotify from "$lib/assets/Spotify.svelte";
  import Tidal from "$lib/assets/Tidal.svelte";
  import cn from "classnames";
  import { resolve } from "$app/paths";
  import { goto } from "$app/navigation";
  import { mediaSession } from "$lib/audio/mediaSession";
  import { PlayingSourceType } from "$shared/types/settings";
  import { openContextMenu } from "$lib/contextMenu/store.svelte";
  import { addToQueue, playNext } from "$lib/utils/mediaPlayer";
  import { getContext } from "svelte";
  import { TOAST_CONTEXT_KEY, type ToasterContext } from "$lib/consts";
  import type { Song } from "$shared/types/beApi";
  import type { PagedResponse } from "$lib/api/apiTypes";
  import {
    listSongsByUserPlaylist,
    type UserPlaylist,
  } from "$lib/api/userPlaylists";
  import { showDialog } from "$lib/addToPlaylist/store.svelte";

  type PlaylistOrigin = "tidal" | "spotify";

  const {
    onClick,
    playlistRef,
    name,
    by,
    songCount,
    origin,
    imageUrl,
    size = 64,
    style = "",
  }: {
    onClick?: (playlist: UserPlaylist) => void;
    playlistRef: UserPlaylist;
    name: string;
    by?: string;
    songCount: number;
    origin?: PlaylistOrigin;
    imageUrl?: string;
    size?: number;
    style?: string;
  } = $props();

  const playingSourceType = $derived(mediaSession.playingSourceType);
  const playingSourceId = $derived(mediaSession.playingSourceId);

  const toastContext = getContext<ToasterContext>(TOAST_CONTEXT_KEY);

  const isSameSource = $derived(
    $playingSourceType === PlayingSourceType.UserPlaylist &&
      $playingSourceId === playlistRef.id,
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
    const promise = new Promise<
      Awaited<ReturnType<typeof listSongsByUserPlaylist>>
    >((resolve, reject) => {
      listSongsByUserPlaylist(playlistRef.id, 0, Number.MAX_SAFE_INTEGER)
        .then((response) => {
          action(...response.data)
            .then(() => resolve(response))
            .catch(reject);
        })
        .catch(reject);
    });

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

  async function handleAddToPlaylist() {
    const songs = await listSongsByUserPlaylist(
      playlistRef.id,
      0,
      Number.MAX_SAFE_INTEGER,
    )
      .then((res) => res.data.map((song) => song.id))
      .catch(() => []);

    showDialog(...songs);
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
      {
        label: $t("playlist.add.title"),
        action: handleAddToPlaylist,
      },
    ]);
  }
</script>

<button
  {style}
  class={cn(
    "rounded-container flex flex-row",
    "gap-2 p-3 shadow-md select-none",
    "text-start transition-colors",
    {
      "bg-surface-contrast-800-200/40": !isSameSource,
      "bg-secondary-300-700/40": isSameSource,
    },
  )}
  oncontextmenu={handleContextMenu}
  onclick={() => {
    if (onClick) onClick(playlistRef);
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    else goto(`${resolve("/userPlaylists")}?playlistId=${playlistRef.id}`);
  }}
>
  <Avatar
    class="rounded-base"
    style="min-width: {size}px; min-height: {size}px; max-width: {size}px; max-height: {size}px;"
  >
    <Avatar.Image src={imageUrl} />
    <Avatar.Fallback class="bg-tertiary-100-900"
      >{name
        .split(" ")
        .slice(0, 2)
        .map((s) => s.substring(0, 1).toUpperCase())
        .join("")}</Avatar.Fallback
    >
  </Avatar>
  <div class="flex grow flex-col justify-center font-medium">
    <span class="line-clamp-1 overflow-ellipsis">{name}</span>
    <span
      class="text-surface-contrast-50-950/50 line-clamp-1 text-sm overflow-ellipsis"
    >
      {by ? `${by} · ` : ""}{songCount}
      {$t("songs")}
    </span>
  </div>
  {#if origin === "spotify"}
    <Spotify class="ms-auto mt-auto mb-auto" size={size / 2.5} />
  {:else if origin === "tidal"}
    <Tidal class="ms-auto mt-auto mb-auto" size={size / 3} />
  {/if}
</button>
