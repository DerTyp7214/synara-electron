<script lang="ts">
  import { page } from "$app/state";

  let artistId = $derived(page.url.searchParams.get("artistId"));
</script>

<span>{artistId}</span>
