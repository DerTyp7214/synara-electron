<script lang="ts">
  import cn from "classnames";
  import { sleep } from "$lib/utils/utils";

  const {
    src,
    poster,
    style = "",
    class: clazz = "",
    blendTime = 500,
    animated = false,
  }: {
    src: string;
    poster?: string;
    style?: string;
    class?: string;
    blendTime?: number;
    animated?: boolean;
  } = $props();

  let currentSrc = $state<string | undefined>();
  // svelte-ignore state_referenced_locally
  let oldSrc = $state<string | undefined>(src);

  let currentPoster = $state<string | undefined>();
  // svelte-ignore state_referenced_locally
  let oldPoster = $state<string | undefined>(src);

  let isVisible = $state(false);

  function loadImage(url: string) {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(url);
      img.onerror = (err) => reject(err);
    });
  }

  async function switchImage(url: string, poster?: string) {
    if (!animated) {
      oldSrc = currentPoster;
      oldPoster = currentPoster;

      const newSrc = await loadImage(url).catch(() => null);
      if (newSrc == null) return;
      isVisible = false;

      await sleep(1);

      currentSrc = newSrc;
      currentPoster = newSrc;
    } else {
      if (!poster) return;
      const newPoster = await loadImage(poster).catch(() => null);
      if (newPoster == null) return;
      isVisible = false;

      await sleep(1);

      currentPoster = newPoster;
      currentSrc = url;
    }
    isVisible = true;
  }

  $effect(() => {
    if (src !== currentSrc) void switchImage(src, poster);
  });
</script>

<div {style} class={clazz}>
  <div class="relative h-full w-full">
    <svelte:element
      this={animated ? "video" : "img"}
      poster={oldPoster}
      autoplay
      loop
      src={oldSrc}
      alt="image"
      class="absolute inset-0 h-full w-full object-cover object-center"
    ></svelte:element>
    <svelte:element
      this={animated ? "video" : "img"}
      poster={currentPoster}
      autoplay
      loop
      src={currentSrc}
      alt="image"
      style="--tw-duration: {blendTime}ms;"
      class={cn("absolute inset-0 h-full w-full object-cover object-center", {
        "transition-opacity": isVisible,
        "opacity-100": isVisible,
        "opacity-0": !isVisible,
      })}
    ></svelte:element>
  </div>
</div>
