<script lang="ts">
  import { XIcon } from "@lucide/svelte";
  import { Dialog, Portal } from "@skeletonlabs/skeleton-svelte";
  import cn from "classnames";
  import { closeDialog, dialogState } from "$lib/addToPlaylist/store.svelte";
  import type { UserPlaylist } from "$shared/types/beApi";
  import {
    addToPlaylist,
    listUserPlaylists,
    queryUserPlaylists,
  } from "$lib/api/userPlaylists";
  import { TOAST_CONTEXT_KEY, type ToasterContext } from "$lib/consts";
  import { getContext } from "svelte";
  import { t } from "$lib/i18n/i18n";
  import Search from "$lib/components/Search.svelte";
  import UserPlaylistItem from "$lib/components/UserPlaylistItem.svelte";

  const toastContext = getContext<ToasterContext>(TOAST_CONTEXT_KEY);

  let playlists = $state<Array<UserPlaylist>>([]);

  async function selectPlaylist(playlist: UserPlaylist) {
    const amount = await addToPlaylist(playlist.id, ...dialogState.songs);

    toastContext.success({
      title: "Playlist",
      description: $t(
        amount === 1 ? "playlist.added.song" : "playlist.added.songs",
        {
          amount: amount.toString(),
          playlistName: playlist.name,
        },
      ),
      duration: 3000,
    });

    closeDialog();
  }

  async function filterPlaylists(query: string) {
    playlists = await queryUserPlaylists(query)
      .then((res) => res.data)
      .catch(() => []);
  }

  async function loadInitialPlaylists() {
    playlists = await listUserPlaylists(0, Number.MAX_SAFE_INTEGER)
      .then((res) => res.data)
      .catch(() => []);
  }

  $effect(() => {
    if (dialogState.open) void loadInitialPlaylists();
  });
</script>

<Dialog
  open={dialogState.open}
  onOpenChange={(open) => (dialogState.open = open.open)}
>
  <Portal>
    <Dialog.Backdrop class="bg-surface-50-950/50 fixed inset-0 z-50" />
    <Dialog.Positioner
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <Dialog.Content
        class={cn(
          "card bg-surface-100-900 w-full max-w-xl shadow-xl",
          "flex max-h-[80vh] flex-col gap-4",
          "transition transition-discrete",
          "data-[state=open]:translate-y-0 data-[state=open]:opacity-100 starting:data-[state=open]:translate-y-25",
          "translate-y-25 opacity-0 starting:data-[state=open]:opacity-0",
        )}
      >
        <header class="ms-4 me-4 mt-4 flex items-center justify-between">
          <Dialog.Title class="text-lg font-bold">
            {$t("playlist.add.title")}
          </Dialog.Title>
          <Dialog.CloseTrigger class="btn-icon hover:preset-tonal">
            <XIcon class="size-4" />
          </Dialog.CloseTrigger>
        </header>
        <div class="ps-4 pe-4">
          <Search onSubmit={filterPlaylists} />
        </div>
        <div class="flex flex-col gap-2 overflow-auto p-4">
          {#each playlists as playlist (playlist.id)}
            <UserPlaylistItem
              onClick={selectPlaylist}
              playlistRef={playlist}
              name={playlist.name}
              songCount={playlist.songs.length}
              size={44}
            />
          {/each}
        </div>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog>
