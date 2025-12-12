<script lang="ts">
  import { Avatar } from "@skeletonlabs/skeleton-svelte";
  import { t } from "$lib/i18n/i18n";
  import cn from "classnames";
  import { resolve } from "$app/paths";
  import { goto } from "$app/navigation";
  import { mediaSession } from "$lib/audio/mediaSession";
  import { PlayingSourceType } from "$shared/types/settings";
  import { openContextMenu } from "$lib/contextMenu/store.svelte";
  import { playNext } from "$lib/utils/mediaPlayer";
  import { getContext } from "svelte";
  import { TOAST_CONTEXT_KEY, type ToasterContext } from "$lib/consts";
  import type { Artist } from "$shared/types/beApi";
  import { listSongsByArtist } from "$lib/api/artists";

  const {
    artistRef,
    name,
    imageUrl,
    size = 64,
    style = "",
  }: {
    artistRef: Artist;
    name: string;
    imageUrl?: string;
    size?: number;
    style?: string;
  } = $props();

  const playingSourceType = $derived(mediaSession.playingSourceType);
  const playingSourceId = $derived(mediaSession.playingSourceId);

  const toastContext = getContext<ToasterContext>(TOAST_CONTEXT_KEY);

  const isSameSource = $derived(
    $playingSourceType === PlayingSourceType.Artist &&
      $playingSourceId === artistRef.id,
  );

  async function handlePlayNext() {
    const promise = new Promise<Awaited<ReturnType<typeof listSongsByArtist>>>(
      (resolve, reject) => {
        listSongsByArtist(artistRef.id, 0, Number.MAX_SAFE_INTEGER)
          .then((response) => {
            playNext(...response.data)
              .then(() => resolve(response))
              .catch(reject);
          })
          .catch(reject);
      },
    );

    toastContext.promise(promise, {
      loading: {
        title: $t("play.fetch.title"),
        description: $t("play.fetch.description", { name: artistRef.name }),
      },
      success: (response) => ({
        title: $t("play.next"),
        description: $t("play.next.success", {
          songTitle: response.data[0].title,
        }),
        duration: 4000,
      }),
      error: (response: unknown) => ({
        title: $t("play.next"),
        description: $t("play.next.error", {
          message: response as never,
        }),
        duration: 4000,
      }),
    });
  }

  function handleContextMenu(event: MouseEvent) {
    openContextMenu(event, [
      {
        label: $t("play.next"),
        action: handlePlayNext,
      },
    ]);
  }
</script>

<button
  class={cn(
    "rounded-container flex flex-col",
    "gap-2 p-3 shadow-md select-none",
    "text-start transition-colors",
    {
      "bg-surface-contrast-800-200/40": !isSameSource,
      "bg-secondary-300-700/40": isSameSource,
    },
  )}
  style="max-width: calc(1.5rem + {size}px); width: calc(1.5rem + {size}px); {style}"
  oncontextmenu={handleContextMenu}
  onclick={() => {
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(`${resolve("/artists")}?artistId=${artistRef.id}`);
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
  <span class="text-center font-medium break-words">{name}</span>
</button>
