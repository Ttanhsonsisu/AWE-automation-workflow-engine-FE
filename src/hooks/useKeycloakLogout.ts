import { useCallback } from 'react';
import { useAuth } from 'react-oidc-context';
import { useAuthStore } from '@/stores/authStore';

/**
 * Custom hook for Keycloak logout.
 * 
 * Triggers the OIDC end-session redirect (logs out from Keycloak)
 * and clears the local Zustand auth state.
 */
export function useKeycloakLogout() {
  const auth = useAuth();
  const { logout: clearStore } = useAuthStore();

  const logout = useCallback(async () => {
    // Clear local auth state first
    clearStore();

    // Redirect to Keycloak's end-session endpoint
    try {
      await auth.signoutRedirect();
    } catch (error) {
      console.error('Keycloak logout failed:', error);
      // Fallback: remove OIDC user from session and redirect manually
      await auth.removeUser();
      window.location.href = '/';
    }
  }, [auth, clearStore]);

  return logout;
}
