/// <reference types="vite/client" />

/**
 * Vite dev-time environment variables (import.meta.env).
 * These are only used as fallbacks when running `npm run dev` locally.
 * In production (Docker), all config is injected at runtime via window.__APP_CONFIG__
 * — see src/lib/config.ts and docker/entrypoint.sh.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SIGNALR_URL?: string;
  readonly VITE_OIDC_AUTHORITY?: string;
  readonly VITE_OIDC_CLIENT_ID?: string;
  readonly VITE_OIDC_REDIRECT_URI?: string;
  readonly VITE_OIDC_POST_LOGOUT_REDIRECT_URI?: string;
  readonly VITE_OIDC_SCOPE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
