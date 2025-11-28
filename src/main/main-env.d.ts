interface ImportMetaEnv {
  readonly MAIN_VITE_ELECTRON_RENDERER_URL: string
  readonly MAIN_VITE_LAST_FM_API_KEY: string
  readonly MAIN_VITE_LAST_FM_SHARED_SECRET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv & Readonly<Record<string, unknown>>;
}
