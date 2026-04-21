import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useAuthStore } from '@/stores/authStore';
import { extractUserInfo } from '@/lib/keycloak';

/**
 * AuthSync - Bridges react-oidc-context ↔ Zustand authStore.
 * 
 * This component syncs the OIDC authentication state into the Zustand store
 * so that the rest of the app can use `useAuthStore()` to check auth status,
 * get the user, and access the token.
 * 
 * Must be rendered inside the <AuthProvider> tree.
 */
export const AuthSync: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const { login, logout, setLoading, setToken } = useAuthStore();

  useEffect(() => {
    if (auth.isLoading) {
      setLoading(true);
      return;
    }

    if (auth.isAuthenticated && auth.user) {
      // Sync user info and token to Zustand store
      const userInfo = extractUserInfo(auth.user);
      login(userInfo, auth.user.access_token);
    } else {
      logout();
      setLoading(false);
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.user]);

  // Keep token in sync when it refreshes silently
  useEffect(() => {
    if (auth.user?.access_token) {
      setToken(auth.user.access_token);
    }
  }, [auth.user?.access_token]);

  return <>{children}</>;
};
