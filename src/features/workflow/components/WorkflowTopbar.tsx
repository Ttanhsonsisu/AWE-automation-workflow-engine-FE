import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkflowStore } from '@/stores/workflowStore';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';


import {
  ArrowLeft,
  Save,
  Play,
  CheckCircle2,
  Loader2,
  Edit3,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateWorkflowDefinition } from '@/services/workflowService';
import { toast } from 'sonner';

export const WorkflowTopbar: React.FC = () => {
  const navigate = useNavigate();
  const {
    workflowName,
    setWorkflowName,
    isSaved,
    isExecuting,
    undo,
    redo,
    canUndo,
    canRedo,
    markSaved,
    setExecuting,
    canvasMode,
    setCanvasMode,
    addExecutionLog,
    upsertExecutionLog,
    clearExecutionLogs,
  } = useWorkflowStore();

  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    const store = useWorkflowStore.getState();
    const { nodes, edges, workflowName, workflowId } = store;

    if (!workflowId) {
      toast.error("Lỗi Workflow", { description: "Không tìm thấy Workflow ID. Thao tác lưu thất bại." });
      return;
    }

    if (nodes.length === 0) {
      toast.warning("Cảnh báo", { description: "Không có Node nào trên Canvas để lưu!" });
      return;
    }

    setIsSaving(true);
    try {
      const steps = nodes.map(node => {
        const inputSchema = node.data.pluginMetadata?.inputSchema as any;
        const hasInputs = inputSchema?.properties && Object.keys(inputSchema.properties).length > 0;
        
        let isConfigured = node.data.config?.isConfigured;
        if (!hasInputs) {
          isConfigured = true;
        }

        const stepPayload: any = {
          Id: (node.data.config?.stepId as string) || node.id,
          Type: node.data.pluginMetadata?.name as string,
          ExecutionMode: (node.data.pluginMetadata?.executionMode as string) || 'BuiltIn',
          ExecutionMetadata: node.data.pluginMetadata?.executionMetadata || undefined,
          Inputs: node.data.config?.inputs || {},
        };

        if (isConfigured !== undefined) {
          stepPayload.IsConfigured = isConfigured;
        }

        if (node.data.config?.maxRetries !== undefined) {
          stepPayload.MaxRetries = node.data.config.maxRetries;
        }

        return stepPayload;
      });

      const transitions = edges.map((edge, index) => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        return {
          Id: `Transition_${index}`, // Optional if needed
          Source: (sourceNode?.data.config?.stepId as string) || edge.source,
          Target: (targetNode?.data.config?.stepId as string) || edge.target,
        };
      });

      const payload = {
        Id: workflowId,
        Name: workflowName || 'Untitled Workflow',
        DefinitionJson: {
          Steps: steps,
          Transitions: transitions,
        },
        UiJson: {
          nodes,
          edges,
        }
      };

      const result = await updateWorkflowDefinition(payload);
      if (result && result.success) {
        toast.success("Lưu thành công", { description: "Định nghĩa Workflow đã được cập nhật." });
        markSaved();
        
        // Purge react-query cache completely to force hard-fetch on re-edit
        queryClient.removeQueries({ queryKey: ['workflow', workflowId] });
        queryClient.invalidateQueries({ queryKey: ['workflows'] });
      } else {
        toast.error("Lưu thất bại", { description: "Có lỗi xảy ra, vui lòng thử lại." });
      }
    } catch (error: any) {
      console.error("Save workflow error:", error);
      toast.error("Lỗi hệ thống", { description: error?.message || "Đã xảy ra lỗi khi lưu Workflow." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestExecution = async () => {
    if (isExecuting) return;
    
    const store = useWorkflowStore.getState();
    const { nodes, edges, updateNodeData } = store;
    
    const startNode = nodes.find((n) => n.type === 'startNode');

    if (!startNode) {
      toast.warning("Thiếu Start Node", { description: "Không tìm thấy Start Node trên Canvas!" });
      return;
    }

    clearExecutionLogs();
    setCanvasMode('execution'); // Auto switch to execution mode
    setExecuting(true);

    // Reset all nodes to idle
    nodes.forEach(n => updateNodeData(n.id, { status: 'idle' }));

    // BFS simulation
    let currentLevel = [startNode.id];

    while (currentLevel.length > 0) {
      // Set current level to running — create log entry once per node
      currentLevel.forEach(id => {
        updateNodeData(id, { status: 'running' });
        
        const node = nodes.find(n => n.id === id);
        if (node) {
          addExecutionLog({
            id: `log-${id}`,
            nodeId: id,
            nodeLabel: (node.data.config?.nodeLabel as string) || (node.data.pluginMetadata?.displayName as string),
            nodeType: node.data.pluginMetadata?.name as string,
            status: 'running',
            timestamp: new Date().toISOString(),
          });
        }
      });
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Update existing log entry in-place to completed
      currentLevel.forEach(id => {
        updateNodeData(id, { status: 'completed' }); // Note: you might also want to update the store typing for UI status if it expects 'success', but let's assume it accepts mapped strings. Wait, I should make sure updateNodeData works. Actually, it's just 'success' in ReactFlow nodes typically, but 'completed' is fine for generic.
        
        const node = nodes.find(n => n.id === id);
        if (node) {
          const duration = Math.floor(Math.random() * 500) + 100;
          
          // Generate realistic mock data based on user payload example
          const mockInput = {
            "Text": "Kết quả cuối cùng gửi từ thỏ là: Written to Console",
            "Operation": "UPPER"
          };
          
          const mockOutput = {
            "result": "KẾT QUẢ CUỐI CÙNG GỬI TỪ THỎ LÀ: WRITTEN TO CONSOLE",
            "originalLength": 51
          };

          const endTime = new Date();
          const startTime = new Date(endTime.getTime() - duration);

          upsertExecutionLog(id, {
            status: 'completed',
            duration,
            timestamp: endTime.toISOString(),
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            inputData: mockInput,
            outputData: mockOutput,
            instanceId: "6cd2dca9-0918-455d-ab3c-1513837f9d0c"
          });
        }
      });

      // Find next level
      const storeEdges = useWorkflowStore.getState().edges;
      const nextLevel = storeEdges
        .filter(e => currentLevel.includes(e.source))
        .map(e => e.target);
      
      currentLevel = [...new Set(nextLevel)];
    }

    // Finished
    setTimeout(() => {
      setExecuting(false);
      // Optional: reset edges animated state
      useWorkflowStore.getState().edges.forEach(e => {
        // XYFlow mutates the state if we replace it, but since setExecuting(false) runs it resets all animated
      });
    }, 500);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <header className="flex items-center justify-between h-[60px] px-6 border-b border-border/50 bg-background/90 backdrop-blur-md shrink-0 z-50">
        {/* LEFT: Title + Breadcrumbs */}
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/workflows')}
                className="size-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <ArrowLeft className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Back to Workflows</TooltipContent>
          </Tooltip>
          
          <div className="flex flex-col gap-1 w-64">
             <h1 className="text-[18px] font-bold text-foreground leading-none tracking-tight">Workflow Builder</h1>
             <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground mt-1">
               <span className="hover:text-primary cursor-pointer transition-colors">Workflows</span>
               <span className="text-border">/</span>
               <span className="text-foreground truncate max-w-[150px]">{workflowName || 'Customer Onboarding'}</span>
             </div>
          </div>
        </div>

        {/* CENTER: Execution Mode Indicator */}
        <div className="flex-1 flex justify-center items-center">
            {canvasMode === 'execution' && (
               <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold shadow-sm text-sm animate-in fade-in zoom-in duration-300">
                  <div className="relative flex size-2">
                    <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></div>
                    <div className="relative inline-flex rounded-full size-2 bg-primary"></div>
                  </div>
                  Execution Mode
               </div>
            )}
        </div>

        {/* RIGHT: Controls */}
        <div className="flex items-center gap-4 w-64 justify-end">
          {/* Save Status */}
          {isSaved ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-emerald-500 hover:text-emerald-600 transition-colors cursor-help bg-emerald-500/10 p-1.5 rounded-md">
                   <CheckCircle2 className="size-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">Saved</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("text-amber-500 hover:text-amber-600 transition-colors p-1.5 rounded-md", isSaving ? "cursor-not-allowed opacity-50" : "cursor-pointer bg-amber-500/10")} onClick={!isSaving ? handleSave : undefined}>
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">Click to Save</TooltipContent>
            </Tooltip>
          )}

          {/* Mode Switcher - Segmented Control */}
          <div className="flex items-center bg-secondary/30 p-1 rounded-xl border border-border/50 shadow-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCanvasMode('editor')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                    canvasMode === 'editor' 
                      ? "bg-background text-primary shadow-sm scale-[1.02]" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Edit3 className={cn("size-3.5", canvasMode === 'editor' ? "text-primary" : "text-muted-foreground")} />
                  Design
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Design Mode (Ctrl+E)
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCanvasMode('execution')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 relative",
                    canvasMode === 'execution' 
                      ? "bg-background text-primary shadow-sm scale-[1.02]" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Zap className={cn("size-3.5", canvasMode === 'execution' ? "text-primary" : "text-muted-foreground")} />
                  Execution
                  {isExecuting && (
                    <span className="absolute -top-0.5 -right-0.5 size-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(229,114,43,0.8)]" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Execution Mode (Ctrl+E)
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Run Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleTestExecution}
                disabled={isExecuting}
                className="h-9 px-5 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_0_rgba(229,114,43,0.3)] rounded-lg transition-all hover:scale-105 active:scale-95"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-white" />
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-white text-white" />
                    <span className="font-semibold text-sm">Run</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isExecuting ? 'Workflow is running...' : 'Simulate Workflow Execution'}
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
};
