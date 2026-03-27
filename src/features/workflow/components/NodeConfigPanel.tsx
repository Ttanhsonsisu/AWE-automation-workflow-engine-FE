import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkflowStore } from '@/stores/workflowStore';
import { usePluginStore } from '@/stores/pluginStore';
import { catalogToNodeCategories, getNodeDefinition } from '../nodeDefinitions';
import { cn } from '@/lib/utils';
import {
  Save,
  Terminal,
  Settings2,
  ChevronRight,
  Info,
  Braces,
  ArrowRightLeft,
  Package,
  Cpu,
  Hash,
  Type as TypeIcon,
  List,
  ToggleLeft,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import type { JsonSchema, JsonSchemaProperty } from '@/types/plugin';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Props
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface NodeConfigPanelProps {
  nodeId: string | null;
  onClose: () => void;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Icon resolver for schema property types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function getPropertyIcon(prop: JsonSchemaProperty) {
  if (prop.enum) return List;
  if (prop.format === 'email') return Mail;
  if (prop.type === 'integer' || prop.type === 'number') return Hash;
  if (prop.type === 'boolean') return ToggleLeft;
  if (prop.type === 'array') return List;
  if (prop.type === 'object') return Braces;
  return TypeIcon;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dynamic schema field renderer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface SchemaFieldProps {
  name: string;
  prop: JsonSchemaProperty;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
  isRequired?: boolean;
}

const SchemaField: React.FC<SchemaFieldProps> = ({ name, prop, value, onChange, isRequired }) => {
  const PropIcon = getPropertyIcon(prop);

  // ── Enum → Select ──
  if (prop.enum) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <PropIcon className="size-3.5 text-muted-foreground" />
          <Label className="text-sm font-medium">
            {prop.title || name}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
        </div>
        <Select
          value={(value as string) || (prop.default as string) || ''}
          onValueChange={(v) => onChange(name, v)}
        >
          <SelectTrigger className="bg-card/80 border-border/60 hover:border-border transition-colors h-10">
            <SelectValue placeholder={`Chọn ${prop.title || name}...`} />
          </SelectTrigger>
          <SelectContent>
            {prop.enum.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {prop.description && (
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{prop.description}</p>
        )}
      </div>
    );
  }

  // ── Boolean → Switch ──
  if (prop.type === 'boolean') {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-4">
        <div className="flex items-center gap-3">
          <PropIcon className="size-4 text-muted-foreground" />
          <div>
            <Label className="text-sm font-medium">
              {prop.title || name}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {prop.description && (
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{prop.description}</p>
            )}
          </div>
        </div>
        <Switch
          checked={value as boolean ?? (prop.default as boolean) ?? false}
          onCheckedChange={(v) => onChange(name, v)}
        />
      </div>
    );
  }

  // ── Integer / Number → Number Input ──
  if (prop.type === 'integer' || prop.type === 'number') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <PropIcon className="size-3.5 text-muted-foreground" />
          <Label className="text-sm font-medium">
            {prop.title || name}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
        </div>
        <Input
          type="number"
          value={(value as number) ?? (prop.default as number) ?? ''}
          onChange={(e) => onChange(name, prop.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
          min={prop.minimum}
          max={prop.maximum}
          placeholder={prop.default !== undefined ? `Mặc định: ${prop.default}` : `Nhập ${prop.title || name}...`}
          className="bg-card/80 border-border/60 hover:border-border transition-colors h-10 font-mono"
        />
        {prop.description && (
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{prop.description}</p>
        )}
        {(prop.minimum !== undefined || prop.maximum !== undefined) && (
          <p className="text-[10px] text-muted-foreground/50 font-mono">
            {prop.minimum !== undefined && `Min: ${prop.minimum}`}
            {prop.minimum !== undefined && prop.maximum !== undefined && ' · '}
            {prop.maximum !== undefined && `Max: ${prop.maximum}`}
          </p>
        )}
      </div>
    );
  }

  // ── Array (multi-select like checkboxes) ──
  if (prop.type === 'array' && prop.items?.enum) {
    const currentValues = (value as string[]) || [];
    const toggleValue = (opt: string) => {
      const newValues = currentValues.includes(opt)
        ? currentValues.filter((v) => v !== opt)
        : [...currentValues, opt];
      onChange(name, newValues);
    };

    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <PropIcon className="size-3.5 text-muted-foreground" />
          <Label className="text-sm font-medium">
            {prop.title || name}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
        </div>
        <div className="flex flex-wrap gap-2">
          {prop.items.enum.map((opt) => {
            const selected = currentValues.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleValue(opt)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200',
                  selected
                    ? 'bg-primary/10 border-primary/40 text-primary shadow-sm'
                    : 'bg-card/60 border-border/50 text-muted-foreground hover:border-border hover:bg-card'
                )}
              >
                <div className={cn('size-3.5 rounded-sm border flex items-center justify-center transition-all',
                  selected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                )}>
                  {selected && <CheckCircle2 className="size-2.5 text-primary-foreground" />}
                </div>
                {opt}
              </button>
            );
          })}
        </div>
        {prop.description && (
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{prop.description}</p>
        )}
      </div>
    );
  }

  // ── String (default) ──
  const isLongText = prop.description?.includes('{{') || name.toLowerCase().includes('message') || name.toLowerCase().includes('body') || name.toLowerCase().includes('content');

  if (isLongText) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <PropIcon className="size-3.5 text-muted-foreground" />
          <Label className="text-sm font-medium">
            {prop.title || name}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
        </div>
        <Textarea
          value={(value as string) ?? (prop.default as string) ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={prop.description || `Nhập ${prop.title || name}...`}
          className="bg-card/80 border-border/60 hover:border-border transition-colors min-h-[100px] resize-none font-mono text-xs"
        />
        {prop.description && (
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{prop.description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <PropIcon className="size-3.5 text-muted-foreground" />
        <Label className="text-sm font-medium">
          {prop.title || name}
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
      </div>
      <Input
        type={prop.format === 'email' ? 'email' : 'text'}
        value={(value as string) ?? (prop.default as string) ?? ''}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={prop.description || `Nhập ${prop.title || name}...`}
        className="bg-card/80 border-border/60 hover:border-border transition-colors h-10"
      />
      {prop.description && (
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{prop.description}</p>
      )}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Output Schema Preview
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const OutputSchemaPreview: React.FC<{ schema: JsonSchema }> = ({ schema }) => {
  if (!schema?.properties || Object.keys(schema.properties).length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-6 text-center">
        <Braces className="size-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground/60">Không có output schema</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(schema.properties).map(([key, prop]) => {
        const PropIcon = getPropertyIcon(prop);
        return (
          <div
            key={key}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card/60 border border-border/40"
          >
            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <PropIcon className="size-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-medium text-foreground">{key}</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono border-muted-foreground/20 text-muted-foreground">
                  {prop.type}
                </Badge>
              </div>
              {prop.title && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{prop.title}</p>
              )}
            </div>
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-accent transition-colors"
              title={`Copy: {{Steps.${key}}}`}
              onClick={() => navigator.clipboard.writeText(`{{Steps.${'NodeName'}.Output.${key}}}`)}
            >
              <Copy className="size-3.5 text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ nodeId, onClose }) => {
  const { nodes, updateNodeData } = useWorkflowStore();
  const { categories } = usePluginStore();
  const node = nodes.find((n) => n.id === nodeId);

  const nodeGroups = useMemo(() => catalogToNodeCategories(categories), [categories]);
  const def = useMemo(
    () => (node ? getNodeDefinition(node.data.type as string || node.data.label, nodeGroups) : null),
    [node, nodeGroups]
  );

  // ── State for dynamic form values ──
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [nodeName, setNodeName] = useState('');
  const [nodeDescription, setNodeDescription] = useState('');

  // Get inputSchema and outputSchema from node data or definition
  const inputSchema = useMemo<JsonSchema>(() => {
    return (node?.data.inputSchema as JsonSchema) || (def?.inputSchema as unknown as JsonSchema) || {};
  }, [node, def]);

  const outputSchema = useMemo<JsonSchema>(() => {
    return (node?.data.outputSchema as JsonSchema) || (def?.outputSchema as unknown as JsonSchema) || {};
  }, [node, def]);

  const hasInputFields = inputSchema?.properties && Object.keys(inputSchema.properties).length > 0;
  const hasOutputFields = outputSchema?.properties && Object.keys(outputSchema.properties).length > 0;

  // ── Reset form when node changes ──
  useEffect(() => {
    if (node) {
      setNodeName(node.data.label);
      setNodeDescription(node.data.description || '');
      setSelectedVersion(
        (node.data.activeVersion as string) || def?.activeVersion || 'Built-in'
      );

      // Initialize form values from existing config or defaults
      const existingConfig = (node.data.config as Record<string, unknown>) || {};
      const initialValues: Record<string, unknown> = { ...existingConfig };

      if (inputSchema?.properties) {
        Object.entries(inputSchema.properties).forEach(([key, prop]) => {
          if (initialValues[key] === undefined && prop.default !== undefined) {
            initialValues[key] = prop.default;
          }
        });
      }

      setFormValues(initialValues);
    }
  }, [node, def, inputSchema]);

  // ── Handle field changes ──
  const handleFieldChange = useCallback((name: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // ── Save ──
  const handleSave = useCallback(() => {
    if (!node) return;
    updateNodeData(node.id, {
      label: nodeName,
      description: nodeDescription,
      config: formValues,
      isConfigured: true,
      activeVersion: selectedVersion,
    });
    onClose();
  }, [node, nodeName, nodeDescription, formValues, selectedVersion, updateNodeData, onClose]);

  if (!node) return null;

  const Icon = def?.icon || Settings2;
  const executionMode = (node.data.executionMode as string) || def?.executionMode || 'Unknown';
  const packageId = (node.data.packageId as string) || def?.packageId;

  return (
    <Dialog open={!!nodeId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton
        className="sm:max-w-[780px] max-h-[85vh] p-0 flex flex-col overflow-hidden gap-0"
      >
        {/* ━━━━━━━━ Header ━━━━━━━━ */}
        <div className="relative overflow-hidden">
          {/* Gradient accent bar */}
          <div className={cn('absolute inset-x-0 top-0 h-1', def?.color || 'bg-slate-500')} />

          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={cn(
                'size-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-white/10',
                def?.color || 'bg-slate-500'
              )}>
                <Icon className="size-6 text-white" />
              </div>

              {/* Title & Meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <DialogTitle className="text-lg font-bold leading-tight">
                    {node.data.label}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-mono px-2 py-0 h-5',
                      executionMode === 'BuiltIn'
                        ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5'
                        : 'border-blue-500/30 text-blue-600 bg-blue-500/5'
                    )}
                  >
                    <Cpu className="size-3 mr-1" />
                    {executionMode}
                  </Badge>
                </div>

                <DialogDescription className="mt-1 text-sm leading-relaxed">
                  {node.data.description || 'Không có mô tả'}
                </DialogDescription>

                {/* Meta info chips */}
                <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                    <Package className="size-3" />
                    <span className="font-mono">{node.data.category as string}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                    <Hash className="size-3" />
                    <span className="font-mono truncate max-w-[140px]">{node.id}</span>
                  </div>
                  {packageId && (
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                      <ExternalLink className="size-3" />
                      <span className="font-mono truncate max-w-[120px]">{packageId.slice(0, 8)}...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        <Separator />

        {/* ━━━━━━━━ Body with Tabs ━━━━━━━━ */}
        <Tabs defaultValue="parameters" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-3">
            <TabsList className="w-full grid grid-cols-4 bg-muted/40 h-10">
              <TabsTrigger value="parameters" className="text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Settings2 className="size-3.5" />
                Cài đặt
              </TabsTrigger>
              <TabsTrigger value="output" className="text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <ArrowRightLeft className="size-3.5" />
                Output
              </TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Braces className="size-3.5" />
                Nâng cao
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Terminal className="size-3.5" />
                Logs
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-5">
              {/* ──── Tab: Parameters (Input Schema) ──── */}
              <TabsContent value="parameters" className="m-0 focus-visible:outline-none">
                <div className="space-y-6">
                  {/* Node general settings */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <Info className="size-3.5" />
                      Thông tin chung
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Tên Node</Label>
                        <Input
                          value={nodeName}
                          onChange={(e) => setNodeName(e.target.value)}
                          className="bg-card/80 border-border/60 hover:border-border transition-colors h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Phiên bản</Label>
                        <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                          <SelectTrigger className="bg-card/80 border-border/60 hover:border-border transition-colors h-10">
                            <SelectValue placeholder="Chọn phiên bản..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={selectedVersion || 'Built-in'}>
                              <span className="flex items-center gap-2">
                                <div className={cn('size-2 rounded-full', selectedVersion === 'Built-in' ? 'bg-emerald-400' : 'bg-blue-400')} />
                                {selectedVersion || 'Built-in'}
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Mô tả</Label>
                      <Textarea
                        value={nodeDescription}
                        onChange={(e) => setNodeDescription(e.target.value)}
                        placeholder="Mô tả ngắn gọn về bước này..."
                        className="bg-card/80 border-border/60 hover:border-border transition-colors min-h-[70px] resize-none"
                      />
                    </div>
                  </div>

                  {/* Dynamic Input Schema Fields */}
                  {hasInputFields && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <Settings2 className="size-3.5" />
                            Tham số đầu vào
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono h-5 px-2">
                            {Object.keys(inputSchema.properties!).length} tham số
                          </Badge>
                        </div>

                        <div className="space-y-4">
                          {Object.entries(inputSchema.properties!).map(([key, prop]) => (
                            <SchemaField
                              key={key}
                              name={key}
                              prop={prop}
                              value={formValues[key]}
                              onChange={handleFieldChange}
                              isRequired={inputSchema.required?.includes(key)}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* No input fields fallback */}
                  {!hasInputFields && (
                    <>
                      <Separator />
                      <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-8 text-center">
                        <Settings2 className="size-10 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-sm font-medium text-muted-foreground/60">
                          Node này không có tham số cấu hình
                        </p>
                        <p className="text-xs text-muted-foreground/40 mt-1">
                          Các cài đặt chung phía trên vẫn có thể chỉnh sửa
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* ──── Tab: Output Schema ──── */}
              <TabsContent value="output" className="m-0 focus-visible:outline-none">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <ArrowRightLeft className="size-3.5" />
                    Output Schema
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Dữ liệu trả về sau khi node thực thi xong. Bạn có thể sử dụng các biến này ở các bước tiếp theo.
                  </p>

                  {/* Output hint */}
                  <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3 flex items-start gap-3">
                    <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Cách sử dụng biến</p>
                      <p className="text-[11px] text-blue-500/70 mt-0.5">
                        Sử dụng cú pháp <code className="bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">{'{{Steps.<NodeName>.Output.<Key>}}'}</code> để truyền dữ liệu giữa các bước.
                      </p>
                    </div>
                  </div>

                  <OutputSchemaPreview schema={outputSchema} />
                </div>
              </TabsContent>

              {/* ──── Tab: Advanced ──── */}
              <TabsContent value="advanced" className="m-0 focus-visible:outline-none">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Braces className="size-3.5" />
                    Cài đặt nâng cao
                  </div>

                  {/* Retry Policy */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Chính sách thử lại (Retry)</Label>
                    <Select defaultValue="none">
                      <SelectTrigger className="bg-card/80 border-border/60 hover:border-border transition-colors h-10">
                        <SelectValue placeholder="Chọn chính sách..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Không thử lại (Fail immediately)</SelectItem>
                        <SelectItem value="linear">Linear Backoff (tối đa 3 lần)</SelectItem>
                        <SelectItem value="exponential">Exponential Backoff (tối đa 5 lần)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Timeout */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Timeout (ms)</Label>
                    <Input
                      type="number"
                      defaultValue={5000}
                      className="bg-card/80 border-border/60 hover:border-border transition-colors h-10 font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground/70">
                      Thời gian chờ tối đa trước khi đánh dấu là lỗi.
                    </p>
                  </div>

                  {/* Continue on Error */}
                  <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="size-4 text-amber-500" />
                      <div>
                        <Label className="text-sm font-medium">Tiếp tục khi lỗi</Label>
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                          Workflow sẽ tiếp tục chạy ngay cả khi node này gặp lỗi
                        </p>
                      </div>
                    </div>
                    <Switch />
                  </div>
                </div>
              </TabsContent>

              {/* ──── Tab: Logs ──── */}
              <TabsContent value="logs" className="m-0 focus-visible:outline-none">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Terminal className="size-3.5" />
                    Log thực thi gần nhất
                  </div>

                  <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
                      <div className="flex gap-1.5">
                        <div className="size-2.5 rounded-full bg-red-500/60" />
                        <div className="size-2.5 rounded-full bg-yellow-500/60" />
                        <div className="size-2.5 rounded-full bg-green-500/60" />
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono ml-2">console</span>
                    </div>
                    <div className="p-4 font-mono text-xs space-y-1 min-h-[160px]">
                      <p className="text-zinc-600">// Chưa có log thực thi cho node này.</p>
                      <p className="text-zinc-400">
                        Status: <span className="text-amber-400">WAITING</span>
                      </p>
                      <p className="text-zinc-400">
                        Inputs: <span className="text-blue-400">null</span>
                      </p>
                      <p className="text-zinc-400">
                        Outputs: <span className="text-blue-400">null</span>
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        {/* ━━━━━━━━ Footer ━━━━━━━━ */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSave} className="gap-2 shadow-md min-w-[140px]">
            <Save className="size-4" />
            Lưu cấu hình
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
