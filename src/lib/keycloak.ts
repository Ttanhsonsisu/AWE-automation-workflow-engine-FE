import { UserManager, type User } from 'oidc-client-ts';
import { oidcConfig } from './oidc-config';

/**
 * Singleton UserManager instance for direct OIDC operations.
 * 
 * Most components should use the `useAuth()` hook from `react-oidc-context` instead.
 * This singleton is mainly useful for:
 * - Axios interceptor (needs access outside of React component tree)
 * - SignalR token access
 * - Programmatic login/logout from non-React code
 */
export const userManager = new UserManager(oidcConfig);

/**
 * Get the current access token for API requests.
 * Returns null if the user is not authenticated.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const user: User | null = await userManager.getUser();
    if (user && !user.expired) {
      return user.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the current user from session.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    return await userManager.getUser();
  } catch {
    return null;
  }
}

/**
 * Extract custom user info from the OIDC token.
 * Maps Keycloak token claims to the app's User interface.
 */
export function extractUserInfo(user: User) {
  const profile = user.profile;
  
  // Keycloak stores realm roles under realm_access.roles
  // and client roles under resource_access.<client_id>.roles
  const realmRoles = (profile as any)?.realm_access?.roles || [];
  const clientRoles = (profile as any)?.resource_access?.['awe-fe']?.roles || [];
  const allRoles = [...new Set([...realmRoles, ...clientRoles])];

  return {
    id: profile.sub,
    name: profile.name || profile.preferred_username || 'Unknown User',
    email: profile.email || '',
    avatar: (profile as any)?.picture,
    roles: allRoles,
  };
}
