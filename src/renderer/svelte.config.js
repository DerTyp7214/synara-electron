import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readFileSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const json = readFileSync(path.join(__dirname, "package.json"), "utf8");
const pkg = JSON.parse(json);

const buildDir = path.join(__dirname, "..", "..", "out", "renderer");

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    version: {
      name: pkg.version,
    },
    adapter: adapter({
      fallback: "index.html",
      pages: buildDir,
      assets: buildDir,
    }),
    alias: {
      $src: "src",
      $routes: "src/routes",
      $shared: "../shared",
    },
  },
};

export default config;
