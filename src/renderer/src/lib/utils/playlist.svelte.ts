import type { Playlist } from "$shared/types/beApi";
import { getImageUrl } from "$lib/utils/utils";
import type { UUID } from "node:crypto";
import { mount, tick, unmount } from "svelte";
import CoversOnFloor from "$lib/assets/CoversOnFloor.svelte";
import { listSongsByUserPlaylist } from "$lib/api/userPlaylists";
import { getBase64FromAsset, toDataURL } from "$lib/utils/ui";
import coverBackground from "$lib/assets/cover-art-on-floor.png";

export async function getPlaylistCover(
  playlist: Playlist,
  size: number = 1200,
): Promise<string | undefined> {
  if (playlist.imageId) return getImageUrl(playlist.imageId, size);

  const songs = await listSongsByUserPlaylist(playlist.id, 0, 25);

  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const covers = [...new Set(songs.data.map((song) => song.coverId))].filter(
    (id) => id,
  );

  if (covers.length === 0) return getImageUrl(playlist.imageId, size);

  const ids: Array<UUID | undefined> = [];
  while (ids.length < 5) {
    ids.push(...covers);
  }

  const urls = ids
    .slice(0, 5)
    .map((id) => getImageUrl(id, Math.ceil(size / 3))) as [
    string,
    string,
    string,
    string,
    string,
  ];

  const host = document.createElement("div");

  const b64Background = coverBackground.startsWith("app:")
    ? await getBase64FromAsset(coverBackground)
    : await toDataURL(coverBackground);
  const b64Covers = (await Promise.all(urls.map((url) => toDataURL(url)))) as [
    string,
    string,
    string,
    string,
    string,
  ];

  const component = mount(CoversOnFloor, {
    target: host,
    props: {
      background: b64Background,
      coverUrls: b64Covers,
    },
  });

  await tick();

  const url = component.getSvgUrl();

  void unmount(component);

  return url ?? getImageUrl(playlist.imageId, size);
}
