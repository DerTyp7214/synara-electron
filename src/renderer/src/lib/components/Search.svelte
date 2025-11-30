<script lang="ts">
  import { t } from "$lib/i18n/i18n";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";

  let query: string = "";

  let inputField: HTMLInputElement | null = null;

  async function handleSubmit(event: Event) {
    event.preventDefault();

    // eslint-disable-next-line svelte/no-navigation-without-resolve
    await goto(`${resolve("/search")}?query=${encodeURIComponent(query)}`);
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
      class="input border-secondary-950-50 focus-within:border-secondary-800-200 bg-surface-50-950/50 !m-0 border-2 ring-0 transition-colors"
      type="text"
      placeholder={$t("search.placeholder")}
    />
  </label>
</form>
