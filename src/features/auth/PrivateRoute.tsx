import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { Bot, Sparkles } from 'lucide-react';

interface PrivateRouteProps {
  children: React.ReactNode;
}

/**
 * Protects routes using Keycloak OIDC.
 * 
 * - While OIDC is initializing → shows loading screen
 * - If not authenticated → triggers Keycloak login redirect
 * - If authenticated → renders children
 */
export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const auth = useAuth();
  const location = useLocation();

  // While OIDC is loading initial state
  if (auth.isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="relative flex flex-col items-center justify-center">
          {/* Background radial glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 aspect-square bg-primary/20 rounded-full blur-[50px] animate-pulse" />
          
          {/* Bot Animation */}
          <div className="relative flex items-center justify-center w-32 h-32 mb-2">
            <div className="absolute bottom-2 w-14 h-2 bg-foreground/10 rounded-[50%] blur-[2px] animate-[pulse_1s_ease-in-out_infinite]" />
            <div className="relative animate-[bounce_1s_infinite]">
              <div className="bg-card p-4 rounded-3xl border border-border shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.3)] backdrop-blur-sm relative">
                <Sparkles className="absolute -top-3 -right-2 size-5 text-amber-500 animate-[spin_3s_linear_infinite]" />
                <Sparkles className="absolute -bottom-2 -left-2 size-4 text-emerald-500 animate-[ping_2s_infinite]" />
                <Bot className="size-12 text-primary drop-shadow-md" strokeWidth={1.5} />
                <div className="absolute top-[2.4rem] left-5 size-2 bg-rose-400/80 rounded-full blur-[2px]" />
                <div className="absolute top-[2.4rem] right-5 size-2 bg-rose-400/80 rounded-full blur-[2px]" />
              </div>
            </div>
          </div>

          {/* Loading Text */}
          <div className="flex flex-col items-center gap-1.5 z-10">
            <h3 className="text-lg font-extrabold text-foreground tracking-tight flex items-end gap-1.5">
              Authenticating
              <span className="flex gap-1 mb-1.5">
                <span className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="size-1.5 bg-primary rounded-full animate-bounce"></span>
              </span>
            </h3>
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              Connecting to Keycloak...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If OIDC error occurred
  if (auth.error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-8">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">Authentication Error</h2>
          <p className="text-sm text-muted-foreground">
            {auth.error.message || 'An unexpected error occurred during authentication.'}
          </p>
          <button
            onClick={() => auth.signinRedirect()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to Keycloak login
  if (!auth.isAuthenticated) {
    // Automatically redirect to Keycloak login page
    auth.signinRedirect({ state: { returnTo: location.pathname + location.search } });
    
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
