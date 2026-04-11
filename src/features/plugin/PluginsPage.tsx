import React, { useState } from 'react';
import { toast } from 'sonner';

import {
  Search,
  Plus,
  Puzzle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Filter,
  Tag,
  MoreHorizontal,
  Eye,
  ShieldOff,
  Shield,
  Upload,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

import {
  usePluginPackages,
  useCreatePluginPackage,
  useUploadPluginVersion,
  useTogglePluginPackage,
  useExecutionModeDropdown,
  useCategoryDropdown,
} from '@/api/plugins';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { PluginPackageFilters, PluginPackageItem } from '@/types/plugin';
import {
  getExecutionModeConfig,
  getPluginIconComponent,
  getCategoryConfig,
} from './pluginUtils';
import CreatePackageModal from './components/CreatePackageModal';
import UploadVersionModal from './components/UploadVersionModal';
import PluginDetailModal from './components/PluginDetailModal';

// ─── Plugin Card Component ───────────────────────────────────────

interface PluginCardProps {
  plugin: PluginPackageItem;
  onCardClick: (plugin: PluginPackageItem) => void;
  onUploadVersion: (plugin: PluginPackageItem) => void;
  onToggleEnable: (plugin: PluginPackageItem) => void;
}

const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  onCardClick,
  onUploadVersion,
  onToggleEnable,
}) => {
  const modeConfig = getExecutionModeConfig(plugin.executionMode);
  const categoryConfig = getCategoryConfig(plugin.category);
  const IconComponent = getPluginIconComponent(plugin.icon);
  const isBuiltIn = plugin.isBuiltIn;

  return (
    <Card
      className={cn(
        'group relative cursor-pointer border-border/50 bg-card/80 backdrop-blur-sm shadow-sm',
        'transition-all duration-300 hover:shadow-lg hover:border-primary/40 hover:-translate-y-1',
        'overflow-hidden h-full flex flex-col',
        plugin.isBuiltIn && !plugin.id && 'ring-1 ring-emerald-500/10'
      )}
      onClick={() => onCardClick(plugin)}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardContent className="p-5 flex flex-col h-full gap-4 relative">
        {/* Main Content Area: Left(Icon), Middle(Info), Right(Category/Action) */}
        <div className="flex items-start gap-4">
          {/* Left: Icon */}
          <div className={cn(
            'size-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-border/40',
            'bg-gradient-to-br from-background to-muted/30 group-hover:scale-105 transition-transform duration-300'
          )}>
            <IconComponent className="size-7 text-primary/80 group-hover:text-primary transition-colors" />
          </div>

          {/* Middle: Name, Badge, Description */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors duration-200">
                {plugin.displayName}
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  'text-[9px] px-1.5 h-4 rounded-md font-bold uppercase tracking-wider shrink-0 border-none',
                  modeConfig.className
                )}
              >
                {modeConfig.label}
              </Badge>
            </div>
            
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed h-[2.75em]">
              {plugin.description || 'No description available for this plugin package.'}
            </p>
          </div>

          {/* Right: Category & Action */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 -mt-1 -mr-1 text-muted-foreground/40 hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all rounded-full"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1.5" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem className="gap-2.5 cursor-pointer py-2 px-3 rounded-lg" onClick={() => onCardClick(plugin)}>
                  <Eye className="size-4 text-muted-foreground" />
                  <span className="font-medium text-xs">View Details</span>
                </DropdownMenuItem>
                
                {!isBuiltIn && (
                  <>
                    <DropdownMenuItem
                      className="gap-2.5 cursor-pointer py-2 px-3 rounded-lg text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50"
                      onClick={() => onUploadVersion(plugin)}
                    >
                      <Upload className="size-4" />
                      <span className="font-medium text-xs">Upload New Version</span>
                    </DropdownMenuItem>
                    {/* Add toggle enable if backend supports it */}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Badge variant="secondary" className={cn(
              'text-[9px] px-1.5 h-4 font-semibold rounded-md border-none',
              categoryConfig.className
            )}>
              {plugin.category}
            </Badge>
          </div>
        </div>

        {/* Footer: Version Info */}
        <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Tag className="size-3 text-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground/60 font-medium">
              Unique: <span className="text-foreground/80 font-mono tracking-tighter">{plugin.uniqueName}</span>
            </span>
          </div>

          {plugin.latestVersion ? (
            <Badge variant="outline" className="h-5 px-1.5 bg-background shadow-sm border-border/50">
              <span className="text-[10px] font-mono font-bold text-primary/80">
                v{plugin.latestVersion}
              </span>
            </Badge>
          ) : (
            <span className="text-[9px] text-muted-foreground/30 italic font-medium">No version</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Loading Skeleton Grid ───────────────────────────────────────

const PluginCardSkeleton: React.FC = () => (
  <Card className="border-border/30 bg-card/50">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <Skeleton className="size-12 rounded-xl" />
        <Skeleton className="h-5 w-14 rounded-md" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="flex justify-between pt-2 border-t border-border/20">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    </CardContent>
  </Card>
);

// ─── Main Plugins Page ───────────────────────────────────────────

const PluginsPage: React.FC = () => {
  const [filters, setFilters] = useState<PluginPackageFilters>({
    page: 1,
    size: 12,
  });
  const [searchInput, setSearchInput] = useState('');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginPackageItem | null>(null);
  const [uploadTarget, setUploadTarget] = useState<{ id: string; name: string } | null>(null);

  // API hooks
  const { data: pageData, isLoading, error } = usePluginPackages(filters);
  const createMutation = useCreatePluginPackage();
  const uploadMutation = useUploadPluginVersion();
  const toggleMutation = useTogglePluginPackage();

  // Dropdown data from API
  const { data: executionModes } = useExecutionModeDropdown();
  const { data: categories } = useCategoryDropdown();

  // ── Handlers ──

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput.trim() || undefined, page: 1 }));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setFilters({ page: 1, size: 12 });
  };

  const handleCardClick = (plugin: PluginPackageItem) => {
    setSelectedPlugin(plugin);
    setDetailModalOpen(true);
  };

  const handleCreateSubmit = (data: { uniqueName: string; displayName: string; description: string; executionMode: number }) => {
    createMutation.mutate(data, {
      onSuccess: (result) => {
        toast.success('Package Created', {
          description: `Successfully registered ${data.displayName}.`,
        });
        setCreateModalOpen(false);
        // Open upload modal for the newly created package
        setUploadTarget({ id: result.id, name: data.displayName });
        setUploadModalOpen(true);
      },
      onError: (err: any) => {
        toast.error('Failed to Create Package', {
          description: err.response?.data?.message || 'An unexpected error occurred.',
        });
      },
    });
  };

  const handleUploadFromCard = (plugin: PluginPackageItem) => {
    if (!plugin.id) return; // built-in plugins have no id
    setUploadTarget({ id: plugin.id, name: plugin.displayName });
    setUploadModalOpen(true);
  };

  const handleUploadFromDetail = (packageId: string) => {
    const pkg = selectedPlugin;
    setDetailModalOpen(false);
    setUploadTarget({ id: packageId, name: pkg?.displayName || 'Plugin' });
    setUploadModalOpen(true);
  };

  const handleUploadSubmit = (data: {
    packageId: string;
    version: string;
    bucket: string;
    releaseNotes: string;
    file: File;
  }) => {
    uploadMutation.mutate(data, {
      onSuccess: () => {
        toast.success(`Version ${data.version} Uploaded`, {
          description: 'The plugin bundle has been processed successfully.',
        });
        setUploadModalOpen(false);
        setUploadTarget(null);
      },
      onError: (err: any) => {
        toast.error('Upload Failed', {
          description: err.response?.data?.message || 'Check your file format or connection.',
        });
      },
    });
  };

  const handleToggleEnableFromCard = (plugin: PluginPackageItem) => {
    if (!plugin.id) return; // built-in plugins can't be toggled
    toggleMutation.mutate({ packageId: plugin.id, enabled: true });
  };

  const handleToggleEnableFromDetail = (packageId: string, enabled: boolean) => {
    toggleMutation.mutate({ packageId, enabled }, {
      onSuccess: () => {
        toast.success(enabled ? 'Plugin Activated' : 'Plugin Deactivated', {
          description: `Plugin package status updated successfully.`,
        });
      },
      onError: (err: any) => {
        toast.error('Status Update Failed', {
          description: err.response?.data?.message || 'Could not update plugin status.',
        });
      },
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeInUp pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Plugin Packages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse, manage, and configure plugin packages for your workflows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 shadow-sm bg-card"
            onClick={handleResetFilters}
          >
            <RotateCcw className="size-3.5" /> Reset
          </Button>
          <Button
            size="sm"
            className="h-9 gap-2 shadow-md"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="size-4" />
            Create Package
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <Card className="border-border/60 shadow-md overflow-visible bg-card/40 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground/80 flex items-center gap-1.5 uppercase tracking-wider ml-1">
                <Search className="size-3" /> Search
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="h-10 bg-background/60 border-border/50 shadow-sm transition-all focus:ring-primary/20 flex-1"
                />
                <Button variant="secondary" size="sm" className="h-10 px-4" onClick={handleSearch}>
                  <Search className="size-4" />
                </Button>
              </div>
            </div>

            {/* Execution Mode Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground/80 flex items-center gap-1.5 uppercase tracking-wider ml-1">
                <Filter className="size-3" /> Execution Mode
              </label>
              <Select
                value={filters.executionMode || 'all'}
                onValueChange={(val) =>
                  setFilters((prev) => ({
                    ...prev,
                    executionMode: val === 'all' ? undefined : val,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger className="h-10 bg-background/60 border-border/50 shadow-sm transition-all focus:ring-primary/20">
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  {executionModes?.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground/80 flex items-center gap-1.5 uppercase tracking-wider ml-1">
                <Tag className="size-3" /> Category
              </label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(val) =>
                  setFilters((prev) => ({
                    ...prev,
                    category: val === 'all' ? undefined : val,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger className="h-10 bg-background/60 border-border/50 shadow-sm transition-all focus:ring-primary/20">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Content Area ── */}
      {error ? (
        <Card className="border-destructive/30 bg-destructive/5 text-destructive overflow-hidden">
          <CardContent className="py-12 flex flex-col items-center justify-center gap-4">
            <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="size-8" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold">Failed to load plugins</h3>
              <p className="text-sm opacity-80 mt-1 max-w-sm">
                The server might be temporarily unavailable. Please try again.
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-2 border-destructive/20 hover:bg-destructive/10"
              onClick={() => window.location.reload()}
            >
              Retry connection
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <PluginCardSkeleton key={i} />
          ))}
        </div>
      ) : pageData?.items?.length ? (
        <div className="flex flex-col gap-5">
          {/* Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pageData.items.map((plugin) => (
              <PluginCard
                key={plugin.id || plugin.uniqueName}
                plugin={plugin}
                onCardClick={handleCardClick}
                onUploadVersion={handleUploadFromCard}
                onToggleEnable={handleToggleEnableFromCard}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 py-4 px-2 bg-card/20 rounded-xl border border-border/40 shadow-sm">
            <div className="flex items-center gap-3 order-2 sm:order-1">
              <div className="text-xs font-semibold text-muted-foreground px-3 py-1.5 bg-background/50 rounded-lg border border-border/30 shadow-subtle flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                Total: <span className="text-foreground font-bold">{pageData.totalCount}</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium hidden md:block">
                Page <span className="text-foreground font-bold">{pageData.pageNumber}</span> of{' '}
                {pageData.totalPages}
              </p>
            </div>

            <div className="flex items-center gap-3 order-1 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-xl bg-card border-border/50 shadow-sm transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                onClick={() => handlePageChange(pageData.pageNumber - 1)}
                disabled={!pageData.hasPreviousPage}
              >
                <ChevronLeft className="size-4 mr-1" />
                Previous
              </Button>

              <div className="flex items-center gap-1.5 h-9 bg-background/80 rounded-xl border border-border/50 px-4 shadow-inner">
                <span className="text-sm font-extrabold text-primary">{pageData.pageNumber}</span>
                <span className="text-[10px] text-muted-foreground opacity-30 font-bold">OF</span>
                <span className="text-sm font-bold text-muted-foreground">{pageData.totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-xl bg-card border-border/50 shadow-sm transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                onClick={() => handlePageChange(pageData.pageNumber + 1)}
                disabled={!pageData.hasNextPage}
              >
                Next
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <Card className="bg-card/30 border-border/50 border-dashed shadow-inner">
          <CardContent className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500/20 blur-[30px] rounded-full animate-pulse" />
              <div className="relative size-20 rounded-[2rem] bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center border border-violet-500/20 shadow-xl">
                <Puzzle className="size-10 text-violet-500 drop-shadow-sm" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-foreground">No plugins found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                {filters.search || filters.executionMode || filters.category
                  ? 'Your filters are too restrictive. Try widening your search criteria.'
                  : 'Get started by creating your first plugin package.'}
              </p>
            </div>
            {filters.search || filters.executionMode || filters.category ? (
              <Button
                variant="secondary"
                size="default"
                className="mt-2 rounded-xl shadow-lg border border-border/50"
                onClick={handleResetFilters}
              >
                <RotateCcw className="size-4 mr-2" />
                Clear Filters
              </Button>
            ) : (
              <Button
                size="default"
                className="mt-2 rounded-xl shadow-lg gap-2"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="size-4" />
                Create Plugin Package
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Modals ── */}
      <CreatePackageModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateSubmit}
        isPending={createMutation.isPending}
      />

      {uploadTarget && (
        <UploadVersionModal
          open={uploadModalOpen}
          onOpenChange={(val) => {
            setUploadModalOpen(val);
            if (!val) setUploadTarget(null);
          }}
          packageId={uploadTarget.id}
          packageName={uploadTarget.name}
          onSubmit={handleUploadSubmit}
          isPending={uploadMutation.isPending}
        />
      )}

      <PluginDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        plugin={selectedPlugin}
        onToggleEnable={handleToggleEnableFromDetail}
        onUploadVersion={handleUploadFromDetail}
        isTogglingEnable={toggleMutation.isPending}
      />
    </div>
  );
};

export default PluginsPage;
