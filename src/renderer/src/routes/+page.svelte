<script lang="ts">
  import { loggedIn } from "$lib/api/auth";
  import { onNavigate } from "$app/navigation";
  import { defaultNavigation } from "$lib/utils/utils";
  import { settings } from "$lib/utils/settings";
  import ListenBrainzListens from "$lib/components/ListenBrainzListens.svelte";

  const listenBrainz = $derived(settings.listenBrainz);
  onNavigate(defaultNavigation);
</script>

{#if $loggedIn}
  {#if $listenBrainz.user}
    <ListenBrainzListens />
  {/if}
{/if}
