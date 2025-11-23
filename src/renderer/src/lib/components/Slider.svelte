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
    sliderClass = "bg-secondary-700-300",
    scrollAction = false,
    scrollStep = 5,
    orientation = "horizontal",
    handleWheel = handleWheelFunction,
    onValueChanged = (_: number) => {},
  }: {
    defaultValue?: number;
    value?: number;
    buffer?: number;
    max: number;
    min?: number;
    thumb?: boolean;
    class?: string;
    sliderClass?: string;
    scrollAction?: boolean;
    scrollStep?: number;
    orientation?: "vertical" | "horizontal";
    handleWheel?: (event: WheelEvent) => void;
    onValueChanged?: (value: number) => void;
  } = $props();

  function handleValueChange(details: { value: number[] }) {
    onValueChanged(details.value[0]);
    value = details.value[0];
  }

  function handleWheelFunction(event: WheelEvent) {
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
    {orientation}
    {max}
    {min}
    step={0.1}
    class={cn({
      "w-full": orientation === "horizontal",
      "h-full": orientation === "vertical",
    })}
  >
    <Slider.Control class="h-full w-full">
      <Slider.Track
        class={cn("cursor-pointer", {
          "h-1.5 w-full": orientation === "horizontal",
          "h-full w-1.5": orientation === "vertical",
        })}
      >
        <Slider.Range
          class={cn("bg-surface-300-700", {
            block: buffer !== undefined,
            hidden: buffer === undefined,
          })}
          style="{orientation === 'horizontal' ? 'width' : 'height'}: {buffer}%"
        />
        <Slider.Range
          class={cn(sliderClass, {
            "h-full": orientation === "horizontal",
            "w-full": orientation === "vertical",
          })}
        />
      </Slider.Track>
      {#if thumb}
        <Slider.Thumb index={0} class="size-2.5 cursor-pointer ring-2">
          <Slider.HiddenInput />
        </Slider.Thumb>
      {/if}
    </Slider.Control>
  </Slider>
</div>
