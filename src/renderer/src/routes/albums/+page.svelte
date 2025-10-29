<script lang="ts">
  import { page } from "$app/state";

  let albumId = $derived(page.url.searchParams.get("albumId"));
</script>

<span>{albumId}</span>
