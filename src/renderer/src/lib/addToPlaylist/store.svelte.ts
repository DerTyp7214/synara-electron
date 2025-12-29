import type { UUID } from "node:crypto";

export type AddToPlaylistDialogState =
  | {
      open: true;
      songs: Array<UUID>;
    }
  | {
      open: false;
      songs: Array<UUID>;
    };

export function showDialog(...songs: Array<UUID>) {
  dialogState.open = true;
  dialogState.songs = songs;
}

export function closeDialog() {
  dialogState.open = false;
}

export const dialogState = $state<AddToPlaylistDialogState>({
  open: false,
  songs: [],
});
