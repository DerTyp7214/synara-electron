<script lang="ts">
  import { t } from "$lib/i18n/i18n";
  import cn from "classnames";
  import { ArrowRight } from "@jis3r/icons";
  import Logo from "$lib/components/Logo.svelte";
  import LightSwitch from "$lib/components/LightSwitch.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { login } from "$lib/api/auth";
  import { goto, onNavigate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { defaultNavigation, isMac } from "$lib/utils/utils";

  let username = $state("");
  let password = $state("");

  let errorMessage = $state("");

  let loading = $state<boolean>(false);

  async function handleSubmit(event: Event) {
    event.preventDefault();

    loading = true;

    const response = await login(username, password);

    if (!response.isOk()) errorMessage = await response.getRawText();

    loading = false;

    if (response.isOk()) await goto(resolve("/"), { replaceState: true });
  }

  onNavigate(defaultNavigation);
</script>

<svelte:head>
  <title>{$t("login.title")}</title>
</svelte:head>

<main class="draggable flex h-full w-full items-center justify-center">
  <div
    class={cn(
      "interactive absolute",
      "left-2 opacity-0",
      "transition-opacity hover:opacity-100",
      {
        "top-2": !isMac(),
        "top-16": isMac(),
      },
    )}
  >
    <LightSwitch />
  </div>

  <div
    class={cn(
      "bg-surface-200-800/60",
      "m-auto transition-all",
      "interactive w-xs",
      "rounded-container",
      "px-5 py-10",
      "shadow-md",
      "flex flex-col gap-2",
      "items-center justify-center ",
    )}
  >
    <Logo />

    <form class="mt-12 flex w-full flex-col gap-3" onsubmit={handleSubmit}>
      <label class="label">
        <input
          bind:value={username}
          disabled={loading}
          oninput={() => (errorMessage = "")}
          class="input ring-surface-500 m-0!"
          type="text"
          placeholder={$t("login.username.placeholder")}
        />
      </label>

      <label class="label">
        <input
          bind:value={password}
          disabled={loading}
          oninput={() => (errorMessage = "")}
          class="input ring-surface-500 m-0!"
          type="password"
          placeholder={$t("login.password.placeholder")}
        />
      </label>

      {#if errorMessage}
        <span class="text-error-800-200 w-full text-center">{errorMessage}</span
        >
      {/if}

      <button
        type="submit"
        class={cn("btn preset-filled flex w-full", { "mt-5": !errorMessage })}
        disabled={loading || username.length === 0 || password.length === 0}
      >
        {#if loading}
          <Spinner size={18} />
        {:else}
          <ArrowRight size={18} />
        {/if}
        <span class="">{$t("login.submit")}</span>
      </button>
    </form>
  </div>
</main>
