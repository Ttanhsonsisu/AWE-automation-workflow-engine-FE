import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Workflow, 
  Filter, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Ban,
  ChevronDown
} from 'lucide-react';

import { 
  useExecutions, 
  useWorkflowDefinitionsDropdown, 
  useWorkflowInstanceStatusDropdown 
} from '@/api/executions';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { WorkflowExecution, ExecutionFilters } from '@/types/execution';

/**
 * Mapping status from C# WorkflowInstanceStatus Enum:
 * 0: Running
 * 1: Suspended
 * 2: Completed
 * 3: Failed
 * 4: Compensating
 * 5: Compensated
 * 6: Cancelled
 */
const statusConfig: Record<string | number, { label: string; icon: React.ReactNode; className: string }> = {
  // Numeric Mapping (C# Enum)
  0: { 
    label: 'Running', 
    icon: <Loader2 className="size-3.5 animate-spin" />, 
    className: 'border-blue-500/20 bg-blue-500/10 text-blue-500' 
  },
  1: { 
    label: 'Suspended', 
    icon: <Clock className="size-3.5" />, 
    className: 'border-amber-500/20 bg-amber-500/10 text-amber-500' 
  },
  2: { 
    label: 'Completed', 
    icon: <CheckCircle2 className="size-3.5" />, 
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' 
  },
  3: { 
    label: 'Failed', 
    icon: <XCircle className="size-3.5" />, 
    className: 'border-destructive/20 bg-destructive/10 text-destructive' 
  },
  4: { 
    label: 'Compensating', 
    icon: <RotateCcw className="size-3.5" />, 
    className: 'border-purple-500/20 bg-purple-500/10 text-purple-500' 
  },
  5: { 
    label: 'Compensated', 
    icon: <RotateCcw className="size-3.5" />, 
    className: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-500' 
  },
  6: { 
    label: 'Cancelled', 
    icon: <Ban className="size-3.5" />, 
    className: 'border-gray-500/20 bg-gray-500/10 text-gray-500' 
  },
  
  // String Mapping (In case API returns strings or for filter matching)
  'Running': { 
    label: 'Running', 
    icon: <Loader2 className="size-3.5 animate-spin" />, 
    className: 'border-blue-500/20 bg-blue-500/10 text-blue-500' 
  },
  'Suspended': { 
    label: 'Suspended', 
    icon: <Clock className="size-3.5" />, 
    className: 'border-amber-500/20 bg-amber-500/10 text-amber-500' 
  },
  'Completed': { 
    label: 'Completed', 
    icon: <CheckCircle2 className="size-3.5" />, 
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' 
  },
  'Failed': { 
    label: 'Failed', 
    icon: <XCircle className="size-3.5" />, 
    className: 'border-destructive/20 bg-destructive/10 text-destructive' 
  },
  'Compensating': { 
    label: 'Compensating', 
    icon: <RotateCcw className="size-3.5" />, 
    className: 'border-purple-500/20 bg-purple-500/10 text-purple-500' 
  },
  'Compensated': { 
    label: 'Compensated', 
    icon: <RotateCcw className="size-3.5" />, 
    className: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-500' 
  },
  'Cancelled': { 
    label: 'Cancelled', 
    icon: <Ban className="size-3.5" />, 
    className: 'border-gray-500/20 bg-gray-500/10 text-gray-500' 
  },
};

const getStatusConfig = (status: string | number) => {
  return statusConfig[status] || { 
    label: String(status), 
    icon: <AlertTriangle className="size-3.5" />, 
    className: 'border-border bg-muted text-muted-foreground' 
  };
};

