import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '@/stores/workflowStore';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BugPlay,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveWorkflowDefinition } from '@/services/workflowService';

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
    clearExecutionLogs,
  } = useWorkflowStore();

  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    const store = useWorkflowStore.getState();
    const { nodes, edges, workflowName } = store;

    if (nodes.length === 0) {
      alert("Không có Node nào trên Canvas để lưu!");
      return;
    }

    setIsSaving(true);
    try {
      const steps = nodes.map(node => {
        return {
          Id: (node.data.config?.stepId as string) || node.id,
          Type: node.data.pluginMetadata?.name as string,
          ExecutionMode: (node.data.pluginMetadata?.executionMode as string) || 'BuiltIn',
          ExecutionMetadata: node.data.pluginMetadata?.executionMetadata || undefined,
          Inputs: node.data.config?.inputs || {},
        };
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
        Name: workflowName || 'Untitled Workflow',
        DefinitionJson: {
          Steps: steps,
          Transitions: transitions,
        },
        UiJson: JSON.stringify({
          nodes,
          edges,
        })
      };

      const result = await saveWorkflowDefinition(payload);
      if (result && result.success) {
        alert("Lưu định nghĩa Workflow thành công!");
        markSaved();
      } else {
        alert("Lưu Workflow thất bại. Vui lòng thử lại.");
      }
    } catch (error: any) {
      console.error("Save workflow error:", error);
      alert(error?.message || "Đã xảy ra lỗi khi lưu Workflow.");
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
      alert("No Start Node found on the canvas!");
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
      // Set current level to running
      currentLevel.forEach(id => {
        updateNodeData(id, { status: 'running' });
        
        const node = nodes.find(n => n.id === id);
        if (node) {
          addExecutionLog({
            id: `log-${Date.now()}-${id}-start`,
            nodeId: id,
            nodeLabel: (node.data.config?.nodeLabel as string) || (node.data.pluginMetadata?.displayName as string),
            nodeType: node.data.pluginMetadata?.name as string,
            status: 'running',
            timestamp: new Date().toISOString(),
          });
        }
      });
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Set current level to success
      currentLevel.forEach(id => {
        updateNodeData(id, { status: 'success' });
        
        const node = nodes.find(n => n.id === id);
        if (node) {
          // Output simulated mock data based on node type
          let mockOutput = { success: true, timestamp: new Date().toISOString() };
          if (node.data.pluginMetadata?.name === 'webhook_trigger') mockOutput = { ...mockOutput, method: 'POST', body: { user: 'test' } } as any;
          if (node.data.pluginMetadata?.category === 'api') mockOutput = { ...mockOutput, statusCode: 200, response: { data: 'ok' } } as any;

          addExecutionLog({
            id: `log-${Date.now()}-${id}-end`,
            nodeId: id,
            nodeLabel: (node.data.config?.nodeLabel as string) || (node.data.pluginMetadata?.displayName as string),
            nodeType: node.data.pluginMetadata?.name as string,
            status: 'success',
            timestamp: new Date().toISOString(),
            duration: Math.floor(Math.random() * 500) + 100, // mock duration
            inputData: { previousNode: '...' }, // mock input
            outputData: mockOutput,
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
               <div className="px-5 py-1.5 rounded-xl bg-secondary/80 text-foreground border border-border/50 font-semibold shadow-sm text-sm">
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

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 mr-2">
             <div className="flex items-center text-[13px] font-medium text-muted-foreground gap-1">
                <span className={cn("transition-colors cursor-pointer", canvasMode === 'editor' && "text-foreground font-semibold")} onClick={() => setCanvasMode('editor')}>Editor</span>
                <span className="opacity-40">|</span>
                <span className={cn("transition-colors cursor-pointer", canvasMode === 'execution' && "text-foreground font-semibold")} onClick={() => setCanvasMode('execution')}>Execution</span>
             </div>
             
             {/* Switch toggle */}
             <div 
               className={cn("w-10 h-[22px] flex items-center rounded-full p-[3px] cursor-pointer transition-colors shadow-inner", canvasMode === 'execution' ? "bg-primary" : "bg-muted")}
               onClick={() => setCanvasMode(canvasMode === 'editor' ? 'execution' : 'editor')}
             >
               <div className={cn("bg-card size-4 rounded-full shadow-sm transform transition-transform duration-200", canvasMode === 'execution' ? "translate-x-[18px]" : "translate-x-0")} />
             </div>
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
