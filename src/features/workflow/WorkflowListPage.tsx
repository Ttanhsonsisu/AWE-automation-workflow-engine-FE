import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Copy, Trash, Play, AlertCircle, RefreshCw, Edit, Search, FileText, Clock } from 'lucide-react';

import type { WorkflowGroup, WorkflowVersion } from '@/types';
import {
  useWorkflows,
  useCreateWorkflow,
  useUpdateWorkflowStatus,
  useDeleteWorkflow,
  type WorkflowFilterParams,
} from '@/api/workflows';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WorkflowRowData {
  groupName: string;
  versions: WorkflowVersion[];
  activeVersion: WorkflowVersion;
  onVersionChange: (newVersionId: string) => void;
}

const WorkflowListPage: React.FC = () => {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<WorkflowFilterParams>({
    pageSize: 30,
    pageNo: 1,
    isPublished: undefined,
    name: undefined,
  });

  const [searchInput, setSearchInput] = useState("");

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, name: searchInput || undefined, pageNo: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: pageData, isLoading, error } = useWorkflows(filters);
  const updateStatusMutation = useUpdateWorkflowStatus();
  const createWorkflowMutation = useCreateWorkflow();
  const deleteWorkflowMutation = useDeleteWorkflow();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  
  // Local state to keep track of user selected version for each group row
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({});

  const groups = Array.isArray(pageData)
    ? pageData
    : (pageData && 'items' in pageData && Array.isArray((pageData as any).items))
      ? (pageData as any).items
      : [];

  const tableData: WorkflowRowData[] = useMemo(() => {
    if (!Array.isArray(groups)) return [];

    return groups.map((group) => {
      // Defensive check in case data structure does not match perfectly or cache is corrupted
      const originalVersions = Array.isArray(group?.versions) ? group.versions : [];
      if (originalVersions.length === 0) {
        console.warn('⚠️ Group skipped, versions not an array or empty:', group);
        return null; // Skip invalid entries
      }

      // Sort versions descending so the highest version is first by default
      const sortedVersions = [...originalVersions].sort((a, b) => b.version - a.version);
      const selectedId = selectedVersions[group.name];
      const activeVersion = sortedVersions.find((v) => v.id === selectedId) || sortedVersions[0];
      
      return {
        groupName: group.name,
        versions: sortedVersions,
        activeVersion,
        onVersionChange: (newVersionId: string) => {
          setSelectedVersions((prev) => ({ ...prev, [group.name]: newVersionId }));
        },
      };
    }).filter(Boolean) as WorkflowRowData[];
  }, [groups, selectedVersions]);

  // Define Columns
  const columns: ColumnDef<WorkflowRowData>[] = [
    {
      accessorKey: 'groupName',
      header: 'Workflow Name',
      cell: ({ row }) => {
        const { groupName, activeVersion, versions, onVersionChange } = row.original;
        return (
          <div className="flex flex-col py-1.5">
            <span 
              className="font-semibold text-foreground text-[14px] leading-tight cursor-pointer hover:underline underline-offset-2 transition-colors hover:text-primary" 
              onClick={() => navigate(`/workflows/${activeVersion.id}/edit`)}
            >
              {groupName}
            </span>
            
            {activeVersion.description && (
              <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground/80">
                <FileText className="size-[13px] shrink-0" />
                <span 
                  className={cn(
                    "text-[12px] line-clamp-1 max-w-[380px] leading-snug",
                    activeVersion.description.toLowerCase() === 'no description' ? 'italic opacity-60 font-light' : 'font-medium'
                  )} 
                  title={activeVersion.description}
                >
                  {activeVersion.description}
                </span>
              </div>
            )}

            <div className={cn("flex items-center gap-2", activeVersion.description ? "mt-2" : "mt-1.5")}>
              {versions.length > 1 ? (
                <select
                  className="h-6 text-[11px] font-medium text-foreground/80 bg-muted/50 border border-border/50 rounded-md px-1.5 py-0 shadow-sm focus:ring-1 focus:ring-primary outline-none transition-colors hover:bg-muted/80 cursor-pointer max-w-[280px] truncate"
                  value={activeVersion.id}
                  onChange={(e) => onVersionChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {versions.map(v => {
                    const descText = v.description && v.description.toLowerCase() !== 'no description' 
                      ? v.description 
                      : 'No description';
                    const truncatedDesc = descText.length > 40 ? descText.substring(0, 37) + '...' : descText;
                    return (
                      <option key={v.id} value={v.id}>
                        v{v.version} - {truncatedDesc}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="secondary" className="text-[10px] h-5 py-0 px-1.5 shadow-sm border-transparent bg-muted/60 text-foreground/70 hover:bg-muted/80 transition-colors">
                    v{activeVersion.version}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Switch / Status',
      cell: ({ row }) => {
        const { activeVersion } = row.original;
        const isPublished = activeVersion.isPublished;
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={isPublished}
              onCheckedChange={(checked) => {
                updateStatusMutation.mutate({
                  id: activeVersion.id,
                  status: checked ? 'Active' : 'Draft', // Will adapt if backend changes
                });
              }}
              // Disabled if changing
              disabled={updateStatusMutation.isPending && updateStatusMutation.variables?.id === activeVersion.id}
            />
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] leading-none px-2 py-0.5 uppercase tracking-wider",
                isPublished
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                  : 'border-amber-500/20 bg-amber-500/10 text-amber-500'
              )}
            >
              {isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'executions',
      header: 'Executions',
      cell: ({ row }) => {
        const { activeVersion } = row.original;
        const { statusCounts, totalRunCount } = activeVersion;
        return (
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={100}>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-blue-600">
                     <Play className="size-3 fill-blue-600" />
                     <span className="text-xs font-semibold">{statusCounts?.Running || 0}</span>
                   </div>
                 </TooltipTrigger>
                 <TooltipContent>Running executions</TooltipContent>
               </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={100}>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-600">
                     <AlertCircle className="size-3" />
                     <span className="text-xs font-semibold">{statusCounts?.Failed || 0}</span>
                   </div>
                 </TooltipTrigger>
                 <TooltipContent>Failed executions</TooltipContent>
               </Tooltip>
            </TooltipProvider>

            <span className="text-xs text-muted-foreground font-medium ml-1">
              Total: {totalRunCount || 0}
            </span>
          </div>
        );
      },
    },
    {
      id: 'updatedAt',
      header: 'Last Modified',
      cell: ({ row }) => {
        const date = row.original.activeVersion.lastUpdated || row.original.activeVersion.createdAt;
        if (!date) return <span className="text-xs text-muted-foreground italic">Never</span>;
        return (
          <span className="text-xs text-muted-foreground font-medium">
            {formatDistanceToNow(new Date(date), { addSuffix: true })}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const wf = row.original.activeVersion;
        return (
          <div className="flex items-center gap-2">
            <Button 
              title="Edit Workflow Canvas"
              variant="outline" 
              size="sm" 
              className="h-7 px-2.5 text-[11px] font-medium gap-1.5 shadow-sm text-foreground hover:text-primary transition-colors border-border/50"
              onClick={() => navigate(`/workflows/${wf.id}/edit`)}
            >
              <Edit className="size-[13px]" /> Edit
            </Button>
            <Button 
              title="Run Workflow"
              variant="outline" 
              size="sm" 
              className="h-7 px-2.5 text-[11px] font-medium gap-1.5 shadow-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors border-border/50"
            >
              <Play className="size-[13px]" /> Run
            </Button>
            <Button 
              title="View History"
              variant="outline" 
              size="sm" 
              className="h-7 px-2.5 text-[11px] font-medium gap-1.5 shadow-sm text-muted-foreground hover:text-foreground transition-colors border-border/50"
            >
              <Clock className="size-[13px]" /> History
            </Button>
          </div>
        );
      },
    },
  ];

  const handleCreateNew = () => {
    if (!newWorkflowName.trim()) return;
    createWorkflowMutation.mutate(newWorkflowName, {
      onSuccess: (data) => {
        setCreateDialogOpen(false);
        setNewWorkflowName('');
        navigate(`/workflows/${data.id}/edit`);
      },
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeInUp">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Workflows</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build and monitor your automated processes.
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="size-4" /> Create Workflow
        </Button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full bg-card/60 p-2.5 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search workflows by name..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-9 border-input bg-card shadow-sm transition-shadow focus-visible:shadow-md"
          />
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <Select 
            value={filters.isPublished !== undefined ? String(filters.isPublished) : 'all'} 
            onValueChange={(val) => {
              const parsedVal = val === 'all' ? undefined : val === 'true';
              setFilters(prev => ({ ...prev, isPublished: parsedVal, pageNo: 1 }));
            }}
          >
            <SelectTrigger className="w-[150px] h-9 bg-card shadow-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="true">Published</SelectItem>
              <SelectItem value="false">Draft</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.pageSize?.toString() || '30'} 
            onValueChange={(val) => setFilters(prev => ({ ...prev, pageSize: Number(val), pageNo: 1 }))}
          >
            <SelectTrigger className="w-[120px] h-9 bg-card shadow-sm">
              <SelectValue placeholder="Items" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="30">30 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Render Error */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5 text-destructive">
          <CardContent className="py-4 text-sm font-medium">Failed to load workflows.</CardContent>
        </Card>
      )}

      {/* Render skeleton while loading */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 max-w-sm">
            <Skeleton className="h-10 w-full rounded-md bg-muted/50" />
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <TableSkeleton />
          </div>
        </div>
      ) : (
        /* Render Table if data exists */
        tableData.length > 0 ? (
          <div className="flex flex-col gap-4">
            <DataTable
              columns={columns}
              data={tableData}
              pageSize={filters.pageSize}
              hidePagination={true}
            />
            {/* Server Side Pagination Controls */}
            <div className="flex items-center justify-between text-sm text-muted-foreground w-full px-1">
              <div>
                 Showing page <span className="font-semibold text-foreground">{filters.pageNo}</span> of {pageData?.totalPages || 1}
                 {!!pageData?.totalCount && ` (${pageData.totalCount} records total)`}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, pageNo: (prev.pageNo || 1) - 1 }))}
                  disabled={!pageData?.hasPreviousPage}
                  className="text-xs h-8 shadow-sm"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, pageNo: (prev.pageNo || 1) + 1 }))}
                  disabled={!pageData?.hasNextPage}
                  className="text-xs h-8 shadow-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <Card className="bg-card border-border border-dashed shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center pointer-events-none">
                <RefreshCw className="size-8 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground">No workflows yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Create your first automation workflow to start connecting and orchestrating tasks.
                </p>
              </div>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all duration-200"
              >
                <Plus className="size-4" /> Create your first workflow
              </Button>
            </CardContent>
          </Card>
        )
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Workflow</DialogTitle>
            <DialogDescription>
              Name your new automation. You can always change this later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Input
                id="name"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="Ex: Weekly Reports"
                className="col-span-4"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNew();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={createWorkflowMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleCreateNew}
              disabled={!newWorkflowName.trim() || createWorkflowMutation.isPending}
            >
              {createWorkflowMutation.isPending ? 'Creating...' : 'Create & Edit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TableSkeleton = () => (
  <div className="w-full">
    <div className="h-11 border-b border-border flex items-center px-4 bg-muted/20">
      <Skeleton className="h-4 w-32 bg-muted-foreground/10" />
      <Skeleton className="h-4 w-16 ml-auto bg-muted-foreground/10" />
    </div>
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-14 border-b border-border flex items-center px-4">
        <Skeleton className="h-4 w-48 bg-muted-foreground/10" />
      </div>
    ))}
  </div>
);

export default WorkflowListPage;
