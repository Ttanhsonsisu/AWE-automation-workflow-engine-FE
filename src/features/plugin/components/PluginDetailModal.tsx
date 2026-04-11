import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Info,
  History,
  Shield,
  ShieldOff,
  Upload,
  Loader2,
  ArrowRight,
  CheckCircle2,
  FileCode2,
  Tag,
  Clock,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
import { cn } from '@/lib/utils';
import {
  usePluginPackageDetail,
  usePluginPackageVersions,
  useToggleVersionActive,
} from '@/api/plugins';
import type { PluginPackageItem, JsonSchemaProperty } from '@/types/plugin';
import { getExecutionModeConfig } from '../pluginUtils';

interface PluginDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plugin: PluginPackageItem | null;
  onToggleEnable: (packageId: string, enabled: boolean) => void;
  onUploadVersion: (packageId: string) => void;
  isTogglingEnable: boolean;
}

/** Renders a list of schema properties as a clean table */
const SchemaPropertyList: React.FC<{
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}> = ({ properties, required = [] }) => {
  if (!properties || Object.keys(properties).length === 0) {
    return (
      <p className="text-xs text-muted-foreground/60 italic py-3">
        No fields defined.
      </p>
    );
  }

  return (
    <div className="border border-border/40 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/30 border-b border-border/30">
            <th className="text-left px-3 py-2 font-bold text-muted-foreground/70 uppercase tracking-wider text-[10px]">
              Field
            </th>
            <th className="text-left px-3 py-2 font-bold text-muted-foreground/70 uppercase tracking-wider text-[10px]">
              Type
            </th>
            <th className="text-left px-3 py-2 font-bold text-muted-foreground/70 uppercase tracking-wider text-[10px]">
              Required
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(properties).map(([key, prop]) => (
            <tr
              key={key}
              className="border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors"
            >
              <td className="px-3 py-2">
                <span className="font-mono font-medium text-foreground">
                  {key}
                </span>
                {prop.description && (
                  <p
                    className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate"
                    title={prop.description}
                  >
                    {prop.description}
                  </p>
                )}
              </td>
              <td className="px-3 py-2">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 rounded font-mono bg-muted/20"
                >
                  {prop.type || 'object'}
                </Badge>
              </td>
              <td className="px-3 py-2">
                {required.includes(key) ? (
                  <span className="text-amber-500 font-semibold text-[10px]">
                    Yes
                  </span>
                ) : (
                  <span className="text-muted-foreground/40 text-[10px]">
                    No
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PluginDetailModal: React.FC<PluginDetailModalProps> = ({
  open,
  onOpenChange,
  plugin,
  onToggleEnable,
  onUploadVersion,
  isTogglingEnable,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const { data: detail, isLoading: isDetailLoading } =
    usePluginPackageDetail(plugin?.id ?? null);
  const { data: versions, isLoading: isVersionsLoading } =
    usePluginPackageVersions(plugin?.id ?? null);
  const toggleVersionMutation = useToggleVersionActive();

  if (!plugin) return null;

  const modeConfig = getExecutionModeConfig(plugin.executionMode);
  const isBuiltIn = plugin.executionMode === 'BuiltIn';
  const canUploadVersion = !isBuiltIn;

  // Version currently being viewed in the Overview tab
  const viewingVersion = selectedVersion || plugin.latestVersion || null;

  // Handle View Docs redirect
  const handleViewDocs = () => {
    window.open(`/plugins/${plugin.id}/docs`, '_blank');
  };

  // Handle Toggle Version On/Off
  const handleToggleVersion = (versionId: string, active: boolean) => {
    toggleVersionMutation.mutate({ packageId: plugin.id, versionId, active });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className={cn(
                'size-14 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 border shadow-sm',
                'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 text-primary'
              )}
            >
              {plugin.icon ? (
                <span>{plugin.icon}</span>
              ) : (
                <span>
                  {plugin.displayName?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl font-bold truncate">
                  {plugin.displayName}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 rounded-md font-semibold shrink-0',
                    modeConfig.className
                  )}
                >
                  {modeConfig.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                {plugin.uniqueName}
              </p>
              {plugin.latestVersion && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Tag className="size-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Latest:{' '}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 rounded font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  >
                    v{plugin.latestVersion}
                  </Badge>
                </div>
              )}
            </div>

            {/* View Docs Button */}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 text-xs h-8 px-3 text-muted-foreground hover:text-primary transition-colors"
                    onClick={handleViewDocs}
                  >
                    <ExternalLink className="size-3.5" />
                    View Docs
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open plugin documentation in a new tab</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogHeader>

        {/* Tabs — BuiltIn: only Overview; DLL/gRPC: Overview + Version History */}
        {isBuiltIn ? (
          /* BuiltIn: Overview only, no tabs needed */
          <ScrollArea className="h-[420px] flex-1">
            <div className="px-6 py-4 space-y-5">
              {isDetailLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <>
                  {/* Description */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="size-3" />
                      Description
                    </h4>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-muted/20 rounded-lg p-3 border border-border/30">
                      {detail?.description ||
                        plugin.description ||
                        'No description available.'}
                    </p>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowRight className="size-3" />
                      Input Parameters
                    </h4>
                    <SchemaPropertyList
                      properties={detail?.inputSchema?.properties}
                      required={detail?.inputSchema?.required}
                    />
                  </div>

                  {/* Outputs */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowRight className="size-3 rotate-180" />
                      Output Parameters
                    </h4>
                    <SchemaPropertyList
                      properties={detail?.outputSchema?.properties}
                      required={detail?.outputSchema?.required}
                    />
                  </div>

                  {/* Info note for BuiltIn */}
                  <div className="pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/20 border border-border/30">
                      <Info className="size-4 text-muted-foreground shrink-0" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        This is a <span className="font-semibold text-foreground">Built-in</span> plugin managed by the system. It cannot be disabled or have custom versions uploaded.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        ) : (
          /* DLL / gRPC: Full tabs */
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-6 pt-3 shrink-0">
              <TabsList className="w-full">
                <TabsTrigger value="overview" className="flex-1 gap-1.5 text-xs">
                  <Info className="size-3.5" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="versions" className="flex-1 gap-1.5 text-xs">
                  <History className="size-3.5" />
                  Version History
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── Overview Tab ── */}
            <TabsContent value="overview" className="flex-1 min-h-0 m-0">
              <ScrollArea className="h-[400px]">
                <div className="px-6 py-4 space-y-5">
                  {isDetailLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : (
                    <>
                      {/* Version Switcher */}
                      {versions && versions.length > 0 && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                            <Tag className="size-3" />
                            Viewing Version
                          </label>
                          <Select
                            value={viewingVersion || ''}
                            onValueChange={(v) => setSelectedVersion(v)}
                          >
                            <SelectTrigger className="h-9 bg-background/60 border-border/50 shadow-sm w-full max-w-[200px]">
                              <SelectValue placeholder="Select version" />
                            </SelectTrigger>
                            <SelectContent>
                              {versions.map((ver, idx) => (
                                <SelectItem key={ver.id} value={ver.version}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-medium">v{ver.version}</span>
                                    {idx === 0 && (
                                      <span className="text-[9px] text-primary font-bold uppercase">Latest</span>
                                    )}
                                    {ver.isActive && (
                                      <span className="text-[9px] text-emerald-600 font-bold uppercase">Active</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Description */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="size-3" />
                          Description
                        </h4>
                        <p className="text-sm text-foreground/80 leading-relaxed bg-muted/20 rounded-lg p-3 border border-border/30">
                          {detail?.description ||
                            plugin.description ||
                            'No description available.'}
                        </p>
                      </div>

                      {/* Inputs */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                          <ArrowRight className="size-3" />
                          Input Parameters
                        </h4>
                        <SchemaPropertyList
                          properties={detail?.inputSchema?.properties}
                          required={detail?.inputSchema?.required}
                        />
                      </div>

                      {/* Outputs */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                          <ArrowRight className="size-3 rotate-180" />
                          Output Parameters
                        </h4>
                        <SchemaPropertyList
                          properties={detail?.outputSchema?.properties}
                          required={detail?.outputSchema?.required}
                        />
                      </div>

                      {/* Toggle Enable/Disable — only for non-BuiltIn */}
                      <div className="pt-2 border-t border-border/30">
                        <Button
                          variant={plugin.isEnabled ? 'outline' : 'default'}
                          className={cn(
                            'gap-2 w-full transition-all',
                            plugin.isEnabled
                              ? 'border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          )}
                          onClick={() =>
                            onToggleEnable(plugin.id, !plugin.isEnabled)
                          }
                          disabled={isTogglingEnable}
                        >
                          {isTogglingEnable ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : plugin.isEnabled ? (
                            <ShieldOff className="size-4" />
                          ) : (
                            <Shield className="size-4" />
                          )}
                          {plugin.isEnabled
                            ? 'Disable Plugin'
                            : 'Enable Plugin'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Version History Tab ── */}
            <TabsContent value="versions" className="flex-1 min-h-0 m-0">
              <ScrollArea className="h-[400px]">
                <div className="px-6 py-4 space-y-4">
                  {/* Upload button */}
                  {canUploadVersion && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all"
                      onClick={() => onUploadVersion(plugin.id)}
                    >
                      <Upload className="size-4" />
                      Upload New Version
                    </Button>
                  )}

                  {isVersionsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : versions && versions.length > 0 ? (
                    <div className="space-y-2.5">
                      {versions.map((ver, idx) => (
                        <div
                          key={ver.id}
                          className={cn(
                            'p-3.5 rounded-xl border transition-all hover:shadow-sm',
                            ver.isActive
                              ? 'border-emerald-500/30 bg-emerald-500/5 shadow-inner'
                              : idx === 0
                                ? 'border-primary/30 bg-primary/5'
                                : 'border-border/40 bg-card/50'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={cn(
                                  'size-8 rounded-lg flex items-center justify-center shrink-0',
                                  ver.isActive
                                    ? 'bg-emerald-500/10'
                                    : idx === 0
                                      ? 'bg-primary/10'
                                      : 'bg-muted/30'
                                )}
                              >
                                <FileCode2
                                  className={cn(
                                    'size-4',
                                    ver.isActive
                                      ? 'text-emerald-600'
                                      : idx === 0
                                        ? 'text-primary'
                                        : 'text-muted-foreground'
                                  )}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-sm text-foreground">
                                    v{ver.version}
                                  </span>
                                  {idx === 0 && (
                                    <Badge className="text-[9px] px-1.5 py-0 rounded bg-primary/10 text-primary border-primary/20 font-bold">
                                      LATEST
                                    </Badge>
                                  )}
                                  {ver.isActive && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1.5 py-0 rounded border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                                    >
                                      <CheckCircle2 className="size-2.5 mr-0.5" />
                                      Active
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="size-2.5" />
                                    {format(
                                      new Date(ver.createdAt),
                                      'MMM d, yyyy HH:mm'
                                    )}
                                  </span>
                                  {ver.bucket && (
                                    <span className="font-mono bg-muted/30 px-1.5 rounded">
                                      {ver.bucket}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* On/Off toggle switch — independent per version */}
                            <div className="shrink-0 flex items-center gap-2">
                              <span className={cn(
                                'text-[10px] font-semibold',
                                ver.isActive ? 'text-emerald-600' : 'text-muted-foreground/50'
                              )}>
                                {ver.isActive ? 'ON' : 'OFF'}
                              </span>
                              <Switch
                                size="sm"
                                checked={ver.isActive}
                                disabled={toggleVersionMutation.isPending}
                                onCheckedChange={(checked) => {
                                  handleToggleVersion(ver.id, checked);
                                }}
                              />
                            </div>
                          </div>

                          {ver.releaseNotes && (
                            <p className="text-xs text-muted-foreground mt-2 pl-10 leading-relaxed">
                              {ver.releaseNotes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="size-12 rounded-full bg-muted/30 flex items-center justify-center">
                        <History className="size-6 text-muted-foreground/40" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">
                          No versions found
                        </p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          Upload a version to get started.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PluginDetailModal;
