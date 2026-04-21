import React, { useState } from 'react';
import { toast } from 'sonner';
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
  usePluginVersionDetail,
} from '@/api/plugins';
import type { PluginPackageItem, JsonSchemaProperty, PluginVersionDetail } from '@/types/plugin';
import {
  getExecutionModeConfig,
  getPluginIconComponent,
  getCategoryConfig,
  resolveExecutionMode,
} from '../pluginUtils';

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

/** Component to render the Overview content (Schemas + Metadata) from versionDetail */
const PluginOverview: React.FC<{
  plugin: PluginPackageItem;
  versionDetail: PluginVersionDetail | null | undefined;
  isLoading: boolean;
  isTogglingEnable: boolean;
  onToggleEnable: (packageId: string, enabled: boolean) => void;
}> = ({ plugin, versionDetail, isLoading, isTogglingEnable, onToggleEnable }) => {
  const isBuiltIn = plugin.isBuiltIn;

  return (
    <div className="space-y-10">
      {/* Description Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-primary">
          <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm">
            <Info className="size-4.5" />
          </div>
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] opacity-70">
            About this Plugin
          </h3>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed bg-muted/40 p-6 rounded-3xl border border-border/40 shadow-inner">
          {plugin.description || 'No description available for this plugin package.'}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-10">
          {[1, 2].map(i => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-5 w-48 rounded-lg" />
              <Skeleton className="h-44 w-full rounded-[2rem]" />
            </div>
          ))}
        </div>
      ) : versionDetail ? (
        <>
          {/* Input Parameters Section */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-emerald-600">
                <div className="size-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shadow-sm">
                  <ArrowRight className="size-4.5" />
                </div>
                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] opacity-70">
                  Input Contract
                </h3>
              </div>
              {versionDetail.version && (
                <Badge variant="outline" className="text-[10px] font-mono font-bold bg-muted/30 border-none">v{versionDetail.version}</Badge>
              )}
            </div>
            <div className="bg-background rounded-[2rem] border border-border/40 overflow-hidden shadow-sm">
              <SchemaPropertyList
                properties={versionDetail.inputSchema?.properties}
                required={versionDetail.inputSchema?.required}
              />
            </div>
          </div>

          {/* Output Parameters Section */}
          <div className="space-y-5">
            <div className="flex items-center gap-3 text-violet-600">
              <div className="size-8 rounded-xl bg-violet-500/10 flex items-center justify-center shadow-sm">
                <CheckCircle2 className="size-4.5" />
              </div>
              <h3 className="font-black text-[10px] uppercase tracking-[0.2em] opacity-70">
                Output Contract
              </h3>
            </div>
            <div className="bg-background rounded-[2rem] border border-border/40 overflow-hidden shadow-sm">
              <SchemaPropertyList
                properties={versionDetail.outputSchema?.properties}
                required={versionDetail.outputSchema?.required}
              />
            </div>
          </div>

          {/* Technical Deep-Dive (Metadata) */}
          {versionDetail.executionMetadata && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 text-amber-600">
                <div className="size-8 rounded-xl bg-amber-500/10 flex items-center justify-center shadow-sm">
                  <FileCode2 className="size-4.5" />
                </div>
                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] opacity-70">
                  Binary Properties
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-muted/30 rounded-3xl border border-border/40 flex flex-col gap-1.5 transition-colors hover:bg-muted/40">
                  <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Runtime Logic</span>
                  <span className="text-xs font-mono font-bold truncate text-foreground/90">{versionDetail.executionMetadata.PluginType}</span>
                </div>
                <div className="p-5 bg-muted/30 rounded-3xl border border-border/40 flex flex-col gap-1.5 transition-colors hover:bg-muted/40">
                  <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Size on Disk</span>
                  <span className="text-xs font-mono font-bold text-foreground/90">{(versionDetail.executionMetadata.Size / 1024).toFixed(1)} KB</span>
                </div>
                <div className="p-5 bg-muted/30 rounded-3xl border border-border/40 flex flex-col gap-2 md:col-span-2 transition-colors hover:bg-muted/40">
                  <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Integrity Hash (SHA-256)</span>
                  <span className="text-[10px] font-mono break-all leading-relaxed bg-background/40 p-3 rounded-xl border border-border/20 text-foreground/70">
                    {versionDetail.executionMetadata.Sha256}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="py-16 flex flex-col items-center justify-center gap-4 bg-muted/10 rounded-[3rem] border border-dashed border-border/60">
          <div className="size-14 rounded-full bg-background flex items-center justify-center shadow-sm">
            <Info className="size-7 text-muted-foreground/20" />
          </div>
          <p className="text-sm font-bold text-muted-foreground/40 uppercase tracking-widest">No Schema Data</p>
        </div>
      )}

      {/* Action Controls Section */}
      {!isBuiltIn && (
        <div className="pt-8 border-t border-border/40">
          <Button
            variant={plugin.isEnabled !== false ? 'outline' : 'default'}
            className={cn(
              'group relative h-14 w-full transition-all duration-500 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg overflow-hidden',
              plugin.isEnabled !== false
                ? 'bg-background border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/40'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30'
            )}
            onClick={() => onToggleEnable(plugin.id!, plugin.isEnabled === false)}
            disabled={isTogglingEnable}
          >
            <div className="flex items-center gap-3 relative z-10">
              {isTogglingEnable ? (
                <Loader2 className="size-5 animate-spin" />
              ) : plugin.isEnabled !== false ? (
                <ShieldOff className="size-5 group-hover:rotate-12 transition-transform" />
              ) : (
                <Shield className="size-5 group-hover:scale-110 transition-transform" />
              )}
              {plugin.isEnabled !== false
                ? 'Deactivate Global Package'
                : 'Activate Global Package'}
            </div>
          </Button>
          <p className="text-[10px] text-center text-muted-foreground/40 mt-3 font-medium">
            Activating or deactivating will affect all workflows using this plugin.
          </p>
        </div>
      )}

      {isBuiltIn && (
        <div className="pt-6 border-t border-border/40">
          <div className="flex items-start gap-4 p-5 bg-emerald-500/[0.03] rounded-3xl border border-emerald-500/10">
            <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Shield className="size-5 text-emerald-600" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-black text-emerald-700 uppercase tracking-tight">System Core Integrity</p>
              <p className="text-[11px] text-emerald-600/70 py-0.5 leading-relaxed font-semibold">
                Natively compiled into the AWE Engine for high-performance and absolute stability.
              </p>
            </div>
          </div>
        </div>
      )}
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

  const { data: versions, isLoading: isVersionsLoading } =
    usePluginPackageVersions(plugin?.id ?? null);
  const toggleVersionMutation = useToggleVersionActive();

  // Reset selected version when plugin changes
  React.useEffect(() => {
    if (plugin) {
      setSelectedVersion(plugin.latestVersion);
    }
  }, [plugin?.id, plugin?.uniqueName, plugin?.latestVersion]);

  const isBuiltIn = plugin?.isBuiltIn ?? false;
  const viewingVersion = selectedVersion || plugin?.latestVersion || null;

  // Prepare params for specific version/builtin detail
  const detailParams = React.useMemo(() => {
    if (!plugin) return null;
    const mode = resolveExecutionMode(plugin.executionMode);
    
    if (isBuiltIn) {
      return { mode: 'BuiltIn', name: plugin.uniqueName };
    }
    
    if (plugin.id && viewingVersion) {
      return { 
        mode, 
        packageId: plugin.id, 
        version: viewingVersion 
      };
    }
    
    return null;
  }, [plugin, isBuiltIn, viewingVersion]);

  const { data: versionDetail, isLoading: isVersionDetailLoading } =
    usePluginVersionDetail(detailParams);

  if (!plugin) return null;

  const modeConfig = getExecutionModeConfig(plugin.executionMode);
  const IconComponent = getPluginIconComponent(plugin.icon);
  const categoryConfig = getCategoryConfig(plugin.category);
  const canUploadVersion = !isBuiltIn;

  // Handle View Docs redirect
  const handleViewDocs = () => {
    window.open(`/plugins/${plugin.uniqueName}/docs`, '_blank');
  };

  // Handle Toggle Version On/Off
  const handleToggleVersion = (versionId: string, active: boolean) => {
    if (!plugin.id) return;
    toggleVersionMutation.mutate({ packageId: plugin.id, versionId, active }, {
      onSuccess: () => {
        toast.success(active ? 'Version Activated' : 'Version Deactivated', {
          description: `Plugin version status updated successfully.`,
        });
      },
      onError: (err: any) => {
        toast.error('Update Failed', {
          description: err.response?.data?.message || 'Could not toggle version status.',
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-start gap-5">
            {/* Logo */}
            <div className={cn(
              "size-20 rounded-3xl flex items-center justify-center shrink-0 shadow-lg border border-border/40",
              "bg-gradient-to-br from-background to-muted/30"
            )}>
              <IconComponent className="size-10 text-primary/80" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl font-black tracking-tight truncate">
                  {plugin.displayName}
                </DialogTitle>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-2 h-5 font-bold uppercase border-none",
                    categoryConfig.className
                  )}
                >
                  {plugin.category}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium mt-0.5">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] px-1.5 h-4.5 rounded-md font-bold uppercase tracking-wider shrink-0 border-none',
                    modeConfig.className
                  )}
                >
                  {modeConfig.label}
                </Badge>
                <span className="text-muted-foreground/30">•</span>
                <span className="font-mono text-xs opacity-70 truncate">{plugin.uniqueName}</span>
              </div>
              
              {plugin.latestVersion && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Tag className="size-3 text-muted-foreground/40" />
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight">
                    Latest Version:
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4.5 rounded font-mono bg-emerald-500/10 text-emerald-600 border-none font-bold"
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

        {/* Body Area */}
        <div className="flex-1 min-h-0 flex flex-col">
          {isBuiltIn ? (
            <ScrollArea className="flex-1">
              <div className="px-6 py-6 space-y-8">
                <PluginOverview 
                  plugin={plugin} 
                  versionDetail={versionDetail} 
                  isLoading={isVersionDetailLoading} 
                  isTogglingEnable={isTogglingEnable}
                  onToggleEnable={onToggleEnable}
                />
              </div>
            </ScrollArea>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <div className="px-6 pt-3 shrink-0">
                <TabsList className="w-full h-11 bg-muted/30 p-1.5 rounded-xl border border-border/40">
                  <TabsTrigger value="overview" className="flex-1 gap-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-background">
                    <Info className="size-3.5" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="versions" className="flex-1 gap-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-background">
                    <History className="size-3.5" /> Version History
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="flex-1 min-h-0 m-0">
                <ScrollArea className="h-[430px]">
                  <div className="px-6 py-6 space-y-8">
                    {/* Version Switcher */}
                    {versions && versions.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/10 space-y-2.5">
                        <label className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <Tag className="size-3" /> Technical View
                        </label>
                        <Select value={viewingVersion || ''} onValueChange={(v) => setSelectedVersion(v)}>
                          <SelectTrigger className="h-10 bg-background border-border/40 font-mono font-bold text-sm shadow-sm rounded-xl">
                            <SelectValue placeholder="Select version" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-border/40">
                             {versions.map((ver, idx) => (
                              <SelectItem key={ver.id} value={ver.version} className="rounded-lg py-2.5">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-bold text-sm">v{ver.version}</span>
                                  {idx === 0 && <Badge variant="outline" className="text-[8px] h-3.5 bg-primary/10 text-primary border-none">LATEST</Badge>}
                                  {ver.isActive && <Badge variant="outline" className="text-[8px] h-3.5 bg-emerald-500/10 text-emerald-600 border-none">ACTIVE</Badge>}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <PluginOverview 
                      plugin={plugin} 
                      versionDetail={versionDetail} 
                      isLoading={isVersionDetailLoading} 
                      isTogglingEnable={isTogglingEnable}
                      onToggleEnable={onToggleEnable}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="versions" className="flex-1 min-h-0 m-0">
                <ScrollArea className="h-[480px]">
                  <div className="px-6 py-6 space-y-5">
                    {canUploadVersion && (
                      <Button
                        variant="outline"
                        className="w-full h-11 gap-2.5 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all rounded-2xl font-black text-xs uppercase tracking-wider"
                        onClick={() => plugin.id && onUploadVersion(plugin.id)}
                      >
                        <Upload className="size-4" /> Upload New Bundle
                      </Button>
                    )}

                    {isVersionsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-3xl" />)}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {versions?.map((ver, idx) => (
                          <div key={ver.id} className={cn(
                            "group p-5 rounded-3xl border transition-all duration-300 relative",
                            ver.isActive ? "bg-emerald-50/[0.03] border-emerald-500/20 shadow-sm" : "bg-card border-border/40"
                          )}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className={cn("size-10 rounded-xl flex items-center justify-center border", ver.isActive ? "bg-emerald-500/10 border-emerald-500/20" : "bg-muted/40 border-border/40")}>
                                  <FileCode2 className={cn("size-5", ver.isActive ? "text-emerald-600" : "text-muted-foreground/60")} />
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base font-black font-mono">v{ver.version}</span>
                                    {idx === 0 && <Badge variant="outline" className="text-[9px] h-4.5 bg-primary/10 text-primary border-none">LATEST</Badge>}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate">{ver.releaseNotes || 'No release notes.'}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2.5 ml-4">
                                <Switch
                                  checked={ver.isActive}
                                  onCheckedChange={(checked) => handleToggleVersion(ver.id, checked)}
                                  disabled={toggleVersionMutation.isPending}
                                />
                                <span className={cn("text-[9px] font-black uppercase tracking-widest", ver.isActive ? "text-emerald-600" : "text-muted-foreground/40")}>
                                  {ver.isActive ? "Live" : "Inactive"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PluginDetailModal;
