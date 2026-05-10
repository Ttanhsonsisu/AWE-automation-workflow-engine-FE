/**
 * Runtime App Configuration
 *
 * Reads config from `window.__APP_CONFIG__` which is injected by the
 * container entrypoint script at startup (via envsubst into config.js).
 *
 * This approach allows a single Docker image to run in any environment
 * without rebuilding — just change the environment variables in Docker Compose.
 *
 * During local development (without a container), it falls back to
 * `import.meta.env` so `npm run dev` still works normally.
 */

// Extend the Window interface for TypeScript type safety
declare global {
  interface Window {
    __APP_CONFIG__?: {
      API_URL?: string;
      SIGNALR_URL?: string;
      OIDC_AUTHORITY?: string;
      OIDC_CLIENT_ID?: string;
      OIDC_REDIRECT_URI?: string;
      OIDC_POST_LOGOUT_REDIRECT_URI?: string;
      OIDC_SCOPE?: string;
    };
  }
}

/**
 * Reads a config value — runtime (window.__APP_CONFIG__) first, then
 * Vite env (import.meta.env) as dev fallback, then a hard default.
 */
function getConfig(
  runtimeKey: keyof NonNullable<Window['__APP_CONFIG__']>,
  viteKey: string,
  defaultValue: string = ''
): string {
  return (
    window.__APP_CONFIG__?.[runtimeKey] ||
    (import.meta.env[viteKey] as string | undefined) ||
    defaultValue
  );
}

/**
 * Ensures the given URL is absolute by combining it with the current window origin.
 */
function getAbsoluteUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

export const appConfig = {
  /** Base URL for the backend REST API */
  apiUrl: getAbsoluteUrl(getConfig('API_URL', 'VITE_API_URL', 'http://localhost:5000/api')),

  /** SignalR hub URL */
  signalrUrl: getAbsoluteUrl(getConfig('SIGNALR_URL', 'VITE_SIGNALR_URL', 'https://localhost:7049/hubs/workflow')),

  oidc: {
    authority: getConfig('OIDC_AUTHORITY', 'VITE_OIDC_AUTHORITY', 'http://localhost:8081/realms/awe-auth'),
    clientId: getConfig('OIDC_CLIENT_ID', 'VITE_OIDC_CLIENT_ID', 'awe-fe'),
    redirectUri: getConfig('OIDC_REDIRECT_URI', 'VITE_OIDC_REDIRECT_URI', window.location.origin),
    postLogoutRedirectUri: getConfig('OIDC_POST_LOGOUT_REDIRECT_URI', 'VITE_OIDC_POST_LOGOUT_REDIRECT_URI', window.location.origin),
    scope: getConfig('OIDC_SCOPE', 'VITE_OIDC_SCOPE', 'openid profile email roles'),
  },
} as const;
