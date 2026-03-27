import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Puzzle, Plus } from 'lucide-react';

const PluginsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Plugins</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and manage integrations for your workflows.
          </p>
        </div>
        <Button variant="outline" className="gap-2 transition-all duration-200 active:scale-[0.98]">
          <Plus className="size-4" />
          Browse Registry
        </Button>
      </div>

      <Card className="bg-card border-border border-dashed shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="size-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <Puzzle className="size-8 text-violet-500" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold text-foreground">No plugins installed</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Connect your tools and services by installing plugins from the registry.
            </p>
          </div>
          <Button className="gap-2 mt-2 transition-all duration-200 active:scale-[0.98]">
            <Plus className="size-4" />
            Browse plugins
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PluginsPage;
