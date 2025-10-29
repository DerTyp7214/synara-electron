<script lang="ts">
  import "$src/app.css";
  import { checkLogin, loggedIn } from "$lib/api/auth";
  import { t } from "$lib/i18n/i18n";
  import AppShell from "$routes/AppShell.svelte";

  const { children } = $props();

  checkLogin();
</script>

<svelte:head>
  <title>{$t("title")}</title>
</svelte:head>

<main
  class="bg-surface-50-950/40 h-screen min-h-screen w-screen transition-colors"
>
  {#if $loggedIn}
    <AppShell>
      {@render children()}
    </AppShell>
  {:else}
    {@render children()}
  {/if}
</main>
