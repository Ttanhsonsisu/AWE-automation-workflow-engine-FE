import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useWorkflowStore, type ExecutionLogItem, type WorkflowNode } from '@/stores/workflowStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Trash2,
  AlertCircle,
  Workflow,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Play,
  Loader2,
  ChevronRight,
  Search,
  Maximize2,
  Minimize2,
  FileJson,
  LayoutGrid,
  History,
  Info,
  ExternalLink,
  Cpu,
  Copy,
  RotateCw,
  RefreshCcw,
  Circle,
} from 'lucide-react';
import { getStepExecutionDetail } from '@/services/workflowService';
import { toast } from 'sonner';
import { getNodeDefinition, catalogToNodeCategories } from '../nodeDefinitions';
import { usePluginStore } from '@/stores/pluginStore';
import { cn } from '@/lib/utils';
import { useReactFlow } from '@xyflow/react';

export const ExecutionLogPanel: React.FC = () => {
  const { 
    executionLogs, 
    clearExecutionLogs, 
    setSelectedNode, 
    selectedNodeId, 
    canvasMode, 
    currentInstanceId,
    upsertExecutionLog 
  } = useWorkflowStore();
  const { categories } = usePluginStore();
  const nodeGroups = catalogToNodeCategories(categories);
  const { fitView, getNode, setNodes } = useReactFlow();
  const scrollRef = useRef<HTMLDivElement>(null);
  const runtimeLogScrollRef = useRef<HTMLDivElement>(null);
  
  const [viewMode, setViewMode] = useState<'detail' | 'all'>('detail');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);

  const resizerRef = useRef<HTMLDivElement>(null);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > 200 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  const toggleInput = () => {
    if (showInput && !showOutput) return; // Must show at least one
    setShowInput(!showInput);
  };

  const toggleOutput = () => {
    if (showOutput && !showInput) return; // Must show at least one
    setShowOutput(!showOutput);
  };

  // Auto-scroll to latest log entry in the list
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [executionLogs]);

  // Aggregate all runtime logs for "View All" mode
  const allRuntimeLogs = useMemo(() => {
    return executionLogs
      .flatMap(log => (log.runtimeLogs || []).map(rl => ({ ...rl, nodeLabel: log.nodeLabel || log.nodeType })))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [executionLogs]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return executionLogs;
    const lowerQuery = searchQuery.toLowerCase();
    return executionLogs.filter(log => 
      (log.nodeLabel || '').toLowerCase().includes(lowerQuery) ||
      (log.nodeType || '').toLowerCase().includes(lowerQuery) ||
      (log.nodeId || '').toLowerCase().includes(lowerQuery)
    );
  }, [executionLogs, searchQuery]);

  // Auto-scroll for the right panel's Live Runtime Logs
  const selectedLog = executionLogs.find((l) => l.nodeId === selectedNodeId);
  useEffect(() => {
    if (runtimeLogScrollRef.current) {
      runtimeLogScrollRef.current.scrollTop = runtimeLogScrollRef.current.scrollHeight;
    }
  }, [selectedLog?.runtimeLogs, allRuntimeLogs, viewMode]);

  // Highlight and center a node programmatically
  const selectReactFlowNode = (nodeId: string) => {
    setNodes(nodes => nodes.map(n => ({ ...n, selected: n.id === nodeId })));
  };

  const handleLogClick = async (nodeId: string) => {
    setViewMode('detail');
    setSelectedNode(nodeId);
    selectReactFlowNode(nodeId);

    const node = getNode(nodeId) as WorkflowNode | undefined;
    if (node) {
      fitView({
        nodes: [node],
        duration: 800,
        padding: 4,
      });

      // Fetch details from API if we have an instance ID
      if (currentInstanceId) {
        const stepId = (node.data.config?.stepId as string) || nodeId;
        
        try {
          setLoadingStepId(nodeId);
          const response = await getStepExecutionDetail(currentInstanceId, stepId);
          
          if (response?.success && response.data) {
            const detail = response.data;
            // Update the log entry with detailed data
            upsertExecutionLog(nodeId, {
              inputData: detail.input,
              outputData: detail.output,
              error: detail.errorMessage,
              startTime: detail.startTime,
              endTime: detail.endTime,
              status: mapApiStatus(detail.status),
            });
          }
        } catch (error) {
          console.error("Failed to fetch step details:", error);
          // Don't show toast for every click unless it's a hard failure
        } finally {
          setLoadingStepId(null);
        }
      }
    }
  };

  const mapApiStatus = (status: number): ExecutionLogItem['status'] => {
    switch (status) {
      case 0: return 'pending';
      case 1: return 'running';
      case 2: return 'completed';
      case 3: return 'failed';
      case 4: return 'skipped';
      default: return 'completed';
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
      case 'retrying':
        return {
          icon: <RotateCw className="size-3.5 animate-spin" />,
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          label: 'Retrying',
          dotColor: 'bg-amber-500',
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
        <div className="flex items-center gap-4">
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

          <Separator orientation="vertical" className="h-4 bg-border/50" />

          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/40">
            <Button
              variant={viewMode === 'detail' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('detail')}
              className={cn(
                "h-6 px-2.5 text-[10px] font-medium transition-all",
                viewMode === 'detail' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Step Details
            </Button>
            <Button
              variant={viewMode === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('all')}
              className={cn(
                "h-6 px-2.5 text-[10px] font-medium transition-all gap-1.5",
                viewMode === 'all' ? "bg-background shadow-sm text-blue-500" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn("size-1.5 rounded-full", viewMode === 'all' ? "bg-blue-500 animate-pulse" : "bg-muted-foreground/40")} />
              Global Logs
            </Button>
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
          <div 
            className="flex flex-col bg-muted/10 border-r border-border/50 shrink-0 h-full overflow-hidden"
            style={{ width: sidebarWidth, minWidth: 200, maxWidth: 600 }}
          >
            {/* Search Header */}
            <div className="px-3 py-2.5 border-b border-border/40 bg-card/30">
              <div className="relative group">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="Search steps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/10 transition-all rounded-lg"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-0.5" ref={scrollRef}>
                {filteredLogs.length === 0 ? (
                  <div className="py-20 text-center space-y-2 opacity-30 select-none">
                    <Search className="size-8 mx-auto" />
                    <p className="text-[10px] font-medium">No steps found</p>
                  </div>
                ) : (
                  filteredLogs.map((log, index) => {
                    const statusConfig = getStatusConfig(log.status);
                    const isSelected = selectedNodeId === log.nodeId;
                    const isLast = index === filteredLogs.length - 1;

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
                          log.status === 'running' && 'bg-primary/5 border-primary/15',
                          log.status === 'retrying' && 'bg-amber-500/5 border-amber-500/15'
                        )}
                      >
                        {/* Status Icon */}
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
                        </div>

                        {/* Node Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate leading-tight">
                            {log.nodeLabel || log.nodeType}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5 opacity-80">
                            <Clock className="size-2.5" />
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] font-bold px-1.5 py-0 h-4 shrink-0 uppercase tracking-wider select-none',
                            statusConfig.color,
                            statusConfig.border,
                            statusConfig.bg
                          )}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Resizer Handle */}
          <div
            ref={resizerRef}
            onMouseDown={startResizing}
            className={cn(
              "w-1.5 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-10 -ml-0.5 relative group",
              isResizing && "bg-primary/50"
            )}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-border group-hover:bg-primary/50" />
          </div>

          {/* Right panel: Details view */}
          <div className="flex-1 flex flex-col bg-background min-w-0">
            {viewMode === 'all' ? (
              /* Global Logs View */
              <div className="flex flex-col h-full animate-in fade-in duration-300">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card shrink-0">
                  <h4 className="text-sm font-bold flex items-center gap-2 text-blue-500">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    ALL RUNTIME LOGS STREAM
                  </h4>
                  <Badge variant="outline" className="text-[10px] font-mono opacity-60">
                    {allRuntimeLogs.length} entries
                  </Badge>
                </div>
                <div className="flex-1 p-4 min-h-0">
                   <div className="rounded-xl border border-border/40 bg-[#0f111a] shadow-md flex flex-col overflow-hidden text-[11px] h-full">
                      <div className="bg-white/5 px-4 py-2 border-b border-white/5 shrink-0 flex gap-4 text-[10px] font-mono text-white/40 sticky top-0 z-10 backdrop-blur-md">
                         <span className="w-[120px]">TIMESTAMP</span>
                         <span className="w-[120px]">NODE</span>
                         <span className="w-[60px]">LEVEL</span>
                         <span>MESSAGE</span>
                      </div>
                      <div 
                        ref={runtimeLogScrollRef}
                        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent overscroll-contain"
                      >
                        <div className="p-3 space-y-1 font-mono">
                          {allRuntimeLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-white/20 uppercase tracking-widest font-bold">
                              No logs recorded yet
                            </div>
                          ) : (
                            allRuntimeLogs.map((rlog, i) => {
                              const isErr = rlog.level === 'Error';
                              const isWarn = rlog.level === 'Warning';
                              const levelColor = isErr ? 'text-destructive' : isWarn ? 'text-amber-400' : 'text-blue-400';
                              
                              return (
                                <div key={i} className="flex items-start gap-4 hover:bg-white/5 px-2 py-0.5 rounded transition-colors group border-b border-white/[0.02] last:border-0">
                                  <span className="text-[10px] text-white/30 shrink-0 w-[120px] group-hover:text-white/50 transition-colors">
                                    {new Date(rlog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                  <span className="text-[10px] text-primary/60 shrink-0 w-[120px] font-bold truncate">
                                    {rlog.nodeLabel}
                                  </span>
                                  <span className={cn('text-[10px] font-bold shrink-0 w-[60px] uppercase', levelColor)}>
                                    {rlog.level}
                                  </span>
                                  <span className="text-white/80 whitespace-pre-wrap break-all leading-relaxed">
                                    {rlog.message}
                                  </span>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            ) : (() => {
              const selectedLog = executionLogs.find((l) => l.nodeId === selectedNodeId);
              if (!selectedLog) {
                return (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in fade-in duration-300">
                    <Workflow className="size-8 opacity-20 mb-3" />
                    <p className="text-sm font-medium">Select a step to view details</p>
                  </div>
                );
              }

              if (loadingStepId === selectedNodeId) {
                 return (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in fade-in duration-300">
                    <Loader2 className="size-8 text-primary animate-spin mb-3" />
                    <p className="text-sm font-medium">Fetching step details...</p>
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
                                      <div className="flex items-center gap-2 mt-4">
                      <div className="flex p-1 bg-muted/50 rounded-lg border border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setShowInput(true); setShowOutput(false); }}
                          className={cn(
                            "h-7 px-4 text-xs font-medium rounded-md transition-all",
                            showInput && !showOutput ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Input
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setShowInput(false); setShowOutput(true); }}
                          className={cn(
                            "h-7 px-4 text-xs font-medium rounded-md transition-all",
                            !showInput && showOutput ? "bg-background shadow-sm text-emerald-500" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Output
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setShowInput(true); setShowOutput(true); }}
                          className={cn(
                            "h-7 px-4 text-xs font-medium rounded-md transition-all",
                            showInput && showOutput ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Both
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Detail Body */}
                  <div className="flex-1 flex flex-col p-4 gap-4 bg-muted/5 min-h-0 overflow-y-auto custom-scrollbar">
                    {/* Execution Summary Card */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-card border border-border/50 rounded-xl p-3 flex flex-col gap-1 shadow-sm">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Status</span>
                        <div className="flex items-center gap-2">
                          <div className={cn("size-2 rounded-full", statusConfig.bg)} />
                          <span className={cn("text-xs font-bold", statusConfig.color)}>{statusConfig.label}</span>
                        </div>
                      </div>
                      <div className="bg-card border border-border/50 rounded-xl p-3 flex flex-col gap-1 shadow-sm">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Duration</span>
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 text-muted-foreground" />
                          <span className="text-xs font-bold font-mono">
                            {(() => {
                              if (selectedLog.duration !== undefined) return `${selectedLog.duration}ms`;
                              if (selectedLog.startTime && selectedLog.endTime) {
                                const d = new Date(selectedLog.endTime).getTime() - new Date(selectedLog.startTime).getTime();
                                return `${d}ms`;
                              }
                              return '--';
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className="bg-card border border-border/50 rounded-xl p-3 flex flex-col gap-1 shadow-sm">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Execution Type</span>
                        <div className="flex items-center gap-1.5">
                          <Cpu className="size-3 text-muted-foreground" />
                          <span className="text-xs font-bold truncate">{selectedLog.nodeType}</span>
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "flex-1 grid gap-4 min-h-[400px]",
                      showInput && showOutput ? "grid-cols-2" : "grid-cols-1"
                    )}>
                      {/* Input Payload */}
                      {showInput && (
                        <div className="flex flex-col space-y-2 h-full">
                          <div className="flex items-center justify-between px-1">
                            <h4 className="text-[10px] font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/70"></span>
                              Input Data
                            </h4>
                            <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-primary" onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(selectedLog.inputData, null, 2));
                            }}>
                              <Copy className="size-3" />
                            </Button>
                          </div>
                          <div className="rounded-xl border border-border/40 bg-[#0f111a] shadow-inner flex flex-col flex-1 overflow-hidden group">
                            <div className="bg-white/5 px-3 py-1.5 border-b border-white/5 flex items-center justify-between shrink-0 select-none">
                              <span className="text-[10px] text-white/30 font-mono tracking-wider">payload.json</span>
                            </div>
                            <ScrollArea className="flex-1">
                              <div className="p-4">
                                <pre className="text-blue-300/80 font-mono text-[11px] leading-relaxed selection:bg-primary/30">
                                  {JSON.stringify(selectedLog.inputData || {}, null, 2)}
                                </pre>
                              </div>
                            </ScrollArea>
                          </div>
                        </div>
                      )}

                      {/* Output Result */}
                      {showOutput && (
                        <div className="flex flex-col space-y-2 h-full">
                          <div className="flex items-center justify-between px-1">
                            <h4 className="text-[10px] font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70"></span>
                              Output Result
                            </h4>
                            <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-emerald-500" onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(selectedLog.outputData, null, 2));
                            }}>
                              <Copy className="size-3" />
                            </Button>
                          </div>
                          <div className="rounded-xl border border-border/40 bg-[#0f111a] shadow-inner flex flex-col flex-1 overflow-hidden group">
                            <div className="bg-white/5 px-3 py-1.5 border-b border-white/5 flex items-center justify-between shrink-0 select-none">
                              <span className="text-[10px] text-white/30 font-mono tracking-wider">result.json</span>
                            </div>
                            <ScrollArea className="flex-1">
                              <div className="p-4">
                                <pre className="text-emerald-400/90 font-mono text-[11px] leading-relaxed selection:bg-emerald-500/30">
                                  {JSON.stringify(selectedLog.outputData || {}, null, 2)}
                                </pre>
                              </div>
                            </ScrollArea>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Error details if any */}
                    {(selectedLog.error || selectedLog.status === 'failed') && (
                      <div className="space-y-2 animate-in slide-in-from-bottom-2 shrink-0">
                         <h5 className="text-[10px] font-bold flex items-center gap-2 text-destructive uppercase tracking-widest">
                          <AlertCircle className="size-3" />
                          Execution Error
                        </h5>
                        <div className="rounded-xl border border-destructive/20 bg-destructive/5 text-destructive p-4 shadow-sm">
                          <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed">
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
