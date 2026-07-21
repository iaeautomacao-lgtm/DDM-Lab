/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // Public flag (not a secret): "false" hides Gemini-only features.
  readonly VITE_GEMINI_ENABLED?: string;
  // Optional override for the proxy origin when the app and API use different hosts.
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
