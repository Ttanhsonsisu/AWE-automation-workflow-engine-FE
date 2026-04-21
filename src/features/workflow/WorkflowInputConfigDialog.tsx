import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkflowInputData, useUpdateWorkflowInputData } from '@/api/workflows';
import { Loader2, Plus, Trash2, Settings, AlertTriangle, Code, List } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface WorkflowInputConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowDefinitionId: string | null;
  workflowName?: string;
}

interface KV {
  id: string;
  key: string;
  value: string;
}

export const WorkflowInputConfigDialog: React.FC<WorkflowInputConfigDialogProps> = ({ 
  open, 
  onOpenChange, 
  workflowDefinitionId,
  workflowName 
}) => {
  const { data: inputData, isLoading, error } = useWorkflowInputData(workflowDefinitionId);
  const updateMutation = useUpdateWorkflowInputData();

  const [mode, setMode] = useState<'kv' | 'json'>('kv');
  const [kvPairs, setKvPairs] = useState<KV[]>([]);
  const [jsonText, setJsonText] = useState('{\n  \n}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Sync data from API into local state
  useEffect(() => {
    if (open && inputData !== undefined) {
      if (inputData === null || Object.keys(inputData).length === 0) {
        setKvPairs([{ id: Math.random().toString(), key: '', value: '' }]);
        setJsonText('{\n  \n}');
      } else {
        const pairs = Object.entries(inputData).map(([k, v]) => ({
          id: Math.random().toString(),
          key: k,
          value: typeof v === 'object' ? JSON.stringify(v) : String(v)
        }));
        setKvPairs(pairs.length > 0 ? pairs : [{ id: Math.random().toString(), key: '', value: '' }]);
        setJsonText(JSON.stringify(inputData, null, 2));
      }
      setMode('kv');
      setJsonError(null);
    }
  }, [open, inputData]);

  const handleAddRow = () => {
    setKvPairs([...kvPairs, { id: Math.random().toString(), key: '', value: '' }]);
  };

  const handleRemoveRow = (id: string) => {
    const newPairs = kvPairs.filter(p => p.id !== id);
    if (newPairs.length === 0) {
      setKvPairs([{ id: Math.random().toString(), key: '', value: '' }]);
    } else {
      setKvPairs(newPairs);
    }
  };

  const handleKVChange = (id: string, field: 'key' | 'value', val: string) => {
    setKvPairs(kvPairs.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const handleSave = () => {
    if (!workflowDefinitionId) return;

    let payload: Record<string, any> | null = null;
    
    if (mode === 'kv') {
      const draft: Record<string, any> = {};
      let hasValid = false;
      for (const pair of kvPairs) {
        const k = pair.key.trim();
        if (k) {
          hasValid = true;
          // Try parse boolean/numbers/json if it seems like it, otherwise string
          let v: any = pair.value.trim();
          if (v === 'true') v = true;
          else if (v === 'false') v = false;
          else if (!isNaN(Number(v)) && v !== '') v = Number(v);
          else {
            try {
              if ((v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']'))) {
                v = JSON.parse(v);
              }
            } catch (e) {
              // keep as string
            }
          }
          draft[k] = v;
        }
      }
      payload = hasValid ? draft : null;
    } else {
      // json mode
      if (!jsonText.trim() || jsonText.trim() === '{}') {
        payload = null;
      } else {
        try {
          payload = JSON.parse(jsonText);
        } catch (err: any) {
          setJsonError(err.message || 'Invalid JSON format');
          return;
        }
      }
    }

    updateMutation.mutate({ id: workflowDefinitionId, inputData: payload }, {
      onSuccess: () => {
        toast.success('Configuration saved successfully');
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast.error('Failed to save configuration', {
          description: err.message || 'An unexpected error occurred.',
        });
      }
    });
  };

  const toggleMode = () => {
    if (mode === 'kv') {
      // convert kv to json
      const draft: Record<string, any> = {};
      for (const pair of kvPairs) {
        if (pair.key.trim()) {
          draft[pair.key.trim()] = pair.value.trim();
        }
      }
      if (Object.keys(draft).length > 0) {
        setJsonText(JSON.stringify(draft, null, 2));
      } else {
        setJsonText('{\n  \n}');
      }
      setMode('json');
    } else {
      // convert json to kv
      try {
        const obj = JSON.parse(jsonText || '{}');
        const pairs = Object.entries(obj).map(([k, v]) => ({
          id: Math.random().toString(),
          key: k,
          value: typeof v === 'object' ? JSON.stringify(v) : String(v)
        }));
        setKvPairs(pairs.length > 0 ? pairs : [{ id: Math.random().toString(), key: '', value: '' }]);
        setJsonError(null);
        setMode('kv');
      } catch (err: any) {
        setJsonError('Please fix JSON compilation errors before switching to List mode.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="bg-background border-border shadow-xl"
        style={{ maxWidth: '800px', width: '90vw' }}
      >
        <DialogHeader className="gap-1.5 pb-2">
          <DialogTitle className="flex items-center justify-between text-xl font-bold">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings className="size-4 text-primary" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span>Input Variables</span>
                {workflowName && <span className="text-[11px] font-medium text-muted-foreground">For: {workflowName}</span>}
              </div>
            </div>
            
            <Button 
               variant="secondary" 
               size="sm" 
               onClick={toggleMode}
               className="text-xs h-7 px-2.5 bg-muted hover:bg-muted/80 mr-4"
            >
              {mode === 'kv' ? (
                <><Code className="size-3 mr-1.5"/> Raw JSON</>
              ) : (
                <><List className="size-3 mr-1.5"/> Variables List</>
              )}
            </Button>
          </DialogTitle>
          <DialogDescription className="text-sm pt-2">
            Configure dynamic parameters passed uniquely to this workflow definition every time it starts.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground flex-col gap-3">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span>Loading...</span>
          </div>
        ) : error ? (
           <div className="h-48 flex items-center justify-center text-destructive flex-col gap-3 bg-destructive/5 rounded-lg border border-destructive/20 mt-2">
             <AlertTriangle className="size-8" />
             <span>Failed to load workflow data.</span>
           </div>
        ) : (
          <div className="py-2">
            {mode === 'kv' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_2fr_36px] gap-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div>Variable Name</div>
                  <div>Value</div>
                  <div></div>
                </div>
                
                <ScrollArea className="w-full max-h-[60vh] pr-4">
                  <div className="flex flex-col gap-3">
                    {kvPairs.map((pair, idx) => (
                      <div key={pair.id} className="grid grid-cols-[1fr_2fr_36px] gap-3 items-start animate-fadeIn">
                        <Input 
                          placeholder="e.g. winnerName"
                          value={pair.key}
                          onChange={e => handleKVChange(pair.id, 'key', e.target.value)}
                          className="font-mono text-sm shadow-sm h-10 transition-all focus-visible:ring-primary/20"
                        />
                        <Input 
                          placeholder="e.g. 123123 update"
                          value={pair.value}
                          onChange={e => handleKVChange(pair.id, 'value', e.target.value)}
                          className="font-mono text-sm shadow-sm h-10 transition-all focus-visible:ring-primary/20"
                        />
                        <div className="flex items-center h-10 w-full">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-8 transition-colors shrink-0"
                            onClick={() => handleRemoveRow(pair.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddRow}
                  className="w-full h-10 border-dashed border-border/60 hover:bg-muted/50 hover:border-primary/50 transition-all text-muted-foreground hover:text-foreground gap-2"
                >
                  <Plus className="size-4" />
                  Add Variable Variable
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Textarea 
                  value={jsonText}
                  onChange={e => {
                    setJsonText(e.target.value);
                    setJsonError(null);
                  }}
                  className={cn(
                    "min-h-[200px] font-mono text-sm bg-muted/20 border-border shadow-inner resize-y",
                    jsonError && "border-destructive/50 ring-1 ring-destructive/30"
                  )}
                  placeholder="{\n  // Enter JSON data here\n}"
                  spellCheck={false}
                />
                {jsonError && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive mt-1 font-medium bg-destructive/10 px-2 py-1.5 rounded">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    {jsonError}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-2 border-t border-border/40 gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending || isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading}
            className="px-6 gap-2"
          >
            {updateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Save configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
