import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollText } from 'lucide-react';

const AuditLogPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track all system activities and changes.
        </p>
      </div>

      <Card className="bg-card border-border border-dashed shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="size-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <ScrollText className="size-8 text-amber-500" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold text-foreground">No audit logs</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              System activities and user actions will be recorded here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogPage;
