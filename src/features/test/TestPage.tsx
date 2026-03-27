import React from 'react';

const TestPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full p-8 animate-in fade-in zoom-in duration-500">
      <div className="bg-card w-full max-w-3xl rounded-3xl border border-border/50 shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="p-8 border-b border-border/50 bg-muted/20">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">System Test Arena</h1>
          <p className="text-muted-foreground mt-2">
            Use this space to experiment, test new components, or verify API integrations.
          </p>
        </div>
        <div className="p-8 bg-card flex flex-col items-center justify-center min-h-[400px]">
          <div className="size-24 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-6 shadow-inner">
            <span className="text-4xl">🧪</span>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-foreground">Test Environment Ready</h2>
          <p className="text-muted-foreground text-center max-w-md">
            The page is fully hooked up to the router and protected layout. 
            Drop whatever components you need to test in this blank canvas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
