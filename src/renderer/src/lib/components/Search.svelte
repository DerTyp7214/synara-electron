<script lang="ts">
  import { t } from "$lib/i18n/i18n";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";

  const {
    onSubmit,
  }: {
    onSubmit?: (query: string) => void;
  } = $props();

  let query: string = $state("");

  let inputField: HTMLInputElement | null = null;

  async function handleSubmit(event: Event) {
    event.preventDefault();

    if (onSubmit) onSubmit(query);
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    else await goto(`${resolve("/search")}?query=${encodeURIComponent(query)}`);
  }

  function focusInput() {
    inputField?.focus();
  }

  onMount(() => {
    return window.listenCustomEvent("focusSearch", focusInput);
  });
</script>

<form class="flex w-full max-w-xl flex-col gap-3" onsubmit={handleSubmit}>
  <label class="label">
    <input
      bind:this={inputField}
      bind:value={query}
      class="custom-input"
      type="text"
      placeholder={$t("search.placeholder")}
    />
  </label>
</form>
