import { derived, type Readable } from "svelte/store";
import type { Song } from "$shared/types/beApi";
import type { RGBColor } from "colorthief";
import { getImageUrl } from "$lib/utils/utils";
import { getColorPalette } from "$lib/color/utils";

export function imageColors(song: Readable<Song>): Readable<Array<RGBColor>> {
  return derived(
    song,
    (song, set) => {
      getColorPalette(getImageUrl(song.coverId)).then((colors) => set(colors));
    },
    [
      [-1, -1, -1],
      [-1, -1, -1],
    ],
  );
}
