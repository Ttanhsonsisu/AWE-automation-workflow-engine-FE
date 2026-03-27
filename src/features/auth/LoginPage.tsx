import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap } from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleDemoLogin = () => {
    login(
      {
        id: 'demo-user-1',
        name: 'Admin User',
        email: 'admin@autoflow.dev',
        roles: ['admin'],
      },
      'demo-jwt-token-placeholder'
    );
    navigate('/dashboard');
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
            <CardTitle className="text-lg">Sign in to your account</CardTitle>
            <CardDescription>
              Enter your credentials or use SSO to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="admin@autoflow.dev"
                className="transition-all duration-200"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="transition-all duration-200"
              />
            </div>
            <Button
              onClick={handleDemoLogin}
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-[0.98]"
            >
              Sign in (Demo)
            </Button>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full transition-all duration-200 active:scale-[0.98]"
              disabled
            >
              🔑 Keycloak SSO (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
