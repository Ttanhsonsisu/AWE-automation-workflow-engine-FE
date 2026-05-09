import { WebStorageStateStore, type UserManagerSettings } from 'oidc-client-ts';
import { appConfig } from './config';

/**
 * Keycloak OIDC Configuration
 *
 * This configuration connects the frontend to the Keycloak server for authentication.
 * It uses the Authorization Code Flow with PKCE (recommended for SPAs).
 *
 * All values are read from `appConfig` which resolves at runtime from
 * window.__APP_CONFIG__ (injected by Docker entrypoint) with a fallback
 * to Vite env vars for local development.
 */
export const oidcConfig: UserManagerSettings = {
  // Keycloak Realm URL
  authority: appConfig.oidc.authority,

  // Client ID registered in Keycloak Console
  client_id: appConfig.oidc.clientId,

  // URL Keycloak redirects to after successful login
  redirect_uri: appConfig.oidc.redirectUri,

  // URL Keycloak redirects to after logout
  post_logout_redirect_uri: appConfig.oidc.postLogoutRedirectUri,

  // Scopes to request from Keycloak
  scope: appConfig.oidc.scope,

  // Use Authorization Code + PKCE flow (most secure for SPAs)
  response_type: 'code',

  // Store tokens in sessionStorage (more secure than localStorage for SPAs)
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),

  // Automatically renew access tokens via silent refresh
  automaticSilentRenew: true,

  // Load user info from the /userinfo endpoint
  loadUserInfo: true,

  // Remove the code/state from URL after the OIDC callback completes
  // This keeps the URL clean after login redirect
};
