import { defineConfig } from "electron-vite";

export default defineConfig(async () => ({
  main: {
    build: {
      externalizeDeps: true,
      rollupOptions: {
        external: ["electron-vibrancy"],
      },
      assets: ["./node_modules/electron-vibrancy/build/Release"],
    },
  },
  preload: {
    build: {
      externalizeDeps: true,
    },
  },
}));
