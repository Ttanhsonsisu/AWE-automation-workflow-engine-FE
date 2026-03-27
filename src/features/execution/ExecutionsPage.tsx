import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow, format } from 'date-fns';
import { Clock, CheckCircle2, XCircle, Loader2, Workflow, Filter, ExternalLink } from 'lucide-react';

import type { ExecutionLog } from '@/types';
import { useExecutions } from '@/api/executions';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

const statusIcons = {
  Success: <CheckCircle2 className="size-3 text-emerald-500" />,
  Failed: <XCircle className="size-3 text-destructive" />,
  Running: <Loader2 className="size-3 text-blue-500 animate-spin" />,
  Pending: <Clock className="size-3 text-amber-500" />,
};

const statusStyles = {
  Success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
  Failed: 'border-destructive/20 bg-destructive/10 text-destructive',
  Running: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
  Pending: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
};

const ExecutionsPage: React.FC = () => {
  const { data: executions, isLoading, error } = useExecutions();
  const [selectedExec, setSelectedExec] = useState<ExecutionLog | null>(null);

  const columns: ColumnDef<ExecutionLog>[] = [
    {
      accessorKey: 'id',
      header: 'Execution ID',
      cell: ({ row }) => (
        <span
          className="font-mono text-xs text-primary hover:underline cursor-pointer"
          onClick={() => setSelectedExec(row.original)}
        >
          {row.getValue('id')}
        </span>
      ),
    },
    {
      accessorKey: 'workflowName',
      header: 'Workflow Name',
      cell: ({ row }) => (
        <span className="font-semibold text-foreground text-sm">{row.getValue('workflowName')}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant="outline" className={`gap-1.5 px-2 py-0.5 rounded-full ${statusStyles[status]}`}>
            {statusIcons[status]}
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'triggerType',
      header: 'Trigger',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.getValue('triggerType')}</span>,
    },
    {
      accessorKey: 'startedAt',
      header: 'Started At',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.original.startedAt), 'MMM d, yyyy HH:mm:ss')}
        </span>
      ),
    },
    {
      accessorKey: 'durationMs',
      header: 'Duration',
      cell: ({ row }) => {
        const ms = row.original.durationMs;
        if (!ms) return <span className="text-xs text-muted-foreground">-</span>;
        return <span className="text-xs font-mono text-muted-foreground">{ms / 1000}s</span>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setSelectedExec(row.original)}
        >
          <ExternalLink className="size-3.5" /> Details
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fadeInUp">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Executions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Execution history, logs, and troubleshooting.
          </p>
        </div>
        <Button variant="outline" className="gap-2 shadow-sm">
          <Filter className="size-4 text-muted-foreground" /> Filter Logs
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5 text-destructive">
          <CardContent className="py-4 text-sm font-medium">Failed to load execution logs.</CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 rounded-md bg-muted/50" />
          <Skeleton className="h-[400px] w-full rounded-xl bg-muted/50" />
        </div>
      ) : executions?.length ? (
        <DataTable
          columns={columns}
          data={executions}
          searchKey="workflowName"
          searchPlaceholder="Search by workflow name..."
        />
      ) : (
        <Card className="bg-card border-border border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center pointer-events-none">
              <Workflow className="size-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-foreground">No executions found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Workflows will log their execution history here once they are triggered.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Execution Details Sheet */}
      <Sheet open={!!selectedExec} onOpenChange={(open) => !open && setSelectedExec(null)}>
        <SheetContent side="right" className="w-[400px] sm:w-[600px] p-0 flex flex-col border-l border-border bg-background">
          <SheetHeader className="px-6 py-4 border-b border-border bg-card/50 shrink-0">
            <SheetTitle className="text-lg flex items-center gap-2">
              Execution Details
              {selectedExec && (
                <Badge variant="outline" className={`ml-2 gap-1.5 px-2 py-0.5 rounded-full ${statusStyles[selectedExec.status]}`}>
                  {statusIcons[selectedExec.status]}
                  {selectedExec.status}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription className="text-xs">
              ID: <span className="font-mono">{selectedExec?.id}</span>
              <br />
              Workflow:{' '}
              <span className="font-semibold text-foreground">{selectedExec?.workflowName}</span>
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-3">Timeline summary</h4>
                <div className="space-y-4 pl-2 border-l-2 border-border ml-2 relative">
                  <div className="absolute top-[-4px] -left-[9px] size-4 rounded-full bg-background border-2 border-primary flex items-center justify-center" />
                  <div className="pl-4">
                    <p className="text-sm font-medium">Triggered via {selectedExec?.triggerType}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedExec?.startedAt && formatDistanceToNow(new Date(selectedExec.startedAt), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="absolute bottom-[-4px] -left-[9px] size-4 rounded-full bg-background border-2 border-border flex items-center justify-center">
                    {selectedExec?.status === 'Success' && <CheckCircle2 className="size-3 text-emerald-500" />}
                    {selectedExec?.status === 'Failed' && <XCircle className="size-3 text-destructive" />}
                  </div>
                  <div className="pl-4 pt-4">
                    <p className="text-sm font-medium">Completion Status: {selectedExec?.status}</p>
                    <p className="text-xs text-muted-foreground">
                      Duration: {selectedExec?.durationMs ? `${selectedExec.durationMs / 1000}s` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">Raw JSON Data (Simulated)</h4>
                <div className="bg-black/90 p-4 rounded-lg border border-border overflow-auto font-mono text-xs text-green-400">
                  <pre>
                    {JSON.stringify(
                      {
                        context: { executionId: selectedExec?.id },
                        input: { trigger: selectedExec?.triggerType },
                        output: { result: 'Simulated execution trace log.' },
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ExecutionsPage;
