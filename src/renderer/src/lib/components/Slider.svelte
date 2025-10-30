<script lang="ts">
  import { Slider } from "@skeletonlabs/skeleton-svelte";
  import cn from "classnames";

  let {
    defaultValue = 0,
    value = $bindable(0),
    buffer = 0,
    max,
    thumb = true,
    class: clazz = "",
    onValueChanged = (_: number) => {},
  }: {
    defaultValue?: number;
    value?: number;
    buffer?: number;
    max: number;
    thumb?: boolean;
    class?: string;
    onValueChanged?: (value: number) => void;
  } = $props();

  function handleValueChange(details: { value: number[] }) {
    onValueChanged(details.value[0]);
    value = details.value[0];
  }
</script>

<Slider
  defaultValue={[defaultValue]}
  value={[value]}
  onValueChange={handleValueChange}
  min={0}
  {max}
  step={0.1}
  class={cn("relative", clazz)}
>
  <Slider.Control>
    <Slider.Track class="h-1.5 cursor-pointer">
      <Slider.Range class="bg-surface-300-700" style="width: {buffer}%" />
      <Slider.Range class="bg-secondary-700-300" />
    </Slider.Track>
    {#if thumb}
      <Slider.Thumb index={0} class="size-2.5 cursor-pointer ring-2">
        <Slider.HiddenInput />
      </Slider.Thumb>
    {/if}
  </Slider.Control>
</Slider>
