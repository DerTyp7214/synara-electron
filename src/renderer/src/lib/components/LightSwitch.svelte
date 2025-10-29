<script lang="ts">
  import { Switch } from "@skeletonlabs/skeleton-svelte";

  let checked = $state(false);

  $effect(() => {
    const mode = localStorage.getItem("mode") || "light";
    checked = mode === "dark";
  });

  const onCheckedChange = (event: { checked: boolean }) => {
    const mode = event.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-mode", mode);
    localStorage.setItem("mode", mode);
    checked = event.checked;
  };

  const { class: clazz = "" } = $props();
</script>

<svelte:head>
  <script>
    const mode = localStorage.getItem("mode") || "light";
    document.documentElement.setAttribute("data-mode", mode);
  </script>
</svelte:head>

<Switch {checked} {onCheckedChange} class={clazz}>
  <Switch.Control class="data-[state=checked]:preset-filled-secondary-500">
    <Switch.Thumb />
  </Switch.Control>
  <Switch.HiddenInput />
</Switch>
