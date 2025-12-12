import { readable } from "svelte/store";

const getWindowDimensions = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

export const windowDimensions = readable(getWindowDimensions(), (set) => {
  function handleResize() {
    set(getWindowDimensions());
  }

  window.addEventListener("resize", handleResize);

  return () => {
    window.removeEventListener("resize", handleResize);
  };
});
