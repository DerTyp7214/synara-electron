<script lang="ts">
  import coverBackground from "./cover-art-on-floor.png";

  let svgElement: SVGSVGElement;

  const {
    class: clazz = "",
    style = "",
    background = coverBackground,
    coverUrls,
  }: {
    class?: string;
    style?: string;
    background?: string;
    coverUrls: [string, string, string, string, string];
  } = $props();

  const [coverUrl1, coverUrl2, coverUrl3, coverUrl4, coverUrl5] =
    $derived(coverUrls);

  export function getSvgUrl(): string | null {
    if (!svgElement) return null;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);

    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });

    return URL.createObjectURL(blob);
  }
</script>

<svg
  bind:this={svgElement}
  {style}
  class={clazz}
  height="750"
  width="750"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  viewBox="0 0 750 750"
>
  <rect width="750" height="750" fill="black" />

  <image
    x="89"
    y="318"
    width="195"
    height="195"
    preserveAspectRatio="xMidYMid slice"
    href={coverUrl1}
    transform="rotate(6.1)"
  >
  </image>

  <image
    x="17"
    y="223"
    width="193"
    height="185"
    preserveAspectRatio="xMidYMid slice"
    href={coverUrl2}
    transform="rotate(-22.4)"
  >
  </image>

  <image
    x="184"
    y="240"
    width="194"
    height="189"
    preserveAspectRatio="xMidYMid slice"
    href={coverUrl3}
    transform="rotate(-4)"
  >
  </image>

  <image
    x="404"
    y="480"
    width="198"
    height="198"
    preserveAspectRatio="xMidYMid slice"
    href={coverUrl4}
    transform="rotate(-11.9)"
  >
  </image>

  <image
    x="385"
    y="488"
    width="202"
    height="203"
    preserveAspectRatio="xMidYMid slice"
    href={coverUrl5}
    transform="rotate(2.2)"
  >
  </image>

  <image x="0" y="0" width="750" height="750" href={background}></image>
</svg>
