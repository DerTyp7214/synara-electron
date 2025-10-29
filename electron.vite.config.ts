import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig(async () => ({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
}));
