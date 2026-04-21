import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  FolderTree,
  Braces,
  Hash,
  Type as TypeIcon,
  List,
  ToggleLeft,
  CircleDot,
  RefreshCw,
  Play,
  Loader2,
  AlertCircle,
  Folder,
  FileJson,
  Code2,
  TreePine,
} from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { startWorkflow, getWorkflowContext } from '@/services/workflowService';
import { toast } from 'sonner';
import { useWorkflowInputData } from '@/api/workflows';
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
import { Plus, Trash2 } from 'lucide-react';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SIDEBAR_WIDTH = 360;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type ViewMode = 'tree' | 'json';

interface OutputMappingSidebarProps {
  nodeId: string;
  isOpen: boolean;
  onToggle: () => void;
}

interface DataTreeNode {
  key: string;
  label: string;
  type: string;
  mappingPath: string;
  value?: unknown;
  children?: DataTreeNode[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mock execution data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MOCK_EXECUTION_DATA = {
  Meta: {
    JobName: 'Chaos Monkey Test234234 05',
    StartedAt: '2026-04-01T13:59:33.4702183Z',
    CorrelationId: 'e2aa983d-3acd-4c77-af1c-38afe5f55680',
  },
  Steps: {
    Ghi_Log_He_Thong_431313: {
      Output: {
        LogStatus: 'Written to Console',
      },
    },
    Ghi_Log_He_Thong_435241: {
      Output: {
        LogStatus: 'Written to Console',
      },
    },
    Xu_Ly_Van_Ban_441258: {
      Output: {
        Result: 'HELLO WORLD',
        OriginalText: 'hello world',
        Operation: 'UPPER',
      },
    },
    Delay_446982: {
      Output: {
        DelayedMs: 2000,
        CompletedAt: '2026-04-01T14:00:01.123Z',
      },
    },
  },
  Inputs: {
    stock: 5,
    message: 'Hello from workflow',
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectType(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'string': return TypeIcon;
    case 'number': return Hash;
    case 'boolean': return ToggleLeft;
    case 'array': return List;
    case 'object': return Braces;
    default: return CircleDot;
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'string': return 'text-emerald-400';
    case 'number': return 'text-blue-400';
    case 'boolean': return 'text-amber-400';
    case 'array': return 'text-purple-400';
    case 'object': return 'text-orange-400';
    default: return 'text-muted-foreground';
  }
}

function dataToTree(data: unknown, parentMappingPath: string): DataTreeNode[] {
  if (data === null || data === undefined) return [];
  if (typeof data !== 'object') return [];

  if (Array.isArray(data)) {
    return data.map((item, index) => {
      const type = detectType(item);
      const mappingPath = `${parentMappingPath}[${index}]`;
      const node: DataTreeNode = { key: String(index), label: `[${index}]`, type, mappingPath };
      if (type === 'object' || type === 'array') {
        node.children = dataToTree(item, mappingPath);
      } else {
        node.value = item;
      }
      return node;
    });
  }

  return Object.entries(data as Record<string, unknown>).map(([key, value]) => {
    const type = detectType(value);
    const mappingPath = parentMappingPath ? `${parentMappingPath}.${key}` : key;
    const node: DataTreeNode = { key, label: key, type, mappingPath };
    if (type === 'object' || type === 'array') {
      node.children = dataToTree(value, mappingPath);
    } else {
      node.value = value;
    }
    return node;
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// JSON Syntax Highlighter Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const JsonHighlighter: React.FC<{ data: unknown }> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const jsonString = useMemo(() => JSON.stringify(data, null, 2), [data]);

  const handleCopyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* fallback */
    }
  }, [jsonString]);

  // Simple syntax highlighting via regex
  const highlightedLines = useMemo(() => {
    return jsonString.split('\n').map((line, i) => {
      // Highlight keys
      let html = line.replace(
        /^(\s*)"([^"]+)":/,
        '$1<span class="text-sky-400">"$2"</span>:'
      );
      // Highlight string values
      html = html.replace(
        /:\s*"([^"]*)"(,?)$/,
        ': <span class="text-emerald-400">"$1"</span>$2'
      );
      // Highlight numbers
      html = html.replace(
        /:\s*(\d+\.?\d*)(,?)$/,
        ': <span class="text-blue-400">$1</span>$2'
      );
      // Highlight booleans
      html = html.replace(
        /:\s*(true|false)(,?)$/,
        ': <span class="text-amber-400">$1</span>$2'
      );
      // Highlight null
      html = html.replace(
        /:\s*(null)(,?)$/,
        ': <span class="text-red-400/60">$1</span>$2'
      );
      return { key: i, html };
    });
  }, [jsonString]);

  return (
    <div className="relative group/json">
      {/* Copy all button */}
      <div className="sticky top-0 z-10 flex justify-end px-2 py-1.5 bg-[#0d1117]/90 backdrop-blur-sm border-b border-white/5">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyAll}
          className={cn(
            'h-6 gap-1 px-2 text-[10px] rounded-md transition-all',
            copied
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-muted-foreground/50 hover:text-foreground hover:bg-white/5'
          )}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? 'Copied!' : 'Copy JSON'}
        </Button>
      </div>

      <div className="px-3 pb-3 bg-[#0d1117] rounded-b-lg">
        <pre className="text-[11px] leading-[1.6] font-mono overflow-x-auto">
          <code>
            {highlightedLines.map(({ key, html }) => (
              <div
                key={key}
                className="hover:bg-white/[0.03] px-1 -mx-1 rounded"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tree Node Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TreeNodeItem: React.FC<{
  node: DataTreeNode;
  depth: number;
}> = ({ node, depth }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [copied, setCopied] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = !hasChildren;
  const TypeIconComp = getTypeIcon(node.type);
  const typeColor = getTypeColor(node.type);

  const mappingString = `{{${node.mappingPath}}}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mappingString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = mappingString;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [mappingString]);

  // Format value: show full value, wrapped
  const displayValue = useMemo(() => {
    if (node.value === null || node.value === undefined) return 'null';
    if (node.type === 'string') return `"${String(node.value)}"`;
    return String(node.value);
  }, [node.value, node.type]);

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 py-[3px] px-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-default',
          'min-h-[28px]'
        )}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="size-4 flex items-center justify-center shrink-0 text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}

        {/* Type icon */}
        <TypeIconComp className={cn('size-3 shrink-0', typeColor)} />

        {/* Label */}
        <span className="text-[11.5px] font-medium text-foreground/90 shrink-0 select-text">
          {node.label}
        </span>

        {/* Separator */}
        {isLeaf && <span className="text-muted-foreground/30 text-[10px] mx-0.5">:</span>}

        {/* Full value display for leaf nodes */}
        {isLeaf && node.value !== undefined && (
          <span
            className={cn(
              'text-[10.5px] font-mono truncate select-text',
              node.type === 'string' && 'text-emerald-400/70',
              node.type === 'number' && 'text-blue-400/70',
              node.type === 'boolean' && 'text-amber-400/70',
              node.type === 'null' && 'text-red-400/50',
            )}
            title={displayValue}
          >
            {displayValue}
          </span>
        )}

        {/* Children count badge */}
        {hasChildren && (
          <span className="text-[9px] text-muted-foreground/40 font-mono ml-1">
            {node.type === 'object' ? `{${node.children!.length}}` : `[${node.children!.length}]`}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Copy button */}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleCopy}
                className={cn(
                  'size-5 flex items-center justify-center rounded shrink-0 transition-all',
                  copied
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary'
                )}
              >
                {copied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[10px] max-w-[380px] font-mono break-all">
              {copied ? 'Đã copy!' : mappingString}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeItem key={child.key} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step Section (collapsible step within the Steps tree)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const StepOutputSection: React.FC<{
  stepId: string;
  stepData: Record<string, unknown>;
  defaultOpen?: boolean;
}> = ({ stepId, stepData, defaultOpen = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);

  const outputData = (stepData as { Output?: Record<string, unknown> })?.Output;
  const outputTree = useMemo(
    () => dataToTree(outputData || {}, `Steps.${stepId}.Output`),
    [outputData, stepId]
  );

  return (
    <div className="border-b border-border/20 last:border-b-0 ml-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-muted/30 transition-colors rounded-md"
      >
        <div className="size-3.5 flex items-center justify-center text-muted-foreground/50">
          {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </div>
        <Folder className="size-3 text-primary/60 shrink-0" />
        <span className="text-[11px] font-medium text-foreground/80 flex-1 text-left truncate font-mono">
          {stepId}
        </span>
        {outputTree.length > 0 && (
          <span className="text-[8px] text-muted-foreground/40 bg-muted/40 rounded px-1 py-0.5 font-mono shrink-0">
            {outputTree.length}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="pb-1 pl-1">
          {outputTree.length > 0 ? (
            outputTree.map((node) => (
              <TreeNodeItem key={node.key} node={node} depth={2} />
            ))
          ) : (
            <p className="text-[10px] text-muted-foreground/40 italic px-6 py-1">
              Không có output
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section Group (Meta / Inputs)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SectionGroup: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: DataTreeNode[];
  defaultOpen?: boolean;
  badge?: string;
}> = ({ title, icon, children, defaultOpen = true, badge }) => {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);

  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors"
      >
        <div className="size-4 flex items-center justify-center text-muted-foreground/60">
          {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </div>
        {icon}
        <span className="text-[12px] font-semibold text-foreground/90 flex-1 text-left truncate">
          {title}
        </span>
        {badge && (
          <span className="text-[9px] text-muted-foreground/50 bg-muted/50 rounded-full px-1.5 py-0.5 font-mono shrink-0">
            {badge}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="pb-1.5 px-0.5">
          {children.length > 0 ? (
            children.map((node) => (
              <TreeNodeItem key={node.key} node={node} depth={1} />
            ))
          ) : (
            <p className="text-[10px] text-muted-foreground/40 italic px-6 py-1.5">
              Không có dữ liệu
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Sidebar Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export { SIDEBAR_WIDTH };

export const OutputMappingSidebar: React.FC<OutputMappingSidebarProps> = ({
  nodeId,
  isOpen,
  onToggle,
}) => {
  const { workflowId, workflowName, workflowExecutionStatus, setCurrentInstanceId, currentInstanceId, setExecuting, clearExecutionLogs, setWorkflowExecutionStatus, nodes } = useWorkflowStore();
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [executionData, setExecutionData] = useState<Record<string, unknown> | null>(null);

  // Run Workflow Dialog State
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [jobName, setJobName] = useState(workflowName || 'Untitled Workflow');
  const [hasInput, setHasInput] = useState(false);
  const [inputData, setInputData] = useState<{key: string, value: string}[]>([]);
  const { data: savedInputData, isLoading: isLoadingInputData } = useWorkflowInputData(workflowId || null);

  React.useEffect(() => {
    if (!isRunDialogOpen) return;

    setJobName(workflowName || 'Untitled Workflow');

    if (isLoadingInputData) return;

    if (savedInputData && Object.keys(savedInputData).length > 0) {
      const pairs = Object.entries(savedInputData).map(([key, value]) => ({
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      }));
      setInputData(pairs);
      setHasInput(true);
      return;
    }

    setInputData([]);
    setHasInput(false);
  }, [isRunDialogOpen, workflowName, savedInputData, isLoadingInputData]);

  const metaTree = useMemo(
    () => executionData?.Meta ? dataToTree(executionData.Meta, 'Meta') : [],
    [executionData]
  );

  const inputsTree = useMemo(
    () => executionData?.Inputs ? dataToTree(executionData.Inputs, 'Inputs') : [],
    [executionData]
  );

  const stepsData = (executionData?.Steps || {}) as Record<string, Record<string, unknown>>;
  const stepIds = Object.keys(stepsData);

  // Auto-fetch context when workflow finishes execution and we started it
  React.useEffect(() => {
    if (isExecuting && currentInstanceId && workflowExecutionStatus) {
      const statusLower = workflowExecutionStatus.toLowerCase();
      if (['suspended', 'completed', 'failed'].includes(statusLower)) {
        setIsExecuting(false);
        setIsLoading(true);
        getWorkflowContext(currentInstanceId)
          .then(res => {
            if (res.success) {
              setExecutionData(res.data);
              setHasData(true);
            }
          })
          .catch(err => {
            toast.error("Lỗi tải data", { description: "Không thể lấy output context" });
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }
  }, [workflowExecutionStatus, isExecuting, currentInstanceId]);

  const handleReload = useCallback(async () => {
    if (!currentInstanceId) return;
    setIsLoading(true);
    try {
      const res = await getWorkflowContext(currentInstanceId);
      if (res.success) {
        setExecutionData(res.data);
        setHasData(true);
      }
    } catch {
       toast.error("Lỗi tải data", { description: "Không thể lấy output context" });
    } finally {
      setIsLoading(false);
    }
  }, [currentInstanceId]);

  const handleConfirmRun = async () => {
    if (!workflowId) {
      toast.error("Lỗi Workflow", { description: "Không tìm thấy Workflow ID." });
      return;
    }

    setIsRunDialogOpen(false);
    
    // Prepare dynamic input data if enabled
    const finalInputData = hasInput ? inputData.reduce((acc, curr) => {
      const key = curr.key.trim();
      if (!key) return acc;

      let value: any = curr.value.trim();
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(Number(value)) && value !== '') value = Number(value);
      else {
        try {
          if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
            value = JSON.parse(value);
          }
        } catch {
          // Keep raw string when JSON parsing fails.
        }
      }

      acc[key] = value;
      return acc;
    }, {} as Record<string, any>) : undefined;

    clearExecutionLogs();
    setCurrentInstanceId(null);
    setExecuting(true);
    setWorkflowExecutionStatus('running');
    setIsExecuting(true); // local loading state

    // Determine actual stepId if configured, fallback to internal nodeId
    const currentNode = nodes.find(n => n.id === nodeId);
    const stepIdToStop = (currentNode?.data?.config?.stepId as string) || nodeId;

    try {
      const requestPayload = {
        DefinitionId: workflowId,
        JobName: jobName || workflowName || 'Untitled Workflow',
        InputData: finalInputData,
        IsTest: true,
        StopAtStepId: stepIdToStop
      };
      
      const response = await startWorkflow(requestPayload);
      if (response?.success) {
        toast.success("Đã chạy thử luồng", {
          description: `Dừng tại node: ${stepIdToStop}`
        });

        // Trigger SignalR connection via top bar context
        if (response.data.instanceId) {
          setCurrentInstanceId(response.data.instanceId);
        }
      } else {
        toast.error("Khởi chạy thất bại", { description: "Không thể bắt đầu Workflow." });
        setIsExecuting(false);
        setExecuting(false);
      }
    } catch (error: any) {
      toast.error("Lỗi khởi chạy", { description: error?.message || "Đã xảy ra lỗi khi gọi API Run Workflow." });
      setIsExecuting(false);
      setExecuting(false);
    }
  };

  return (
    <>
      {/* Toggle button */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className={cn(
                'absolute top-14 z-30 size-8 p-0 rounded-lg transition-all duration-300',
                'bg-background/80 backdrop-blur-sm border border-border/40 shadow-sm',
                'hover:bg-primary/10 hover:border-primary/30 hover:text-primary',
                isOpen ? `left-[${SIDEBAR_WIDTH - 4}px]` : 'left-2'
              )}
              style={isOpen ? { left: `${SIDEBAR_WIDTH - 4}px` } : undefined}
            >
              {isOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {isOpen ? 'Ẩn Output Mapping' : 'Hiện Output Mapping'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Sidebar panel */}
      <div
        className={cn(
          'absolute top-0 left-0 bottom-0 z-20 flex flex-col',
          'bg-background/95 backdrop-blur-xl border-r border-border/50',
          'transition-all duration-300 ease-in-out',
          isOpen ? 'opacity-100' : 'w-0 opacity-0 overflow-hidden'
        )}
        style={isOpen ? { width: `${SIDEBAR_WIDTH}px` } : undefined}
      >
        {/* ──── Header ──── */}
        <div className="shrink-0 px-3.5 pt-3.5 pb-2.5 border-b border-border/30">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-3">
            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderTree className="size-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[13px] font-bold text-foreground leading-none">
                Output Mapping
              </h4>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Dữ liệu thực thi các bước trước
              </p>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRunDialogOpen(true)}
              disabled={isExecuting || isLoading}
              className="h-7 flex-1 gap-1.5 text-[11px] rounded-md border-border/40 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all"
            >
              {isExecuting ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
              {isExecuting ? 'Đang chạy...' : 'Chạy trước đó'}
            </Button>

            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReload}
                    disabled={isLoading || isExecuting}
                    className="h-7 w-7 p-0 rounded-md border-border/40 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all shrink-0"
                  >
                    <RefreshCw className={cn('size-3', isLoading && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px]">
                  Tải lại dữ liệu
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center mt-2.5 bg-muted/30 rounded-lg p-0.5 border border-border/30">
            <button
              onClick={() => setViewMode('tree')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-[11px] font-medium transition-all',
                viewMode === 'tree'
                  ? 'bg-background text-foreground shadow-sm border border-border/40'
                  : 'text-muted-foreground/60 hover:text-muted-foreground'
              )}
            >
              <TreePine className="size-3" />
              Tree
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-[11px] font-medium transition-all',
                viewMode === 'json'
                  ? 'bg-background text-foreground shadow-sm border border-border/40'
                  : 'text-muted-foreground/60 hover:text-muted-foreground'
              )}
            >
              <Code2 className="size-3" />
              JSON
            </button>
          </div>
        </div>

        {/* ──── Content ──── */}
        <ScrollArea className="flex-1 min-h-0">
          {/* Loading state */}
          {(isLoading || isExecuting) && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="relative">
                <div className="size-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {isExecuting ? <Play className="size-4 text-primary/40" /> : <RefreshCw className="size-4 text-primary/40" />}
                </div>
              </div>
              <p className="text-[11px] font-medium text-foreground/70 mt-3">
                {isExecuting ? 'Đang thực thi các bước trước...' : 'Đang tải dữ liệu...'}
              </p>
            </div>
          )}

          {/* ──── Tree View ──── */}
          {!isLoading && !isExecuting && hasData && executionData && viewMode === 'tree' && (
            <div>
              {/* Meta */}
              <SectionGroup
                title="Meta"
                icon={<FileJson className="size-3.5 text-cyan-400/70 shrink-0" />}
                defaultOpen={false}
                badge={String(metaTree.length)}
              >
                {metaTree}
              </SectionGroup>

              {/* Inputs */}
              <SectionGroup
                title="Inputs"
                icon={<Braces className="size-3.5 text-amber-400/70 shrink-0" />}
                defaultOpen={false}
                badge={String(inputsTree.length)}
              >
                {inputsTree}
              </SectionGroup>

              {/* Steps */}
              <div className="border-b border-border/30">
                <div className="flex items-center gap-2 px-3 py-2">
                  <Folder className="size-3.5 text-primary/70 shrink-0" />
                  <span className="text-[12px] font-semibold text-foreground/90 flex-1">Steps</span>
                  <span className="text-[9px] text-muted-foreground/50 bg-muted/50 rounded-full px-1.5 py-0.5 font-mono">
                    {stepIds.length}
                  </span>
                </div>
                {stepIds.length > 0 ? (
                  <div className="pb-1">
                    {stepIds.map((sid, i) => (
                      <StepOutputSection key={sid} stepId={sid} stepData={stepsData[sid]} defaultOpen={i < 2} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground/40 italic px-6 py-2">Không có step nào</p>
                )}
              </div>
            </div>
          )}

          {/* ──── JSON View ──── */}
          {!isLoading && !isExecuting && hasData && executionData && viewMode === 'json' && (
            <JsonHighlighter data={executionData} />
          )}

          {/* No data state */}
          {!isLoading && !isExecuting && !hasData && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="size-10 rounded-full bg-muted/30 flex items-center justify-center mb-3 border border-border/30">
                <AlertCircle className="size-5 text-muted-foreground/30" />
              </div>
              <p className="text-[12px] font-medium text-muted-foreground/70">
                Chưa có dữ liệu thực thi
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-1 max-w-[200px]">
                Bấm "Chạy trước đó" để thực thi các node phía trước và lấy output.
              </p>
            </div>
          )}
        </ScrollArea>

        {/* ──── Footer ──── */}
        <div className="shrink-0 px-3 py-2 border-t border-border/30 bg-muted/10">
          <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5">
            <Copy className="size-3 shrink-0" />
            Hover rồi bấm <kbd className="px-1 py-0.5 bg-muted/60 rounded text-[9px] font-mono border border-border/30">Copy</kbd> để lấy mapping
          </p>
        </div>
      </div>

      {/* Run Workflow Dialog */}
      <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Chạy từ đầu đến đây</DialogTitle>
            <DialogDescription>
              Cấu hình các tham số và biến truyền vào trước khi chạy luồng để kiểm tra kết quả trả ra.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            <div className="space-y-2 text-left">
              <Label className="text-sm font-semibold">Tên phiên chạy (Job Name)</Label>
              <Input 
                value={jobName} 
                onChange={(e) => setJobName(e.target.value)} 
                placeholder="Nhập tên phiên chạy..." 
                className="bg-secondary/30 focus-visible:ring-primary/50"
              />
            </div>

            <div className="flex flex-col gap-4 p-4 rounded-xl border border-border/50 bg-secondary/10 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1 text-left">
                  <Label className="text-sm font-semibold cursor-pointer" htmlFor="config-input">Cấu hình tham số Input</Label>
                  <span className="text-xs text-muted-foreground mr-4">Truyền biến động vào payload cho workflow nhận khi chạy</span>
                </div>
                <Switch 
                  id="config-input" 
                  checked={hasInput} 
                  onCheckedChange={setHasInput} 
                  disabled={isLoadingInputData}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {hasInput && (
                <div className="pt-2 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                  {isLoadingInputData ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Đang tải Input Variables...
                    </div>
                  ) : (
                    <>
                  <div className="flex items-center justify-between mb-3 text-left">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Biến Input</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setInputData([...inputData, { key: '', value: '' }])}
                      className="h-7 px-2.5 text-xs font-semibold text-primary/80 hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Plus className="size-3.5 mr-1" /> Thêm biến
                    </Button>
                  </div>
                  
                  {inputData.length > 0 ? (
                    <div className="max-h-[220px] overflow-y-auto pr-2 -mr-2 space-y-2.5 custom-scrollbar">
                      {inputData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 group">
                          <Input 
                            placeholder="Key" 
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
                      <p className="text-sm text-foreground/80 font-medium mb-1">Chưa có biến nào</p>
                      <p className="text-xs text-muted-foreground">Bấm "Thêm biến" để bắt đầu cấu hình.</p>
                    </div>
                  )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setIsRunDialogOpen(false)} className="hover:bg-secondary">
              Hủy
            </Button>
            <Button
              onClick={handleConfirmRun}
              disabled={isLoadingInputData}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-md transition-all active:scale-95"
            >
              <Play className="size-4 mr-2 fill-current" />
              Bắt đầu chạy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
