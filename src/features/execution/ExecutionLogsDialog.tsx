import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useExecutionLogs } from '@/api/executions';
import type { WorkflowExecution, ExecutionLog } from '@/types/execution';
import { format } from 'date-fns';
import { Loader2, AlertTriangle, Terminal, Info, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ExecutionLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execution: WorkflowExecution | null;
}

const getLogLevelConfig = (level: number) => {
  switch (level) {
    case 0:
      return {
        icon: <Info className="size-3 text-blue-500" />,
        textClass: 'text-foreground/80',
        bgClass: 'hover:bg-accent/50',
        label: 'INFO',
      };
    case 1:
      return {
        icon: <AlertTriangle className="size-3 text-amber-500" />,
        textClass: 'text-amber-500/90',
        bgClass: 'bg-amber-500/10 hover:bg-amber-500/20',
        label: 'WARN',
      };
    case 2:
      return {
        icon: <XCircle className="size-3 text-destructive" />,
        textClass: 'text-destructive',
        bgClass: 'bg-destructive/10 hover:bg-destructive/20',
        label: 'ERROR',
      };
    default:
      return {
        icon: <Info className="size-3 text-muted-foreground" />,
        textClass: 'text-muted-foreground',
        bgClass: '',
        label: 'UNKNOWN',
      };
  }
};

export const ExecutionLogsDialog: React.FC<ExecutionLogsDialogProps> = ({ open, onOpenChange, execution }) => {
  const isRunning = execution?.status === 0 || execution?.status === 'Running';
  const { data: logs, isLoading, error } = useExecutionLogs(execution?.id || null, !!open && isRunning);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="flex flex-col p-0 overflow-hidden bg-background border-border/50 shadow-2xl"
        style={{ maxWidth: '95vw', width: '95vw', maxHeight: '95vh', height: '95vh' }}
      >
        <DialogHeader className="px-6 py-4 border-b border-border/40 bg-muted/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Terminal className="size-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Execution Logs
                  {isRunning && <span className="relative flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
                  </span>}
                </DialogTitle>
                {execution && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground">{execution.definitionName}</span>
                    <span className="mx-2 opacity-50">•</span>
                    <span className="font-mono text-xs">{execution.id}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-black/90 p-1 min-h-[500px]">
          {isLoading ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-sm">Fetching logs...</p>
            </div>
          ) : error ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-destructive">
              <AlertTriangle className="size-8 opacity-80" />
              <p className="text-sm font-medium">Failed to load logs</p>
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-muted-foreground/60">
              <Terminal className="size-8 opacity-50" />
              <p className="text-sm">No logs available for this execution yet.</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 w-full h-[calc(95vh-130px)] rounded-sm border border-white/10 bg-[#0c0c0c]">
              <div className="flex flex-col p-2 text-[13px] font-mono leading-relaxed space-y-1">
                {logs.map((log: ExecutionLog, index: number) => {
                  const config = getLogLevelConfig(log.level);
                  return (
                    <div 
                      key={log.id || index}
                      className={cn(
                        "flex items-start gap-4 px-3 py-2 rounded-md transition-colors",
                        config.bgClass
                      )}
                    >
                      <div className="w-[180px] shrink-0 text-muted-foreground/70 flex flex-col gap-1">
                        <span className="whitespace-nowrap">
                          {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss.SSS')}
                        </span>
                        <div className="flex items-center gap-2">
                          {config.icon}
                          <span className={cn("text-[10px] font-bold tracking-wider", config.textClass)}>{config.label}</span>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5 border-l border-white/10 pl-4 py-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-white/5 border-white/10 text-white/70 font-mono rounded">
                            {log.nodeId}
                          </Badge>
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary/80 font-mono rounded border-none">
                            {log.event}
                          </Badge>
                        </div>
                        <span className={cn("break-words mt-0.5 whitespace-pre-wrap", config.textClass)}>
                          {log.message}
                        </span>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="mt-1 p-2 rounded bg-white/5 border border-white/5 text-xs text-muted-foreground/90 overflow-x-auto">
                            <pre className="font-mono m-0">{JSON.stringify(log.metadata, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
