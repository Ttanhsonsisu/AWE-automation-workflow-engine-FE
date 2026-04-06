import React, { useEffect, useRef, useState } from 'react';
import { useWorkflowStore, type ExecutionLogItem } from '@/stores/workflowStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  Workflow,
  Clock,
  Circle,
} from 'lucide-react';
import { getNodeDefinition, catalogToNodeCategories } from '../nodeDefinitions';
import { usePluginStore } from '@/stores/pluginStore';
import { cn } from '@/lib/utils';
import { useReactFlow } from '@xyflow/react';

export const ExecutionLogPanel: React.FC = () => {
  const { executionLogs, clearExecutionLogs, setSelectedNode, selectedNodeId, canvasMode } = useWorkflowStore();
  const { categories } = usePluginStore();
  const nodeGroups = catalogToNodeCategories(categories);
  const { fitView, getNode, setNodes } = useReactFlow();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(true);

  const toggleInput = () => {
    if (showInput && !showOutput) return; // Must show at least one
    setShowInput(!showInput);
  };

  const toggleOutput = () => {
    if (showOutput && !showInput) return; // Must show at least one
    setShowOutput(!showOutput);
  };

  // Auto-scroll to latest log entry
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [executionLogs]);

  // Highlight and center a node programmatically
  const selectReactFlowNode = (nodeId: string) => {
    setNodes(nodes => nodes.map(n => ({ ...n, selected: n.id === nodeId })));
  };

  const handleLogClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    selectReactFlowNode(nodeId);

    const node = getNode(nodeId);
    if (node) {
      fitView({
        nodes: [node],
        duration: 800,
        padding: 4,
      });
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'running':
        return {
          icon: <Loader2 className="size-3.5 animate-spin" />,
          color: 'text-primary',
          bg: 'bg-primary/10',
          border: 'border-primary/30',
          label: 'Running',
          dotColor: 'bg-primary',
        };
      case 'success':
      case 'completed':
        return {
          icon: <CheckCircle2 className="size-3.5" />,
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          label: 'Completed',
          dotColor: 'bg-emerald-500',
        };
      case 'error':
      case 'failed':
        return {
          icon: <AlertCircle className="size-3.5" />,
          color: 'text-destructive',
          bg: 'bg-destructive/10',
          border: 'border-destructive/30',
          label: 'Failed',
          dotColor: 'bg-destructive',
        };
      case 'skipped':
        return {
          icon: <Circle className="size-3.5" />,
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          label: 'Skipped',
          dotColor: 'bg-amber-500',
        };
      case 'suspended':
        return {
          icon: <Clock className="size-3.5" />,
          color: 'text-blue-500',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          label: 'Suspended',
          dotColor: 'bg-blue-500',
        };
      case 'pending':
      default:
        return {
          icon: <Circle className="size-3.5" />,
          color: 'text-muted-foreground',
          bg: 'bg-muted/50',
          border: 'border-border',
          label: 'Pending',
          dotColor: 'bg-muted-foreground',
        };
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Workflow className="size-3.5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-xs leading-none">Execution Steps</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {executionLogs.length} step{executionLogs.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearExecutionLogs}
          disabled={executionLogs.length === 0}
          className="h-7 px-2 gap-1 text-[10px] text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3" />
          Clear
        </Button>
      </div>

      {executionLogs.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
          <div className="relative size-16 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse" />
            <div className="relative flex items-center justify-center size-12 rounded-xl bg-card border border-primary/15 shadow-md z-10">
              <Play className="size-5 text-primary" />
            </div>
          </div>
          <p className="text-xs font-semibold text-foreground">No Execution Data</p>
          <p className="text-[10px] text-muted-foreground mt-1 max-w-[180px] leading-relaxed">
            Click <strong>Run</strong> to start the workflow and see step-by-step progress here.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          {/* Left panel: Execution Step List */}
          <div className="w-[320px] min-w-[320px] border-r border-border/50 flex flex-col bg-muted/5 z-0">
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-0.5" ref={scrollRef}>
                {executionLogs.map((log, index) => {
                  const def = getNodeDefinition(log.nodeType, nodeGroups);
                  const NodeIcon = def?.icon || Play;
                  const statusConfig = getStatusConfig(log.status);
                  const isSelected = selectedNodeId === log.nodeId;
                  const isLast = index === executionLogs.length - 1;

                  return (
                    <div
                      key={log.id}
                      id={`log-item-${log.nodeId}`}
                      onClick={() => handleLogClick(log.nodeId)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group relative',
                        isSelected
                          ? 'bg-primary/8 border border-primary/20 shadow-sm'
                          : 'hover:bg-muted/50 border border-transparent',
                        log.status === 'running' && 'bg-primary/5 border-primary/15'
                      )}
                    >
                      {/* Step Number / Timeline Connector */}
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className={cn(
                            'size-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors',
                            statusConfig.bg,
                            statusConfig.color
                          )}
                        >
                          {statusConfig.icon}
                        </div>
                        {/* Vertical connector line */}
                        {!isLast && (
                          <div className="w-px h-1.5 bg-border/50 mt-0.5 relative" />
                        )}
                      </div>

                      {/* Node Info */}
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate leading-none">
                            {log.nodeLabel || log.nodeType}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="size-2.5 inline" />
                            {new Date(log.timestamp).toLocaleTimeString()}
                            {log.duration !== undefined && (
                              <span className="font-mono text-muted-foreground/70 ml-1">
                                · {log.duration}ms
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] font-bold px-1.5 py-0 h-4 shrink-0 uppercase tracking-wider',
                            statusConfig.color,
                            statusConfig.border,
                            statusConfig.bg
                          )}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right panel: Details view */}
          <div className="flex-1 flex flex-col bg-background min-w-0">
            {(() => {
              const selectedLog = executionLogs.find((l) => l.nodeId === selectedNodeId);
              if (!selectedLog) {
                return (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in fade-in duration-300">
                    <Workflow className="size-8 opacity-20 mb-3" />
                    <p className="text-sm font-medium">Select a step to view details</p>
                  </div>
                );
              }

              const statusConfig = getStatusConfig(selectedLog.status);

              return (
                <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200 min-h-0 bg-background">
                  <div className="flex flex-col px-4 py-3 border-b border-border/50 shrink-0 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("size-8 rounded-lg flex items-center justify-center font-bold", statusConfig.bg, statusConfig.color)}>
                          {statusConfig.icon}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold truncate leading-tight">
                            {selectedLog.nodeLabel || selectedLog.nodeType}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className={cn("font-medium", statusConfig.color)}>
                              {statusConfig.label}
                            </span>
                            <span>•</span>
                            <span className="font-mono">{selectedLog.nodeType}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Timing details */}
                      <div className="flex flex-col items-end gap-1 text-[10px] text-muted-foreground font-mono">
                        {selectedLog.startTime && <div>Start: {new Date(selectedLog.startTime).toISOString()}</div>}
                        {selectedLog.endTime && <div>End: {new Date(selectedLog.endTime).toISOString()}</div>}
                        {selectedLog.duration !== undefined && <div>Duration: {selectedLog.duration}ms</div>}
                      </div>
                    </div>
                    
                    {/* Display options row */}
                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        variant={showInput ? "secondary" : "outline"}
                        size="sm"
                        onClick={toggleInput}
                        className={cn(
                          "h-7 px-3 text-xs font-semibold rounded-md transition-colors", 
                          showInput ? "bg-primary/20 text-primary border-primary/20" : "text-muted-foreground border-border/50 hover:bg-muted/50"
                        )}
                      >
                        Show Input
                      </Button>
                      <Button
                        variant={showOutput ? "secondary" : "outline"}
                        size="sm"
                        onClick={toggleOutput}
                        className={cn(
                          "h-7 px-3 text-xs font-semibold rounded-md transition-colors", 
                          showOutput ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "text-muted-foreground border-border/50 hover:bg-muted/50"
                        )}
                      >
                        Show Output
                      </Button>
                    </div>
                  </div>

                  {/* Detail Body */}
                  <div className="flex-1 overflow-y-auto bg-muted/10 p-4 space-y-4">
                    <div className={cn(
                      "grid gap-4",
                      showInput && showOutput ? "grid-cols-2" : "grid-cols-1"
                    )}>
                      {/* Input Payload */}
                      {showInput && (
                        <div className="flex flex-col space-y-1.5 h-full min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/70"></span>
                              Input Payload
                            </h5>
                          </div>
                          <div className="rounded-xl border border-border/50 bg-[#1e1e1e] shadow-inner flex flex-col flex-1 text-xs overflow-hidden">
                            <div className="bg-white/5 px-3 py-1.5 border-b border-white/5 flex items-center justify-between shrink-0 select-none">
                              <span className="text-[10px] text-white/50 font-mono tracking-wider">JSON</span>
                            </div>
                            <div className="p-3 overflow-x-auto flex-1">
                              <pre className="text-white/80 font-mono leading-relaxed inline-block">
                                {JSON.stringify(selectedLog.inputData || {}, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Output Result */}
                      {showOutput && (
                        <div className="flex flex-col space-y-1.5 h-full min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70"></span>
                              Output Result
                            </h5>
                          </div>
                          <div className="rounded-xl border border-border/50 bg-[#1e1e1e] shadow-inner flex flex-col flex-1 text-xs overflow-hidden">
                            <div className="bg-white/5 px-3 py-1.5 border-b border-white/5 flex items-center justify-between shrink-0 select-none">
                              <span className="text-[10px] text-white/50 font-mono tracking-wider">JSON</span>
                            </div>
                            <div className="p-3 overflow-x-auto flex-1">
                              <pre className="text-emerald-400/90 font-mono leading-relaxed inline-block">
                                {JSON.stringify(selectedLog.outputData || {}, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Error details if any */}
                    {(selectedLog.error || selectedLog.status === 'failed') && (
                      <div className="space-y-1.5 animate-in slide-in-from-bottom-2 mt-4 shrink-0">
                         <h5 className="text-xs font-semibold flex items-center gap-1.5 text-destructive">
                          <AlertCircle className="size-3" />
                          Error Message
                        </h5>
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 text-destructive p-3 overflow-x-auto">
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {selectedLog.error || "Execution failed without an error message."}
                          </pre>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
