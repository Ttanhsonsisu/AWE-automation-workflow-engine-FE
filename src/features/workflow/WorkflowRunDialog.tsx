import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { startWorkflow } from '@/services/workflowService';
import { useWorkflowInputData } from '@/api/workflows';

interface WorkflowRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowDefinitionId: string | null;
  workflowName?: string;
  onRunSuccess?: () => void;
}

export const WorkflowRunDialog: React.FC<WorkflowRunDialogProps> = ({
  open,
  onOpenChange,
  workflowDefinitionId,
  workflowName,
  onRunSuccess
}) => {
  const [jobName, setJobName] = useState('');
  const [inputData, setInputData] = useState<{ key: string, value: string }[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  // Fetch saved global config to prepopulate Run inputs
  const { data: savedInputData, isLoading: isLoadingInput } = useWorkflowInputData(workflowDefinitionId);

  useEffect(() => {
    if (open) {
      setJobName(workflowName || 'Untitled Workflow');

      if (savedInputData && Object.keys(savedInputData).length > 0) {
        const pairs = Object.entries(savedInputData).map(([k, v]) => ({
          key: k,
          value: typeof v === 'object' ? JSON.stringify(v) : String(v)
        }));
        setInputData(pairs);
      } else {
        setInputData([{ key: '', value: '' }]);
      }
    }
  }, [open, savedInputData, workflowName]);

  const handleConfirmRun = async () => {
    if (!workflowDefinitionId) return;

    // Prepare JSON from Key-Value
    let finalInputData: Record<string, any> | undefined = undefined;

    const draft: Record<string, any> = {};
    let hasValid = false;

    for (const pair of inputData) {
      const k = pair.key.trim();
      if (k) {
        hasValid = true;
        let v: any = pair.value.trim();
        if (v === 'true') v = true;
        else if (v === 'false') v = false;
        else if (!isNaN(Number(v)) && v !== '') v = Number(v);
        else {
          try {
            if ((v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']'))) {
              v = JSON.parse(v);
            }
          } catch (e) { }
        }
        draft[k] = v;
      }
    }

    if (hasValid) {
      finalInputData = draft;
    }

    setIsExecuting(true);

    try {
      const requestPayload = {
        DefinitionId: workflowDefinitionId,
        JobName: jobName || workflowName || 'Untitled Workflow',
        InputData: finalInputData,
        IsTest: false,
        StopAtStepId: null
      };

      const response = await startWorkflow(requestPayload);
      if (response?.success) {
        toast.success("Khởi chạy Workflow thành công", {
          description: `Tracking ID: ${response.data.trackingId}`
        });
        if (onRunSuccess) onRunSuccess();
        onOpenChange(false);
      } else {
        toast.error("Khởi chạy thất bại", { description: "Không thể bắt đầu Workflow." });
      }
    } catch (error: any) {
      toast.error("Lỗi khởi chạy", { description: error?.message || "Đã xảy ra lỗi khi gọi API Run Workflow." });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-background border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Run Workflow</DialogTitle>
          <DialogDescription>
            Tạo một Execution Instance mới. Cấu hình bên dưới được tải từ cấu hình mặc định.
          </DialogDescription>
        </DialogHeader>

        {isLoadingInput ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
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
              <div className="flex items-center justify-between mb-1 text-left">
                <Label className="text-sm font-semibold">Input Variables (Optional)</Label>
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
                <div className="flex flex-col items-center justify-center py-4 px-4 text-center border-2 border-dashed border-border/50 rounded-lg bg-background/50">
                  <p className="text-sm text-foreground/80 font-medium mb-1">No variables added</p>
                  <p className="text-xs text-muted-foreground">Click "Add Field" to inject custom variables.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-secondary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRun}
            disabled={isExecuting || isLoadingInput}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-md transition-all active:scale-95"
          >
            {isExecuting ? (
              <Loader2 className="size-4 mr-2 animate-spin fill-current" />
            ) : (
              <Play className="size-4 mr-2 fill-current" />
            )}
            Run Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
