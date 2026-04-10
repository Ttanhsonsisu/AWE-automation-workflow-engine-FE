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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';


import {
  ArrowLeft,
  Save,
  Play,
  CheckCircle2,
  Loader2,
  Edit3,
  Zap,
  Plus,
  Trash2,
  Pause,
  PlayCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateWorkflowDefinition, startWorkflow, suspendExecution, resumeExecution } from '@/services/workflowService';
import { toast } from 'sonner';

import { useWorkflowRealtime } from '../hooks/useWorkflowRealtime';

export const WorkflowTopbar: React.FC = () => {
  const navigate = useNavigate();
  const {
    workflowName,
    setWorkflowName,
    isSaved,
    isExecuting,
    workflowExecutionStatus,
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
    setWorkflowExecutionStatus,
    setCurrentInstanceId,
    currentInstanceId,
  } = useWorkflowStore();

  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = React.useState(false);

  // Realtime hook integration
  const { connectionStatus } = useWorkflowRealtime(currentInstanceId);

  // Run Workflow Dialog State
  const [isRunDialogOpen, setIsRunDialogOpen] = React.useState(false);
  const [jobName, setJobName] = React.useState('');
  const [hasInput, setHasInput] = React.useState(false);
  const [inputData, setInputData] = React.useState<{key: string, value: string}[]>([
    { key: 'winnerName', value: 'test 123' },
    { key: 'raceName', value: '123' }
  ]);

  const handleConfirmRun = () => {
    setIsRunDialogOpen(false);
    
    // Prepare dynamic input data if enabled
    const finalInputData = hasInput ? inputData.reduce((acc, curr) => {
      if (curr.key.trim()) acc[curr.key.trim()] = curr.value;
      return acc;
    }, {} as Record<string, any>) : undefined;

    // Optional: Log it or use it in the simulated execution
    console.log("Running Job:", jobName, "InputData:", finalInputData);

    handleTestExecution(finalInputData);
  };

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

  const handleTestExecution = async (customInputPayload?: Record<string, any>) => {
    if (isExecuting) return;
    
    const store = useWorkflowStore.getState();
    const { nodes, edges, updateNodeData, workflowId } = store;
    
    const startNode = nodes.find((n) => n.type === 'startNode');

    if (!startNode) {
      toast.warning("Thiếu Start Node", { description: "Không tìm thấy Start Node trên Canvas!" });
      return;
    }

    if (!workflowId) {
      toast.error("Lỗi Workflow", { description: "Không tìm thấy Workflow ID." });
      return;
    }

    clearExecutionLogs();
    setCurrentInstanceId(null);
    setCanvasMode('execution'); // Auto switch to execution mode
    setExecuting(true);
    setWorkflowExecutionStatus('running');

    // Reset all nodes to idle
    nodes.forEach(n => updateNodeData(n.id, { status: 'idle' }));

    try {
      const requestPayload = {
        DefinitionId: workflowId,
        JobName: jobName || workflowName || 'Untitled Workflow',
        InputData: customInputPayload,
        IsTest: true,
        StopAtStepId: null
      };
      
      const response = await startWorkflow(requestPayload);
      if (response?.success) {
        toast.success("Đã gửi yêu cầu chạy Workflow", {
          description: `Tracking ID: ${response.data.trackingId}`
        });

        // Set instance ID to trigger SignalR connection
        if (response.data.instanceId) {
          setCurrentInstanceId(response.data.instanceId);
        }
      } else {
        toast.error("Khởi chạy thất bại", { description: "Không thể bắt đầu Workflow." });
        setExecuting(false);
        return;
      }
    } catch (error: any) {
      toast.error("Lỗi khởi chạy", { description: error?.message || "Đã xảy ra lỗi khi gọi API Run Workflow." });
      setExecuting(false);
      return;
    }
  };

  const handleSuspend = async () => {
    if (!currentInstanceId) return;
    try {
      await suspendExecution(currentInstanceId);
      setExecuting(false);
      setWorkflowExecutionStatus('suspended');
      toast.success("Đã gửi lệnh Suspend", { description: "Workflow đang được tạm dừng."});
    } catch (error: any) {
      toast.error("Tạm dừng thất bại", { description: error?.response?.data?.message || error?.message || "Không thể suspend." });
    }
  };

  const handleResume = async () => {
    if (!currentInstanceId) return;
    try {
      await resumeExecution(currentInstanceId);
      setExecuting(true);
      setWorkflowExecutionStatus('running');
      toast.success("Đã gửi lệnh Resume", { description: "Workflow sẽ tiếp tục chạy."});
    } catch (error: any) {
      toast.error("Tiếp tục thất bại", { description: error?.response?.data?.message || error?.message || "Không thể resume." });
    }
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

        {/* CENTER: Execution Mode / SignalR Status Indicator */}
        <div className="flex-1 flex justify-center items-center">
            {canvasMode === 'execution' && (
               <div className={cn(
                 "flex items-center gap-2.5 px-4 py-1.5 rounded-full border shadow-sm text-sm font-bold animate-in fade-in zoom-in duration-300",
                 connectionStatus === 'Connected' 
                   ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                   : connectionStatus === 'Reconnecting' || connectionStatus === 'Disconnected' && currentInstanceId 
                     ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                     : "bg-primary/10 text-primary border-primary/20"
               )}>
                  <div className="relative flex size-2">
                    {connectionStatus === 'Connected' ? (
                      <>
                        <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></div>
                        <div className="relative inline-flex rounded-full size-2 bg-emerald-500"></div>
                      </>
                    ) : connectionStatus === 'Reconnecting' ? (
                      <>
                        <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></div>
                        <div className="relative inline-flex rounded-full size-2 bg-amber-500"></div>
                      </>
                    ) : (
                      <>
                        <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></div>
                        <div className="relative inline-flex rounded-full size-2 bg-primary"></div>
                      </>
                    )}
                  </div>
                  {connectionStatus === 'Connected' ? 'Live Execution' : connectionStatus === 'Reconnecting' ? 'Reconnecting...' : 'Execution Mode'}
               </div>
            )}
            
            {/* Global Execution Status Badge */}
            {canvasMode === 'execution' && workflowExecutionStatus && (
              <div className={cn(
                "ml-3 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider animate-in fade-in zoom-in duration-300 border-2 select-none",
                workflowExecutionStatus.toLowerCase() === 'completed' ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400" :
                workflowExecutionStatus.toLowerCase() === 'failed' ? "bg-destructive/15 text-destructive border-destructive/30" :
                workflowExecutionStatus.toLowerCase() === 'running' ? "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400" :
                workflowExecutionStatus.toLowerCase() === 'suspended' ? "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400" :
                "bg-secondary/50 text-muted-foreground border-border/50"
              )}>
                {workflowExecutionStatus}
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

          {/* Control Buttons Group */}
          <div className="flex items-center gap-2">
            {!isExecuting && workflowExecutionStatus?.toLowerCase() === 'suspended' && currentInstanceId && canvasMode === 'execution' ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleResume}
                    className="h-9 px-4 gap-2 bg-blue-500 hover:bg-blue-600 text-white shadow-[0_4px_14px_0_rgba(59,130,246,0.3)] rounded-lg transition-all hover:scale-105 active:scale-95 animate-in fade-in zoom-in"
                  >
                    <PlayCircle className="size-4 fill-white text-blue-500" />
                    <span className="font-semibold text-sm">Resume</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Tiếp tục chạy workflow bị tạm dừng</TooltipContent>
              </Tooltip>
            ) : isExecuting && workflowExecutionStatus?.toLowerCase() === 'running' && currentInstanceId && canvasMode === 'execution' ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSuspend}
                    className="h-9 px-4 gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-[0_4px_14px_0_rgba(245,158,11,0.3)] rounded-lg transition-all hover:scale-105 active:scale-95 animate-in fade-in zoom-in"
                  >
                    <Pause className="size-4 fill-white text-amber-500" />
                    <span className="font-semibold text-sm">Suspend</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Tạm dừng workflow đang chạy</TooltipContent>
              </Tooltip>
            ) : null}

            {/* Run Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    setJobName(workflowName || 'Untitled Workflow');
                    setIsRunDialogOpen(true);
                  }}
                  disabled={isExecuting}
                  className={cn(
                    "h-9 gap-2 shadow-[0_4px_14px_0_rgba(229,114,43,0.3)] rounded-lg transition-all hover:scale-105 active:scale-95",
                    isExecuting ? "px-3 bg-primary/80 cursor-not-allowed" : "px-5 bg-primary hover:bg-primary/90 text-primary-foreground"
                  )}
                >
                  {isExecuting ? (
                    <Loader2 className="size-4 animate-spin text-white" />
                  ) : (
                    <>
                      <Play className="size-4 fill-white text-white" />
                      <span className="font-semibold text-sm">Run</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isExecuting ? 'Workflow đang chạy...' : 'Khởi chạy luồng Workflow mới'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Run Workflow Dialog */}
      <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Run Workflow</DialogTitle>
            <DialogDescription>
              Configure the execution details before starting the workflow manually.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            <div className="space-y-2 text-left">
              <Label className="text-sm font-semibold">Job Name</Label>
              <Input 
                value={jobName} 
                onChange={(e) => setJobName(e.target.value)} 
                placeholder="Enter job name..." 
                className="bg-secondary/30 focus-visible:ring-primary/50"
              />
            </div>

            <div className="flex flex-col gap-4 p-4 rounded-xl border border-border/50 bg-secondary/10 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1 text-left">
                  <Label className="text-sm font-semibold cursor-pointer" htmlFor="config-input">Configure Input Data</Label>
                  <span className="text-xs text-muted-foreground mr-4">Provide dynamic execution variables that override default node inputs</span>
                </div>
                <Switch 
                  id="config-input" 
                  checked={hasInput} 
                  onCheckedChange={setHasInput} 
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {hasInput && (
                <div className="pt-2 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-3 text-left">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Variables</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setInputData([...inputData, { key: '', value: '' }])}
                      className="h-7 px-2.5 text-xs font-semibold text-primary/80 hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Plus className="size-3.5 mr-1" /> Add Field
                    </Button>
                  </div>
                  
                  {inputData.length > 0 ? (
                    <div className="max-h-[220px] overflow-y-auto pr-2 -mr-2 space-y-2.5 custom-scrollbar">
                      {inputData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 group">
                          <Input 
                            placeholder="Key (e.g. winnerName)" 
                            className="h-9 text-sm font-mono bg-background"
                            value={item.key}
                            onChange={(e) => {
                              const newData = [...inputData];
                              newData[idx].key = e.target.value;
                              setInputData(newData);
                            }}
                          />
                          <Input 
                            placeholder="Value" 
                            className="h-9 text-sm bg-background"
                            value={item.value}
                            onChange={(e) => {
                              const newData = [...inputData];
                              newData[idx].value = e.target.value;
                              setInputData(newData);
                            }}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="size-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                            onClick={() => setInputData(inputData.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 px-4 text-center border-2 border-dashed border-border/50 rounded-lg bg-background/50">
                      <p className="text-sm text-foreground/80 font-medium mb-1">No variables added</p>
                      <p className="text-xs text-muted-foreground">Click "Add Field" to inject custom variables.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setIsRunDialogOpen(false)} className="hover:bg-secondary">
              Cancel
            </Button>
            <Button onClick={handleConfirmRun} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-md transition-all active:scale-95">
              <Play className="size-4 mr-2 fill-current" />
              Run Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
