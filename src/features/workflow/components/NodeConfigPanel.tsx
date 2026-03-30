import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { useWorkflowStore } from '@/stores/workflowStore';
import { usePluginStore } from '@/stores/pluginStore';
import { catalogToNodeCategories, getNodeDefinition, resolveIcon, categoryColorMap } from '../nodeDefinitions';
import { usePluginDetail } from '../hooks/usePluginDetail';
import { usePackageVersions } from '../hooks/usePackageVersions';

import { cn } from '@/lib/utils';
import {
  Save,
  Terminal,
  Settings2,
  Info,
  Braces,
  ArrowRightLeft,
  Package,
  Cpu,
  Hash,
  Copy,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { JsonSchema, JsonSchemaProperty } from '@/types/plugin';

// RJSF imports
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import type { IChangeEvent } from '@rjsf/core';
import { customWidgets, customTemplates } from './rjsf-widgets';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Schema $ref resolver
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Resolves `$ref` and `oneOf` patterns from backend JSON Schema into
 * a flat schema that RJSF can render without needing definitions.
 *
 * Pattern from BE:
 *   "Operation": { "oneOf": [{ "$ref": "#/definitions/TextOperation" }], "x-nullable": true }
 *   "definitions": { "TextOperation": { "enum": ["UPPER","LOWER","REVERSE"], "type": "string" } }
 *
 * Result:
 *   "Operation": { "type": "string", "enum": ["UPPER","LOWER","REVERSE"], "title": "Operation" }
 */
function resolveSchemaRefs(schema: JsonSchema): Record<string, unknown> {
  const definitions = schema.definitions || {};
  const resolvedProperties: Record<string, unknown> = {};

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      const resolved = resolveProperty(key, prop, definitions);
      resolvedProperties[key] = resolved;
    }
  }

  const result: Record<string, unknown> = {
    type: schema.type || 'object',
    properties: resolvedProperties,
  };

  if (schema.required) {
    result.required = schema.required;
  }

  // Keep definitions for any unresolved $ref that RJSF can handle
  if (Object.keys(definitions).length > 0) {
    result.definitions = definitions;
  }

  return result;
}

/**
 * Resolve a single property: if it has `oneOf` with `$ref`, inline the definition.
 */
