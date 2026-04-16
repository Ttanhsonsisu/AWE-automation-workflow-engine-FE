import React from 'react';
import { useAuth } from 'react-oidc-context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Zap, Shield, Loader2, LogIn } from 'lucide-react';

/**
 * LoginPage — Now acts as a "landing" page that triggers Keycloak SSO login.
 * 
 * Since we use Keycloak for authentication, the actual login form is hosted by Keycloak.
 * This page shows the app branding and a button to initiate the OIDC login flow.
 */
const LoginPage: React.FC = () => {
  const auth = useAuth();

  const handleKeycloakLogin = () => {
    auth.signinRedirect();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
            <Zap className="size-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">AutoFlow</h1>
            <p className="text-sm text-muted-foreground mt-1">Workflow Automation Platform</p>
          </div>
        </div>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>
              Sign in with your organization account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={handleKeycloakLogin}
              disabled={auth.isLoading}
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-[0.98] h-11"
            >
              {auth.isLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <LogIn className="size-4 mr-2" />
                  Sign in with Keycloak SSO
                </>
              )}
            </Button>

            {/* Security badge */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <Shield className="size-3.5 text-emerald-500" />
              <span className="text-xs text-muted-foreground">
                Secured by Keycloak OpenID Connect
              </span>
            </div>

            {/* Error display */}
            {auth.error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-medium">Authentication failed</p>
                <p className="text-xs mt-1 opacity-80">{auth.error.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
