<script lang="ts">
  import { loggedIn } from "$lib/api/auth";
  import { onNavigate } from "$app/navigation";
  import { defaultNavigation } from "$lib/utils/utils";

  onNavigate(defaultNavigation);
</script>

{#if $loggedIn}
  Yo
{/if}
