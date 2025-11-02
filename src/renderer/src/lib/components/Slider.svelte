<script lang="ts">
  import { Slider } from "@skeletonlabs/skeleton-svelte";
  import cn from "classnames";

  let {
    defaultValue = 0,
    value = $bindable(0),
    buffer = 0,
    max,
    min = 0,
    thumb = true,
    class: clazz = "",
    scrollAction = false,
    scrollStep = 5,
    onValueChanged = (_: number) => {},
  }: {
    defaultValue?: number;
    value?: number;
    buffer?: number;
    max: number;
    min?: number;
    thumb?: boolean;
    class?: string;
    scrollAction?: boolean;
    scrollStep?: number;
    onValueChanged?: (value: number) => void;
  } = $props();

  function handleValueChange(details: { value: number[] }) {
    onValueChanged(details.value[0]);
    value = details.value[0];
  }

  function handleWheel(event: WheelEvent) {
    if (!scrollAction) return;

    event.preventDefault();

    const direction = event.deltaY < 0 ? 1 : -1;

    let newValue = value + direction * scrollStep;

    if (newValue > max) value = max;
    else if (newValue < (min ?? 0)) value = min ?? 0;
    else value = newValue;

    onValueChanged(value);
  }
</script>

<div class={cn("relative", clazz)} onwheel={handleWheel}>
  <Slider
    defaultValue={[defaultValue]}
    value={[value]}
    onValueChange={handleValueChange}
    {max}
    {min}
    step={0.1}
    class="relative w-full"
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
</div>
