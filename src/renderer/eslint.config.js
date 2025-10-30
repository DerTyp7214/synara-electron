import { fileURLToPath } from "node:url";
import { includeIgnoreFile } from "@eslint/compat";
import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.js";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url));

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  globalIgnores(["**/*.d.ts"]),
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
      // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
      "no-undef": "off",
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: ts.parser,
        svelteConfig,
      },
    },
  },
  eslintConfigPrettier,
  prettierRecommended,
  {
    rules: {
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^(_|\\$\\$Props)",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "no-async-promise-executor": "warn",
      "no-case-declarations": "warn",
      "no-empty": "warn",
      "no-prototype-builtins": "warn",
      "no-useless-escape": "warn",
      "svelte/infinite-reactive-loop": "warn",
      "svelte/no-at-html-tags": "warn",
      "svelte/no-immutable-reactive-statements": "warn",
      "svelte/no-reactive-reassign": "warn",
      "svelte/require-each-key": "warn",
      "svelte/require-event-dispatcher-types": "warn",
      "no-console": "error",
      "svelte/no-navigation-without-resolve": "warn",
    },
  },
);
