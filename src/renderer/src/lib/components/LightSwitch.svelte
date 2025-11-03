<script lang="ts">
  import { Switch } from "@skeletonlabs/skeleton-svelte";
  import { settings } from "$lib/settings";

  const theme = $derived(settings.theme);
  let checked = $derived($theme === "dark");

  const onCheckedChange = (event: { checked: boolean }) => {
    const mode = event.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-mode", mode);
    theme.set(mode);
  };

  const { class: clazz = "" } = $props();
</script>

<Switch {checked} {onCheckedChange} class={clazz}>
  <Switch.Control class="data-[state=checked]:preset-filled-secondary-500">
    <Switch.Thumb />
  </Switch.Control>
  <Switch.HiddenInput />
</Switch>
