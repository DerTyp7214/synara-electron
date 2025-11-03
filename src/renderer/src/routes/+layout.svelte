<script lang="ts">
  import "$src/app.css";
  import { checkLogin, loggedIn } from "$lib/api/auth";
  import { t } from "$lib/i18n/i18n";
  import AppShell from "$routes/AppShell.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { health } from "$lib/api/main.js";
  import { settings, settingsService } from "$lib/settings";
  import Spinner from "$lib/components/Spinner.svelte";
  import { isWindows } from "$src/lib/utils";

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

  const apiBase = $derived(settings.apiBase);
  const token = $derived(settings.token);
  const settingsLoaded = $derived(settingsService.isLoaded());

  $effect(() => {
    if (!$settingsLoaded) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    $token;
    checkApiUrl($apiBase);
  });
</script>

<svelte:head>
  <title>{$t("title")}</title>
</svelte:head>

<main
  class="bg-surface-50-950/40 flex h-screen min-h-screen w-screen flex-col transition-colors"
>
  {#if isWindows()}
    <header class="bg-surface-50-950/60 draggable h-8 w-full"></header>
  {/if}
  {#if !$settingsLoaded}
    <div class="flex h-full w-full items-center justify-center">
      <Spinner size={56} />
    </div>
  {:else if $loggedIn && validApiBase}
    <AppShell>
      {@render children()}
    </AppShell>
  {:else}
    {@render children()}
  {/if}
</main>
