import React from 'react';
import { AuthProvider } from 'react-oidc-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { oidcConfig } from '@/lib/oidc-config';
import { AuthSync } from '@/features/auth/AuthSync';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Callback invoked by react-oidc-context after the OIDC signin redirect completes.
 * Removes the ?code=...&state=... params from the URL so the browser stays clean.
 */
const onSigninCallback = () => {
  // Replace the URL to remove OIDC callback query params
  window.history.replaceState({}, document.title, window.location.pathname);
};

const App: React.FC = () => {
  return (
    <AuthProvider {...oidcConfig} onSigninCallback={onSigninCallback}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          <AuthSync>
            <RouterProvider router={router} />
          </AuthSync>
          <Toaster position="bottom-right" expand={true} richColors />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
