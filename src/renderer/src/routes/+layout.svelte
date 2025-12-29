<script lang="ts">
  import "$src/app.css";
  import { checkLogin, loggedIn } from "$lib/api/auth";
  import { t } from "$lib/i18n/i18n";
  import AppShell from "$routes/AppShell.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { health } from "$lib/api/main.js";
  import { settings, settingsService } from "$lib/utils/settings";
  import Spinner from "$lib/components/Spinner.svelte";
  import ContextMenuManager from "$lib/contextMenu/ContextMenuManager.svelte";
  import { isLinux, isMac, isWindows } from "$lib/utils/utils";
  import cn from "classnames";
  import { createToaster, Toast } from "@skeletonlabs/skeleton-svelte";
  import { setContext } from "svelte";
  import { TOAST_CONTEXT_KEY } from "$lib/consts";
  import { writable } from "svelte/store";
  import musicScrobbler from "$lib/audio/musicScrobbler";
  import { mediaSession } from "$lib/audio/mediaSession";
  import AddToPlaylistDialog from "$lib/addToPlaylist/AddToPlaylistDialog.svelte";

  const { children } = $props();

  let validApiBase = $state(false);

  const mediaPlayerOpen = writable(false);

  const toaster = createToaster({
    placement: "bottom-end",
  });

  setContext(TOAST_CONTEXT_KEY, toaster);

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
  const appTheme = $derived(settings.theme);

  $effect(() => {
    if (!$settingsLoaded) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    $token;
    checkApiUrl($apiBase);
    musicScrobbler.connectMediaSession(mediaSession);
  });

  $effect(() => {
    document.documentElement.setAttribute("data-mode", $appTheme);
  });

  document.documentElement.setAttribute(
    "data-os",
    isMac() ? "mac" : isLinux() ? "linux" : "windows",
  );
</script>

<svelte:head>
  <title>{$t("title")}</title>
</svelte:head>

{#if !$mediaPlayerOpen}
  <ContextMenuManager />
  <AddToPlaylistDialog />
{/if}

<main
  class={cn(
    "flex flex-col",
    "h-screen min-h-screen w-screen",
    "transition-colors",
    "mac:bg-secondary-50/80",
    "linux:bg-secondary-50/70",
    "windows:bg-secondary-50/70",
    "mac:dark:bg-secondary-50/50",
    "linux:dark:bg-secondary-50/10",
    "windows:dark:bg-secondary-50/10",
  )}
>
  {#if isWindows()}
    <header class="bg-surface-50-950/60 draggable h-8 w-full"></header>
  {/if}
  {#if !$settingsLoaded}
    <div class="flex h-full w-full items-center justify-center">
      <Spinner size={56} />
    </div>
  {:else if $loggedIn && validApiBase}
    <AppShell {mediaPlayerOpen}>
      {@render children()}
    </AppShell>
  {:else}
    {@render children()}
  {/if}
</main>

<Toast.Group {toaster} class={cn({ "mb-24": $loggedIn && validApiBase })}>
  {#snippet children(toast)}
    <Toast {toast} class="w-max max-w-[50vw] p-2">
      <Toast.Message>
        <Toast.Title>{@html toast.title}</Toast.Title>
        <Toast.Description>{@html toast.description}</Toast.Description>
      </Toast.Message>
      <Toast.CloseTrigger />
    </Toast>
  {/snippet}
</Toast.Group>