const ExecutionsPage: React.FC = () => {
  const [filters, setFilters] = useState<ExecutionFilters>({
    page: 1,
    size: 20,
    definitionIds: [],
    status: undefined,
  });

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const { data: pageData, isLoading, error } = useExecutions(filters);
  const { data: definitions } = useWorkflowDefinitionsDropdown();
  const { data: statuses } = useWorkflowInstanceStatusDropdown();

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const columns: ColumnDef<WorkflowExecution>[] = [
    {
      accessorKey: 'id',
      header: 'Execution ID',
      cell: ({ row }) => (
        <span className="font-mono text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/50 max-w-[120px] block truncate" title={row.original.id}>
          {row.original.id}
        </span>
      ),
    },
    {
      accessorKey: 'definitionName',
      header: 'Workflow',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-sm leading-tight">
            {row.original.definitionName}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            Version {row.original.definitionVersion}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const config = getStatusConfig(row.original.status);
        return (
          <Badge variant="outline" className={cn("gap-1.5 px-2 py-0.5 rounded-full font-medium text-[11px]", config.className)}>
            {config.icon}
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'startTime',
      header: 'Start Time',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-foreground font-medium">
            {row.original.startTime ? format(new Date(row.original.startTime), 'MMM d, HH:mm:ss') : '-'}
          </span>
          {row.original.startTime && (
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(row.original.startTime), 'yyyy')}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'durationSeconds',
      header: 'Duration',
      cell: ({ row }) => {
        const seconds = row.original.durationSeconds;
        if (seconds === null || seconds === undefined) return <span className="text-xs text-muted-foreground">-</span>;
        return (
          <span className="text-xs font-mono font-medium text-muted-foreground">
            {seconds.toFixed(2)}s
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors hover:bg-primary/5"
          onClick={() => {
             window.open(`/workflows/${row.original.definitionId}/edit?instanceId=${row.original.id}`, '_blank');
          }}
        >
          <ExternalLink className="size-3.5" /> Details
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fadeInUp pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Execution History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and audit all workflow invocations in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                className="h-9 gap-2 shadow-sm bg-card"
                onClick={() => setFilters({
                    page: 1,
                    size: 20,
                    definitionIds: [],
                    status: undefined,
                })}
            >
                <RotateCcw className="size-3.5" /> Reset
            </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border-border/60 shadow-md overflow-visible bg-card/40 backdrop-blur-md">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground/80 flex items-center gap-1.5 uppercase tracking-wider ml-1">
                 <Workflow className="size-3" /> Workflow Definition
              </label>
              <Select 
                value={filters.definitionIds?.[0] || 'all'} 
                onValueChange={(val) => setFilters(prev => ({ 
                  ...prev, 
                  definitionIds: val === 'all' ? [] : [val], 
                  page: 1 
                }))}
              >
                <SelectTrigger className="h-10 bg-background/60 border-border/50 shadow-sm transition-all focus:ring-primary/20">
                  <SelectValue placeholder="All Workflows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workflows</SelectItem>
                  {definitions?.map(def => (
                    <SelectItem key={def.id} value={def.id}>
                      {def.name} <span className="text-[10px] opacity-50 ml-1">v{def.version}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground/80 flex items-center gap-1.5 uppercase tracking-wider ml-1">
                 <Filter className="size-3" /> Runtime Status
              </label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={(val) => setFilters(prev => ({ 
                  ...prev, 
                  status: val === 'all' ? undefined : val, 
                  page: 1 
                }))}
              >
                <SelectTrigger className="h-10 bg-background/60 border-border/50 shadow-sm transition-all focus:ring-primary/20">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses?.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("size-2 rounded-full", getStatusConfig(s.value).className.split(' ')[2] || 'bg-muted')} />
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="ghost" 
                className="w-full h-10 gap-2 text-muted-foreground hover:text-foreground border border-dashed border-border/50"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              >
                <Calendar className="size-3.5" />
                Advanced Filters
                <ChevronDown className={cn("size-3.5 transition-transform", isAdvancedOpen && "rotate-180")} />
              </Button>
            </div>
          </div>

          <Collapsible open={isAdvancedOpen}>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pb-2 border-t border-border/40 pt-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest ml-1">Created From</label>
                  <Input 
                      type="date" 
                      className="h-9 bg-background/40 border-border/40 text-xs shadow-inner"
                      value={filters.createdFrom || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, createdFrom: e.target.value || undefined, page: 1 }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest ml-1">Created To</label>
                  <Input 
                      type="date" 
                      className="h-9 bg-background/40 border-border/40 text-xs shadow-inner"
                      value={filters.createdTo || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, createdTo: e.target.value || undefined, page: 1 }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest ml-1">Start Time From</label>
                  <Input 
                      type="date" 
                      className="h-9 bg-background/40 border-border/40 text-xs shadow-inner"
                      value={filters.startTimeFrom || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, startTimeFrom: e.target.value || undefined, page: 1 }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest ml-1">Start Time To</label>
                  <Input 
                      type="date" 
                      className="h-9 bg-background/40 border-border/40 text-xs shadow-inner"
                      value={filters.startTimeTo || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, startTimeTo: e.target.value || undefined, page: 1 }))}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5 text-destructive overflow-hidden">
          <CardContent className="py-12 flex flex-col items-center justify-center gap-4">
            <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="size-8" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-bold">Failed to load execution logs</h3>
                <p className="text-sm opacity-80 mt-1 max-w-sm">The server might be temporarily unavailable. Please try again or contact support.</p>
            </div>
            <Button variant="outline" className="mt-2 border-destructive/20 hover:bg-destructive/10" onClick={() => window.location.reload()}>
                Retry connection
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[500px] w-full rounded-2xl bg-muted/30 border border-border/30" />
        </div>
      ) : pageData?.items?.length ? (
        <div className="flex flex-col gap-5">
          <DataTable
            columns={columns}
            data={pageData.items}
            hidePagination={true}
          />
          
          {/* Enhanced Pagination Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 py-4 px-2 bg-card/20 rounded-xl border border-border/40 shadow-sm">
            <div className="flex items-center gap-3 order-2 sm:order-1">
               <div className="text-xs font-semibold text-muted-foreground px-3 py-1.5 bg-background/50 rounded-lg border border-border/30 shadow-subtle flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  Total Records: <span className="text-foreground font-bold">{pageData.totalCount}</span>
               </div>
               <p className="text-[11px] text-muted-foreground font-medium hidden md:block">
                  Page <span className="text-foreground font-bold">{pageData.pageNumber}</span> of {pageData.totalPages}
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
        <Card className="bg-card/30 border-border/50 border-dashed shadow-inner">
          <CardContent className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full animate-pulse" />
                <div className="relative size-20 rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-xl">
                  <Workflow className="size-10 text-primary drop-shadow-sm" />
                </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-foreground">No executions discovered</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                Your filters are too restrictive or no workflows have been triggered yet. Try widening your search criteria.
              </p>
            </div>
            <Button 
                variant="secondary" 
                size="default" 
                className="mt-2 rounded-xl shadow-lg border border-border/50"
                onClick={() => setFilters({
                    page: 1,
                    size: 20,
                    definitionIds: [],
                    status: undefined,
                })}
            >
                <RotateCcw className="size-4 mr-2" /> Reset all filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExecutionsPage;
