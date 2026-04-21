import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: User) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Auth store powered by Keycloak OIDC.
 * 
 * Tokens are managed by `oidc-client-ts` (stored in sessionStorage).
 * This store holds UI-relevant auth state synced from the OIDC context.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading — OIDC will resolve the state

  setUser: (user) => set({ user }),

  setToken: (token) => {
    set({ token, isAuthenticated: !!token });
  },

  login: (user, token) => {
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
