<script lang="ts">
  import { loggedIn } from "$lib/api/auth";
</script>

{#if $loggedIn}
  Yo
{/if}
