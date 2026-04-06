import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
import { OutputMappingSidebar, SIDEBAR_WIDTH } from './OutputMappingSidebar';
import {
  Save,
  Settings2,
  Info,
  Package,
  ExternalLink,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Settings,
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
  const [maxRetries, setMaxRetries] = useState<number | ''>('');
  const [enableRetry, setEnableRetry] = useState(false);
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);
  const [localFormData, setLocalFormData] = useState<Record<string, unknown>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const hasInputFields = inputSchema?.properties && Object.keys(inputSchema.properties).length > 0;

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

      const initialMaxRetries = (node.data.config?.maxRetries as number);
      if (initialMaxRetries !== undefined && initialMaxRetries > 0) {
        setEnableRetry(true);
        setMaxRetries(initialMaxRetries);
      } else {
        setEnableRetry(false);
        setMaxRetries('');
      }

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
        maxRetries: enableRetry && maxRetries !== '' ? Number(maxRetries) : undefined,
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
          className={cn(
            'max-h-[90vh] p-0 flex flex-col overflow-hidden gap-0 shadow-2xl border-border/40 transition-all duration-300',
            sidebarOpen ? 'sm:max-w-[1210px]' : 'sm:max-w-[850px]'
          )}
        >
          {/* ━━━━━━━━ Relative wrapper for sidebar overlay ━━━━━━━━ */}
          <div className="relative flex flex-col flex-1 min-h-0">
            {/* Output Mapping Sidebar */}
            {nodeId && (
              <OutputMappingSidebar
                nodeId={nodeId}
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
              />
            )}
            {/* ━━━━━━━━ Main content area — shifts right when sidebar is open ━━━━━━━━ */}
            <div
              className="flex flex-col flex-1 min-h-0 transition-all duration-300"
              style={{ paddingLeft: sidebarOpen ? `${SIDEBAR_WIDTH}px` : '0px' }}
            >
              {/* ━━━━━━━━ Compact Top Bar (replaces old heavy header) ━━━━━━━━ */}
              <div className="relative shrink-0">
                {/* Thin accent gradient */}
                <div className={cn('absolute inset-x-0 top-0 h-0.5 z-10', colors.color)} />

                <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4">
                  {/* Left: Icon + Node type label */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'size-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg',
                      colors.color
                    )}>
                      <Icon className="size-4.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-foreground truncate leading-tight">
                        {displayNameDisplay}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 font-medium truncate">
                        {categoryLabel} · {displayExecutionMode}
                      </p>
                    </div>
                  </div>

                  {/* Right: Doc button */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 rounded-lg border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 shrink-0"
                        >
                          <ExternalLink className="size-3.5" />
                          <span className="text-xs font-medium">Tài liệu</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        Xem tài liệu hướng dẫn cho node này
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <Separator className="shrink-0 bg-border/60" />

              {/* ━━━━━━━━ Scrollable Content ━━━━━━━━ */}
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <div className="px-6 py-6 space-y-8 pb-10">
                  {/* ──── Section: General Information (only Step ID + Display Name) ──── */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 group">
                      <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                        <Info className="size-3.5" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Thông tin chung</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground ml-0.5 flex items-center gap-1.5">
                          Định danh Step ID
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="size-3 text-muted-foreground/50 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[240px] text-xs">
                                Step ID được dùng để tham chiếu kết quả từ Node này ở các bước tiếp theo. Không nên chứa khoảng trắng.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Input
                          value={stepId}
                          onChange={(e) => setStepId(e.target.value.replace(/\s/g, '_'))}
                          className="bg-background/50 border-border/60 hover:border-border focus:border-primary transition-all duration-200 h-9 rounded-lg px-3 font-mono text-[13px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground ml-0.5">Tên hiển thị</Label>
                        <Input
                          value={nodeName}
                          onChange={(e) => setNodeName(e.target.value)}
                          placeholder="Nhập tên node..."
                          className="bg-background/50 border-border/60 hover:border-border focus:border-primary transition-all duration-200 h-9 rounded-lg px-3"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ──── Section: Plugin Parameters ──── */}
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 group">
                        <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                          <Settings2 className="size-3.5" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">Tham số đầu vào</h3>
                      </div>
                      {hasInputFields && (
                        <Badge variant="outline" className="text-[10px] h-5 px-2.5 rounded-full font-mono bg-primary/5 text-primary border-primary/20">
                          {Object.keys(inputSchema.properties!).length} fields
                        </Badge>
                      )}
                    </div>

                    <div className="relative">
                      {/* Subtle loading overlay */}
                      {isSchemaLoading && !hasInputFields && (
                        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border/50 bg-muted/5">
                          <div className="relative">
                            <div className="size-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Package className="size-5 text-primary/40 animate-pulse" />
                            </div>
                          </div>
                          <p className="text-sm font-medium text-foreground/80 mt-4">Đang tải schema cấu hình...</p>
                          <p className="text-xs text-muted-foreground mt-1">Vui lòng đợi trong giây lát</p>
                        </div>
                      )}

                      {schemaError && !isSchemaLoading && !hasInputFields && (
                        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-3">
                          <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                            <AlertCircle className="size-6 text-destructive" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-destructive">Lỗi tải schema</p>
                            <p className="text-xs text-muted-foreground/80 mt-1">{(schemaError as Error).message}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="rounded-lg h-8 px-4 border-destructive/20 text-destructive hover:bg-destructive/10">
                            Thử lại
                          </Button>
                        </div>
                      )}

                      {hasInputFields && (
                        <div className={cn(
                          "p-1 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm transition-all",
                          isSchemaLoading && "opacity-50 pointer-events-none grayscale-[0.3]"
                        )}>
                          {isSchemaLoading && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/5 backdrop-blur-[1px]">
                              <Loader2 className="size-8 text-primary animate-spin" />
                            </div>
                          )}

                          <div className="px-5 py-4">
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
                              <></>
                            </Form>
                          </div>
                        </div>
                      )}

                      {!isSchemaLoading && !schemaError && !hasInputFields && (
                        <div className="rounded-2xl border border-dashed border-border/50 bg-card/20 p-10 text-center">
                          <div className="size-14 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4 border border-border/30">
                            <Settings2 className="size-7 text-muted-foreground/20" />
                          </div>
                          <p className="text-sm font-semibold text-muted-foreground/80">Plugin không có tham số</p>
                          <p className="text-xs text-muted-foreground/50 mt-1 max-w-[260px] mx-auto">
                            Node này thực thi tự động mà không cần cấu hình tham số đầu vào cụ thể.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ──── Section: Advanced Configuration ──── */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 group">
                      <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                        <Settings className="size-3.5" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Cấu hình nâng cao</h3>
                    </div>

                    <div className="grid gap-4 p-4 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="enable-retry" className="text-sm font-medium text-foreground flex items-center gap-1.5 cursor-pointer">
                          Tự động thử lại khi lỗi
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="size-3 text-muted-foreground/50 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[240px] text-xs">
                                Nếu kích hoạt, Node sẽ tự động thực thi lại theo số lần được chỉ định nếu gặp lỗi.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Switch
                          id="enable-retry"
                          checked={enableRetry}
                          onCheckedChange={setEnableRetry}
                        />
                      </div>

                      {enableRetry && (
                        <div className="space-y-1.5 mt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                          <Label className="text-xs font-medium text-muted-foreground ml-0.5">
                            Số lần thử lại (MaxRetries)
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={maxRetries}
                            onChange={(e) => setMaxRetries(e.target.value === '' ? '' : parseInt(e.target.value))}
                            placeholder="Ví dụ: 3"
                            className="bg-background/50 border-border/60 hover:border-border focus:border-primary transition-all duration-200 h-9 rounded-lg px-3 max-w-[200px]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ━━━━━━━━ Footer ━━━━━━━━ */}
              <DialogFooter className="shrink-0 px-6 py-4 border-t border-border bg-background/80 backdrop-blur-md">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="h-10 rounded-xl transition-all active:scale-95 px-6 border-border/60"
                >
                  Hủy bỏ
                </Button>
                <Button
                  onClick={handleSave}
                  className="h-10 px-8 rounded-xl bg-primary shadow-[0_4px_12px_rgba(var(--primary-rgb),0.2)] transition-all hover:shadow-[0_6px_20px_rgba(var(--primary-rgb),0.3)] active:scale-95 gap-2"
                >
                  <Save className="size-4" />
                  Lưu cấu hình
                </Button>
              </DialogFooter>
            </div>{/* end main content area */}
          </div>{/* end relative wrapper */}
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
