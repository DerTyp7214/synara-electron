import { derived, type Readable } from "svelte/store";
import type { Song } from "$shared/types/beApi";
import type { RGBColor } from "colorthief";
import { getImageUrl } from "$lib/utils/utils";
import { getColorPalette } from "$lib/color/utils";

export function imageColors(song: Readable<Song>): Readable<Array<RGBColor>> {
  return derived(
    song,
    (song, set) => {
      const url = getImageUrl(song.coverId);
      if (!url)
        return set([
          [-1, -1, -1],
          [-1, -1, -1],
        ]);
      getColorPalette(url).then((colors) => set(colors));
    },
    [
      [-1, -1, -1],
      [-1, -1, -1],
    ],
  );
}
