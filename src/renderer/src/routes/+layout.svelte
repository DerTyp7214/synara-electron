<script lang="ts">
  import "$src/app.css";
  import { checkLogin, loggedIn } from "$lib/api/auth";
  import { t } from "$lib/i18n/i18n";
  import AppShell from "$routes/AppShell.svelte";
  import { apiBaseStore } from "$lib/api/utils";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { health } from "$lib/api/main.js";

  const { children } = $props();

  let validApiBase = $state(false);

  async function checkApiUrl(host?: string | null) {
    if ((await health(host)).available) {
      validApiBase = true;
      await checkLogin();
    } else {
      validApiBase = false;
      await goto(resolve("/setup"));
    }
  }

  $effect(() => {
    checkApiUrl($apiBaseStore);
  });
</script>

<svelte:head>
  <title>{$t("title")}</title>
</svelte:head>

<main
  class="bg-surface-50-950/40 h-screen min-h-screen w-screen transition-colors"
>
  {#if $loggedIn && validApiBase}
    <AppShell>
      {@render children()}
    </AppShell>
  {:else}
    {@render children()}
  {/if}
</main>
