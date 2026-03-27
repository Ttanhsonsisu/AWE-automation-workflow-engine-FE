import React, { useEffect } from 'react';
import { useWorkflowStore, type ExecutionLogItem } from '@/stores/workflowStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, AlertCircle, CheckCircle2, Loader2, Play, Workflow,
  Settings,
  BarChart3
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

  // Highlight and center a node programmatically
  const selectReactFlowNode = (nodeId: string) => {
    setNodes(nodes => nodes.map(n => ({ ...n, selected: n.id === nodeId })));
  };

  useEffect(() => {
    if (canvasMode === 'execution' && selectedNodeId) {
      const el = document.getElementById(`log-item-${selectedNodeId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Optionally flash or highlight the bg 
        el.classList.add('bg-muted/50');
        setTimeout(() => el.classList.remove('bg-muted/50'), 1500);
      }
    }
  }, [selectedNodeId, canvasMode, executionLogs.length]);

  const handleLogClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    selectReactFlowNode(nodeId);
    
    // Zoom/Pan to node
    const node = getNode(nodeId);
    if (node) {
      fitView({
        nodes: [node],
        duration: 800,
        padding: 4,
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="size-4 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle2 className="size-4 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="size-4 text-destructive" />;
      default:
        return <Play className="size-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">Running</Badge>;
      case 'success':
        return <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-card border-l border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
        <div>
          <h3 className="font-semibold text-sm">Execution Logs</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {executionLogs.length} events recorded
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={clearExecutionLogs}
          disabled={executionLogs.length === 0}
          className="h-8 gap-1.5"
        >
          <Trash2 className="size-3.5" />
          Clear
        </Button>
      </div>

      {executionLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
          <div className="relative size-20 mb-6 flex items-center justify-center mt-8">
             <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse delay-700" />
             <div className="relative flex items-center justify-center size-14 rounded-2xl bg-card border border-primary/20 shadow-lg shrink-0 z-10 transition-transform hover:scale-105">
               <Workflow className="size-6 text-primary" />
             </div>
             <div className="absolute -left-4 top-0 size-10 rounded-xl bg-card border border-primary/10 shadow-sm flex items-center justify-center animate-[bounce_3s_infinite]">
                <Settings className="size-5 text-primary/60" />
             </div>
             <div className="absolute -right-4 bottom-0 size-10 rounded-xl bg-card border border-primary/10 shadow-sm flex items-center justify-center animate-[bounce_4s_infinite_1s]">
                <BarChart3 className="size-5 text-primary/60" />
             </div>
          </div>
          <p className="text-[14px] font-bold text-foreground">Awaiting Execution</p>
          <p className="text-[12px] text-muted-foreground mt-1.5 max-w-[220px] leading-relaxed">
            Run the workflow to populate the logs with real-time execution data.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <Accordion type="multiple" className="w-full">
            {executionLogs.map((log, index) => {
              const def = getNodeDefinition(log.nodeType, nodeGroups);
              const NodeIcon = def?.icon || Play;

              return (
                <AccordionItem 
                  key={log.id} 
                  value={log.id}
                  id={`log-item-${log.nodeId}`}
                  className={cn(
                    "border-b border-border/50 px-2 last:border-0 relative group transition-all duration-500",
                    log.status === 'running' && "bg-primary/10 shadow-[inset_2px_0_0_0_hsl(var(--primary)/0.6)]"
                  )}
                >
                  {/* Highlight on log click */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-r"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogClick(log.nodeId);
                    }}
                    title="Focus Node"
                  />

                  <AccordionTrigger className="hover:no-underline py-3 px-2 group/trigger overflow-hidden text-left">
                    <div className="flex items-center justify-between w-full pr-4 min-w-0">
                      <div className="flex items-center gap-3 overflow-hidden min-w-0">
                        <div className={cn("p-1.5 rounded-md flex-shrink-0", def?.bgColor || "bg-slate-100 dark:bg-slate-800")}>
                          <NodeIcon className={cn("size-4", def?.color?.replace('bg-', 'text-'))} />
                        </div>
                        <div className="flex flex-col items-start gap-0.5 min-w-0 overflow-hidden">
                          <span className="text-sm font-medium truncate w-full">
                            {log.nodeLabel}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {log.duration !== undefined && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.duration}ms
                          </span>
                        )}
                        {getStatusBadge(log.status)}
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-2 pb-4 overflow-hidden w-full">
                    <Tabs defaultValue="output" className="w-full h-full overflow-hidden flex flex-col">
                      <TabsList className="h-7 mb-2 bg-muted/50 p-0.5 shrink-0 w-max">
                        <TabsTrigger value="input" className="text-[10px] h-6 px-3">Input</TabsTrigger>
                        <TabsTrigger value="output" className="text-[10px] h-6 px-3">Output</TabsTrigger>
                      </TabsList>

                      <TabsContent value="input" className="mt-0 flex-1 overflow-hidden">
                        <div className="rounded-md bg-zinc-950 p-3 overflow-x-auto w-full max-w-[380px]">
                          <pre className="text-[11px] font-mono text-emerald-400/90 leading-relaxed block overflow-visible">
                            {log.inputData 
                              ? JSON.stringify(log.inputData, null, 2)
                              : '// No input payload'
                            }
                          </pre>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="output" className="mt-0 flex-1 overflow-hidden">
                        <div className="rounded-md bg-zinc-950 p-3 overflow-x-auto relative w-full max-w-[380px]">
                           {log.status === 'running' && (
                             <div className="absolute inset-0 bg-zinc-950/50 flex flex-col items-center justify-center backdrop-blur-[1px]">
                               <Loader2 className="size-5 animate-spin text-primary mb-2" />
                               <span className="text-xs text-primary font-medium">Running...</span>
                             </div>
                           )}
                          <pre className={cn("text-[11px] font-mono leading-relaxed block overflow-visible", 
                            log.status === 'error' ? 'text-red-400' : 'text-emerald-400/90'
                          )}>
                            {log.outputData 
                              ? JSON.stringify(log.outputData, null, 2)
                              : log.error ? log.error : '// Output will appear here'
                            }
                          </pre>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </ScrollArea>
      )}
    </div>
  );
};
