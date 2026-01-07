<script lang="ts">
  import { loggedIn } from "$lib/api/auth";
  import { onNavigate } from "$app/navigation";
  import { defaultNavigation, getImageUrl } from "$lib/utils/utils";
  import CoversOnFloor from "$lib/assets/CoversOnFloor.svelte";
  import { queryAlbums } from "$lib/api/albums";
  import { onMount } from "svelte";

  onNavigate(defaultNavigation);

  let coverUrls = $state<[string, string, string, string, string]>([
    "",
    "",
    "",
    "",
    "",
  ]);

  onMount(async () => {
    const albums = await queryAlbums(" ", 0, 5);
    const urls = albums.data.map((album) => getImageUrl(album.coverId, 200));
    coverUrls = [
      urls[0] ?? "",
      urls[1] ?? "",
      urls[2] ?? "",
      urls[3] ?? "",
      urls[4] ?? "",
    ];
  });
</script>

{#if $loggedIn}
  Yo
  <CoversOnFloor style="width: 500px; height: 500px" {coverUrls} />
{/if}
