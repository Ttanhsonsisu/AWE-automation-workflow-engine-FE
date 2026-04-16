import { WebStorageStateStore, type UserManagerSettings } from 'oidc-client-ts';

/**
 * Keycloak OIDC Configuration
 * 
 * This configuration connects the frontend to the Keycloak server for authentication.
 * It uses the Authorization Code Flow with PKCE (recommended for SPAs).
 */
export const oidcConfig: UserManagerSettings = {
  // Keycloak Realm URL
  authority: "http://localhost:8081/realms/awe-auth",

  // Client ID registered in Keycloak Console
  client_id: "awe-fe",

  // URL Keycloak redirects to after successful login
  redirect_uri: "http://localhost:5173/",

  // URL Keycloak redirects to after logout
  post_logout_redirect_uri: "http://localhost:5173/",

  // Scopes to request from Keycloak
  scope: "openid profile email roles",

  // Use Authorization Code + PKCE flow (most secure for SPAs)
  response_type: "code",

  // Store tokens in sessionStorage (more secure than localStorage for SPAs)
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),

  // Automatically renew access tokens via silent refresh
  automaticSilentRenew: true,

  // Load user info from the /userinfo endpoint
  loadUserInfo: true,

  // Remove the code/state from URL after the OIDC callback completes
  // This keeps the URL clean after login redirect
};
