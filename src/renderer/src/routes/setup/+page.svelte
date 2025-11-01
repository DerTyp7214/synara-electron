<!--suppress HttpUrlsUsage -->
<script lang="ts">
  import { t } from "$lib/i18n/i18n";
  import cn from "classnames";
  import { ArrowRight } from "@jis3r/icons";
  import Logo from "$lib/components/Logo.svelte";
  import LightSwitch from "$lib/components/LightSwitch.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import type { Service } from "bonjour-service";
  import { health } from "$lib/api/main";
  import { apiBaseStore } from "$lib/api/utils";

  let apiAddress: string = $state($apiBaseStore ?? "");
  let errorMessage = $state("");

  let loading = $state<boolean>(false);

  let services: Array<Service> = $state([]);

  async function handleSubmit(event: Event) {
    event.preventDefault();

    loading = true;

    const response = await health(apiAddress);

    if (response.available) {
      apiBaseStore.set(apiAddress);
      await goto(resolve("/"), { replaceState: true });
    } else errorMessage = "Address is invalid or server not reachable.";

    loading = false;
  }

  onMount(() => {
    const unsubscriber = window.api?.registerBonjourListener((service) => {
      services = [...services, service];
    });

    if (apiAddress.length > 0) handleSubmit(new CustomEvent(""));

    return () => unsubscriber?.();
  });
</script>

<svelte:head>
  <title>{$t("setup.title")}</title>
</svelte:head>

<main class="draggable flex h-full w-full items-center justify-center">
  <div
    class="interactive absolute top-2 left-2 opacity-0 transition-opacity hover:opacity-100"
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

    <div class="flex w-full flex-col gap-2">
      {#if services.length > 0}
        <span class="h5 mt-2">Servers</span>
      {/if}
      {#each services as service, i (i)}
        <button
          class={cn(
            "rounded-base flex flex-col",
            "px-3 py-2 text-start",
            "hover:bg-secondary-800-200/30",
            "transition-colors",
            {
              "bg-tertiary-800-200/30":
                apiAddress === `${service.addresses}:${service.port}`,
              "bg-surface-800-200/20":
                apiAddress !== `${service.addresses}:${service.port}`,
            },
          )}
          onclick={() => {
            errorMessage = "";
            apiAddress = `${service.addresses}:${service.port}`;
          }}
        >
          <span>{service.name}</span>
          <span class="text-xs opacity-30"
            >{service.addresses}:{service.port}</span
          >
        </button>
      {/each}
    </div>

    <form class="mt-8 flex w-full flex-col gap-3" onsubmit={handleSubmit}>
      <label class="label">
        <input
          bind:value={apiAddress}
          disabled={loading}
          oninput={() => (errorMessage = "")}
          class="input ring-surface-500 !m-0"
          type="text"
          placeholder={$t("setup.apiAddress.placeholder")}
        />
      </label>

      {#if errorMessage}
        <span class="text-error-800-200 w-full text-center">{errorMessage}</span
        >
      {/if}

      <button
        type="submit"
        class={cn("btn preset-filled flex w-full", { "mt-5": !errorMessage })}
        disabled={loading || apiAddress.length === 0}
      >
        {#if loading}
          <Spinner size={18} />
        {:else}
          <ArrowRight size={18} />
        {/if}
        <span class="">{$t("setup.submit")}</span>
      </button>
    </form>
  </div>
</main>
