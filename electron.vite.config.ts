import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig(async () => ({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ["electron-vibrancy"],
      },
      assets: ["./node_modules/electron-vibrancy/build/Release"],
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
}));