function resolveProperty(
  key: string,
  prop: JsonSchemaProperty,
  definitions: Record<string, JsonSchemaProperty>
): JsonSchemaProperty {
  // Case 1: direct $ref on the property
  if (prop.$ref) {
    const refName = prop.$ref.replace('#/definitions/', '');
    const definition = definitions[refName];
    if (definition) {
      return resolveProperty(key, {
        ...definition,
        title: definition.title || key,
      }, definitions);
    }
  }

  // Case 2: oneOf with $ref — inline the referenced definition
  if (prop.oneOf && prop.oneOf.length > 0) {
    for (const option of prop.oneOf) {
      if (option.$ref) {
        const refName = option.$ref.replace('#/definitions/', '');
        const definition = definitions[refName];
        if (definition) {
          return resolveProperty(key, {
            ...definition,
            title: definition.title || key,
            'x-nullable': prop['x-nullable'],
          }, definitions);
        }
      }
    }
  }

  // Case 3: Recursive Object properties
  if (prop.type === 'object' && prop.properties) {
    const resolvedProps: Record<string, JsonSchemaProperty> = {};
    for (const [k, p] of Object.entries(prop.properties)) {
      resolvedProps[k] = resolveProperty(k, p, definitions);
    }
    return { ...prop, properties: resolvedProps as any };
  }

  // Case 4: Recursive Array items
  if (prop.type === 'array' && prop.items) {
    const items = Array.isArray(prop.items) 
      ? prop.items.map(item => resolveProperty(key + 'Item', item, definitions))
      : resolveProperty(key + 'Item', prop.items, definitions);
    return { ...prop, items: items as any };
  }

  // Case 5: No more refs, return as-is
  return prop;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Props
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface NodeConfigPanelProps {
  nodeId: string | null;
  onClose: () => void;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Output Schema Preview
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getPropertyIcon(prop: JsonSchemaProperty) {
  if (prop.enum) return import('lucide-react').then((m) => m.List);
  if (prop.type === 'integer' || prop.type === 'number') return Hash;
  if (prop.type === 'boolean') return import('lucide-react').then((m) => m.ToggleLeft);
  return Hash;
}

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
      {Object.entries(schema.properties).map(([key, prop]) => (
        <div
          key={key}
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card/60 border border-border/40"
        >
          <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Hash className="size-4 text-emerald-500" />
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
            title={`Copy: {{Steps.NodeName.Output.${key}}}`}
            onClick={() => navigator.clipboard.writeText(`{{Steps.${'NodeName'}.Output.${key}}}`)}
          >
            <Copy className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Version Switch Confirmation Dialog
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const VersionSwitchDialog: React.FC<{
  open: boolean;
  newVersion: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, newVersion, onConfirm, onCancel }) => (
  <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
    <DialogContent className="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-500" />
          Xác nhận đổi version
        </DialogTitle>
        <DialogDescription>
          Việc đổi sang version <strong className="text-foreground">{newVersion}</strong> sẽ
          <span className="text-destructive font-medium"> xóa toàn bộ cấu hình</span> bạn
          đã nhập hiện tại do schema có thể thay đổi. Bạn có chắc chắn không?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onCancel}>
          Hủy bỏ
        </Button>
        <Button variant="destructive" onClick={onConfirm} className="gap-2">
          <AlertTriangle className="size-4" />
          Đổi version
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ nodeId, onClose }) => {
  const {
    nodes,
    updateNodeData,
    updateNodeInputs,
    setNodeValidation,
    changeNodeVersion,
  } = useWorkflowStore();
  const { categories } = usePluginStore();
  const node = nodes.find((n) => n.id === nodeId);

  const nodeGroups = useMemo(() => catalogToNodeCategories(categories), [categories]);
  const def = useMemo(
    () => (node ? getNodeDefinition((node.data.pluginMetadata?.name as string) || (node.data.config?.nodeLabel as string) || '', nodeGroups) : null),
    [node, nodeGroups]
  );

  // ── Local form state ──
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [nodeName, setNodeName] = useState('');
  const [nodeDescription, setNodeDescription] = useState('');
  const [stepId, setStepId] = useState('');
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);
  const [localFormData, setLocalFormData] = useState<Record<string, unknown>>({});

  // ── Plugin Detail API (with React Query caching) ──
  const pluginName = node?.data.pluginMetadata?.name as string | undefined;
  const executionMode = (node?.data.pluginMetadata?.executionMode as string) || def?.executionMode;
  const packageId = (node?.data.pluginMetadata?.packageId as string) || def?.packageId;
  const nodeVersion = (node?.data.pluginMetadata?.version as string) || '';
  const currentVersion = selectedVersion || nodeVersion || def?.activeVersion || 'Built-in';
  const isBuiltIn = executionMode === 'BuiltIn' || currentVersion === 'Built-in';

  // Only use sha256 to fetch if we are still on the initially loaded version 
  // (user hasn't actively switched selectedVersion to something different)
  const isOriginalVersion = !selectedVersion || selectedVersion === nodeVersion;
  
  const executionMetadata = node?.data.pluginMetadata?.executionMetadata as Record<string, unknown> | undefined;
  // Support both PascalCase and camelCase for Sha256
  const sha256 = isOriginalVersion ? ((executionMetadata?.Sha256 as string | undefined) || (executionMetadata?.sha256 as string | undefined)) : undefined;

  const {
    data: pluginDetail,
    isLoading: isSchemaLoading,
    error: schemaError,
  } = usePluginDetail(
    pluginName,
    executionMode,
    packageId,
    isBuiltIn ? undefined : currentVersion,
    sha256
  );

  // ── Package Versions API ──
  const {
    data: packageVersions,
    isLoading: isVersionsLoading,
  } = usePackageVersions(isBuiltIn ? null : packageId);

  const availableVersions = useMemo(() => {
    if (isBuiltIn) return ['Built-in'];
    if (!packageVersions || packageVersions.length === 0) return [];
    return packageVersions;
  }, [isBuiltIn, packageVersions]);


  // ── Resolve schemas: API detail > catalog fallback ──
  const inputSchema = useMemo<JsonSchema>(() => {
    // If detail is loading, we SHOULD NOT flip to empty {} if we already had a fallback from node metadata or catalog.
    // This prevents RJSF from clearing data because properties temporarily disappeared.
    const fallback = (node?.data.pluginMetadata?.inputSchema as JsonSchema) || (def?.inputSchema as unknown as JsonSchema) || {};
    if (!pluginDetail) return fallback;
    return pluginDetail.inputSchema || fallback;
  }, [pluginDetail, node, def]);

  const outputSchema = useMemo<JsonSchema>(() => {
    const fallback = (node?.data.pluginMetadata?.outputSchema as JsonSchema) || (def?.outputSchema as unknown as JsonSchema) || {};
    if (!pluginDetail) return fallback;
    return pluginDetail.outputSchema || fallback;
  }, [pluginDetail, node, def]);

  const hasInputFields = inputSchema?.properties && Object.keys(inputSchema.properties).length > 0;
  const hasOutputFields = outputSchema?.properties && Object.keys(outputSchema.properties).length > 0;

  // ── Sync metadata from individual API detail once loaded ──
  useEffect(() => {
    if (pluginDetail) {
      // If nodeName is empty or just matches the technical type, update it to the displayName from API
      if (!nodeName || nodeName === node?.data.pluginMetadata?.name) {
        setNodeName(pluginDetail.displayName);
      }
      // If nodeDescription is empty, update it to the description from API
      if (!nodeDescription && pluginDetail.description) {
        setNodeDescription(pluginDetail.description);
      }
      // If node doesn't have a version yet, set it to the one from the API
      if (!selectedVersion && pluginDetail.version) {
        setSelectedVersion(pluginDetail.version);
      }
    }
  }, [pluginDetail, node?.data.pluginMetadata?.name]);

  // ── RJSF schema conversion: resolve $ref/oneOf patterns from backend ──
  const rjsfSchema = useMemo(() => {
    if (!inputSchema || !inputSchema.properties) return inputSchema;

    return resolveSchemaRefs(inputSchema);
  }, [inputSchema]);


  // ── Reset form when node changes ──
  useEffect(() => {
    if (node) {
      setNodeName((node.data.config?.nodeLabel || node.data.pluginMetadata?.displayName) || '');
      setNodeDescription((node.data.pluginMetadata?.description) || '');
      setStepId((node.data.config?.stepId as string) || node.id);
      
      // Crucial: only set selectedVersion to a fallback if the node itself has NO version
      // This preserves our ability to detect "Original Version" for SHA-based lookups
      setSelectedVersion((node.data.pluginMetadata?.version as string) || '');
      
      setLocalFormData((node.data.config?.inputs as Record<string, unknown>) || {});
    }
  }, [nodeId]); // Only reset when we switch to a different node

  // ── RJSF onChange: update local state ──
  const handleFormChange = useCallback(
    (e: IChangeEvent) => {
      setLocalFormData(e.formData || {});
    },
    []
  );

  // ── Version switching ──
  const handleVersionChangeRequest = useCallback((newVersion: string) => {
    if (newVersion === selectedVersion) return;
    // If there's existing input data, show confirmation
    if (localFormData && Object.keys(localFormData).length > 0) {
      setPendingVersion(newVersion);
    } else {
      // No data to lose, switch immediately
      setSelectedVersion(newVersion);
      setLocalFormData({});
    }
  }, [selectedVersion, localFormData]);

  const confirmVersionSwitch = useCallback(() => {
    if (pendingVersion) {
      setSelectedVersion(pendingVersion);
      setLocalFormData({});
      setPendingVersion(null);
    }
  }, [pendingVersion]);

  // ── Save ──
  const handleSave = useCallback(() => {
    if (!node) return;
    updateNodeData(node.id, {
      pluginMetadata: {
        ...node.data.pluginMetadata,
        version: selectedVersion,
        description: nodeDescription, // Save custom description here if edited
        executionMetadata: pluginDetail?.executionMetadata as Record<string, unknown> | undefined,
      },
      config: {
        ...node.data.config,
        nodeLabel: nodeName,
        stepId,
        inputs: localFormData,
        isConfigured: true,
      },
      uiState: {
        ...node.data.uiState,
        isValid: true,
      }
    } as any);
    onClose();
  }, [node, nodeName, stepId, nodeDescription, localFormData, selectedVersion, updateNodeData, onClose, pluginDetail]);

  // Resolve visual properties using API data as priority over catalog fallback
  const Icon = useMemo(() => {
    if (pluginDetail?.icon) return resolveIcon(pluginDetail.icon);
    return def?.icon || Settings2;
  }, [pluginDetail, def]);

  const displayExecutionMode = (pluginDetail?.executionMode as string) || (node?.data?.pluginMetadata?.executionMode as string) || def?.executionMode || 'Unknown';
  const categoryLabel = (pluginDetail?.category || node?.data?.pluginMetadata?.category || def?.category || 'General') as string;
  const colors = categoryColorMap[categoryLabel] || { color: 'bg-slate-500', bgColor: 'bg-emerald-500/10' };
  const displayNameDisplay = nodeName || pluginDetail?.displayName || node?.data?.pluginMetadata?.displayName || def?.label || 'Node';

  if (!node) return null;

  return (
    <>
      <Dialog open={!!nodeId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          showCloseButton
          className="sm:max-w-[780px] max-h-[85vh] p-0 flex flex-col overflow-hidden gap-0"
        >
          {/* ━━━━━━━━ Header ━━━━━━━━ */}
          <div className="relative overflow-hidden">
            {/* Gradient accent bar */}
            <div className={cn('absolute inset-x-0 top-0 h-1', colors.color)} />

            <DialogHeader className="px-6 pt-6 pb-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={cn(
                  'size-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-white/10',
                  colors.color
                )}>
                  <Icon className="size-6 text-white" />
                </div>

                {/* Title & Meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <DialogTitle className="text-lg font-bold leading-tight">
                      {displayNameDisplay}
                    </DialogTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-mono px-2 py-0 h-5',
                        displayExecutionMode === 'BuiltIn'
                          ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5'
                          : 'border-blue-500/30 text-blue-600 bg-blue-500/5'
                      )}
                    >
                      {displayExecutionMode}
                    </Badge>
                  </div>

                  <DialogDescription className="mt-1 text-sm leading-relaxed line-clamp-2">
                    {pluginDetail?.description || node.data.pluginMetadata?.description || 'Không có mô tả'}
                  </DialogDescription>

                  {/* Meta info chips */}
                  <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                      <Package className="size-3" />
                      <span className="font-mono">{node.data.pluginMetadata?.category as string}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                      <Hash className="size-3" />
                      <span className="font-mono truncate max-w-[140px]">{node.id}</span>
                    </div>
                    {packageId && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                        <ExternalLink className="size-3" />
                        <span className="font-mono truncate max-w-[120px]">{(packageId as string).slice(0, 8)}...</span>
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
                          <Label className="text-sm font-medium flex gap-2">
                            Step ID
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="size-3.5 text-muted-foreground mt-0.5" />
                                </TooltipTrigger>
                                <TooltipContent>Định danh duy nhất của Node khi chạy API</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <Input
                            value={stepId}
                            onChange={(e) => setStepId(e.target.value.replace(/\s/g, '_'))}
                            className="bg-card/80 border-border/60 hover:border-border transition-colors h-10 font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label className="text-sm font-medium">Phiên bản</Label>
                          <Select
                            value={selectedVersion}
                            onValueChange={handleVersionChangeRequest}
                            disabled={isVersionsLoading}
                          >
                            <SelectTrigger className="bg-card/80 border-border/60 hover:border-border transition-colors h-10">
                              <SelectValue placeholder="Chọn phiên bản..." />
                            </SelectTrigger>
                            <SelectContent>
                              {isVersionsLoading ? (
                                <div className="flex items-center gap-2 p-2">
                                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Đang tải...</span>
                                </div>
                              ) : availableVersions.length > 0 ? (
                                availableVersions.map((v) => (
                                  <SelectItem key={v} value={v}>
                                    <span className="flex items-center gap-2">
                                      <div className={cn('size-2 rounded-full', v === 'Built-in' ? 'bg-emerald-400' : 'bg-blue-400')} />
                                      {v}
                                    </span>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value={selectedVersion || 'Built-in'}>
                                  <span className="flex items-center gap-2">
                                    <div className={cn('size-2 rounded-full', isBuiltIn ? 'bg-emerald-400' : 'bg-blue-400')} />
                                    {selectedVersion || 'Built-in'}
                                  </span>
                                </SelectItem>
                              )}
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

                    {/* Dynamic Input Schema Fields via RJSF */}
                    {isSchemaLoading && !hasInputFields && (
                      <>
                        <Separator />
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <Loader2 className="size-8 text-primary animate-spin mb-3" />
                          <p className="text-sm text-muted-foreground">Đang tải schema plugin...</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            Đang lấy cấu hình cho {pluginName || 'plugin'}
                          </p>
                        </div>
                      </>
                    )}

                    {schemaError && !isSchemaLoading && !hasInputFields && (
                      <>
                        <Separator />
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                          <AlertCircle className="size-8 text-destructive/60 mx-auto mb-2" />
                          <p className="text-sm font-medium text-destructive">
                            Không thể tải schema plugin
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(schemaError as Error).message}
                          </p>
                        </div>
                      </>
                    )}

                    {hasInputFields && (
                      <>
                        <Separator />
                        <div className="space-y-4 relative">
                          {/* Subtle loading overlay when refreshing schema */}
                          {isSchemaLoading && (
                            <div className="absolute inset-0 z-10 bg-background/20 backdrop-blur-[1px] flex items-start justify-center pt-10 pointer-events-none">
                              <Loader2 className="size-6 text-primary animate-spin opacity-50" />
                            </div>
                          )}

                          <div className={cn("flex items-center justify-between", isSchemaLoading && "opacity-50")}>
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              <Settings2 className="size-3.5" />
                              Tham số đầu vào
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono h-5 px-2">
                              {Object.keys(inputSchema.properties!).length} tham số
                            </Badge>
                          </div>

                          <div className={cn(isSchemaLoading && "opacity-50 grayscale-[0.2]")}>
                            <Form
                              schema={rjsfSchema as Record<string, unknown>}
                              formData={localFormData}
                              onChange={handleFormChange}
                              validator={validator}
                              widgets={customWidgets}
                              templates={customTemplates}
                              liveValidate
                              showErrorList={false}
                              noHtml5Validate
                              uiSchema={{
                                'ui:submitButtonOptions': { norender: true },
                              }}
                            >
                              {/* Hide default submit button */}
                              <></>
                            </Form>
                          </div>
                        </div>
                      </>
                    )}

                    {/* No input fields fallback */}
                    {!isSchemaLoading && !schemaError && !hasInputFields && (
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
                          Inputs: <span className="text-blue-400">{JSON.stringify(localFormData, null, 0) || 'null'}</span>
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

      {/* Version Switch Confirmation */}
      <VersionSwitchDialog
        open={!!pendingVersion}
        newVersion={pendingVersion || ''}
        onConfirm={confirmVersionSwitch}
        onCancel={() => setPendingVersion(null)}
      />
    </>
  );
};
