import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ServerCrash, RefreshCcw, Home } from 'lucide-react';

const ErrorPage: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = "An unexpected error occurred.";
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-6">
      <div className="relative flex flex-col items-center max-w-lg text-center w-full">
        {/* Glow behind the icon */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-destructive/10 rounded-full blur-[60px] pointer-events-none -z-10" />

        {/* Floating Error Icon */}
        <div className="relative size-24 mb-6">
          <div className="absolute inset-0 bg-destructive/10 border border-destructive/20 rounded-3xl shadow-[0_0_30px_hsl(var(--destructive)/0.2)] rotate-6" />
          <div className="relative flex items-center justify-center size-full bg-card border border-border rounded-3xl z-10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent opacity-50" />
            <ServerCrash className="size-10 text-destructive animate-[pulse_2s_ease-in-out_infinite]" />
          </div>
        </div>

        {/* Error Info */}
        <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-2 flex items-center gap-3 justify-center">
          Oops! <span className="text-destructive opacity-80 font-mono text-3xl">[{errorStatus}]</span>
        </h1>
        <h2 className="text-xl font-bold text-foreground mb-4">Something broke in the engine.</h2>
        
        <div className="bg-card border border-border rounded-xl p-4 w-full mb-8 shadow-sm text-center">
          <p className="font-mono text-sm text-muted-foreground break-words font-medium">
            {errorMessage}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => window.location.reload()}
            className="rounded-xl h-12 w-full sm:w-auto px-6 gap-2 hover:bg-muted"
          >
            <RefreshCcw className="size-4" />
            Try Again
          </Button>
          <Button 
            size="lg" 
            onClick={() => navigate('/dashboard')}
            className="rounded-xl h-12 w-full sm:w-auto px-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.3)] transition-all hover:scale-105 active:scale-95"
          >
            <Home className="size-4" />
            Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
