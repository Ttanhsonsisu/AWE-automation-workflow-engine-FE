import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Compass, LayoutDashboard, ArrowLeft } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
      <div className="relative flex flex-col items-center max-w-lg text-center">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 aspect-square bg-primary/10 rounded-full blur-[80px] pointer-events-none -z-10" />

        {/* Floating Icon Container */}
        <div className="relative size-24 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 rounded-[2rem] scale-110 shadow-inner rotate-3 transition-transform" />
          <div className="relative flex items-center justify-center size-full bg-card border border-border shadow-xl rounded-[2rem] z-10 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
            <Compass className="size-10 text-primary animate-[spin_10s_linear_infinite]" />
          </div>
        </div>

        {/* Text Area */}
        <h1 className="text-6xl font-black text-foreground tracking-tighter mb-4 drop-shadow-sm">404</h1>
        <h2 className="text-2xl font-bold text-foreground mb-3">Lost in the workflows?</h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-8 max-w-md">
          The page you are looking for doesn't exist, has been moved, or you don't have permission to view it.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => navigate(-1)}
            className="rounded-xl h-12 px-6 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Go Back
          </Button>
          <Button 
            size="lg" 
            onClick={() => navigate('/dashboard')}
            className="rounded-xl h-12 px-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_hsl(var(--primary)/0.3)] transition-all hover:scale-105 active:scale-95"
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
