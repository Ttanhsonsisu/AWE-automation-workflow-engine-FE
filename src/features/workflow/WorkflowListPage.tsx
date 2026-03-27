import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { Plus, MoreHorizontal, Copy, Trash, Play, Pause, RefreshCw, Edit } from 'lucide-react';

import { WorkflowSchema } from '@/types';
import {
  useWorkflows,
  useCreateWorkflow,
  useUpdateWorkflowStatus,
  useDeleteWorkflow,
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

const WorkflowListPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: workflows, isLoading, error } = useWorkflows();
  const updateStatusMutation = useUpdateWorkflowStatus();
  const createWorkflowMutation = useCreateWorkflow();
  const deleteWorkflowMutation = useDeleteWorkflow();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');

  // Define Columns
  const columns: ColumnDef<WorkflowSchema>[] = [
    {
      accessorKey: 'name',
      header: 'Workflow Name',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-[14px] leading-tight cursor-pointer hover:underline" onClick={() => navigate(`/workflows/${row.original.id}/edit`)}>
            {row.original.name}
          </span>
          <span className="text-xs text-muted-foreground font-mono mt-0.5" title={row.original.id}>
            {row.original.id.substring(0, 8)}...
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Switch / Status',
      cell: ({ row }) => {
        const wf = row.original;
        const isPublished = wf.status === 'Active';
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={isPublished}
              onCheckedChange={(checked) => {
                updateStatusMutation.mutate({
                  id: wf.id,
                  status: checked ? 'Active' : 'Draft',
                });
              }}
              // Disabled if changing
              disabled={updateStatusMutation.isPending && updateStatusMutation.variables?.id === wf.id}
            />
            <Badge
              variant="outline"
              className={`text-[10px] leading-none px-2 py-0.5 uppercase tracking-wider ${
                isPublished
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                  : 'border-amber-500/20 bg-amber-500/10 text-amber-500'
              }`}
            >
              {isPublished ? 'Active' : 'Draft'}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'lastTriggeredAt',
      header: 'Last Run',
      cell: ({ row }) => {
        const date = row.original.lastTriggeredAt;
        if (!date) return <span className="text-xs text-muted-foreground italic">Never</span>;
        return (
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(date), { addSuffix: true })}
          </span>
        );
      },
    },
    {
      accessorKey: 'updatedAt',
      header: 'Last Modified',
      cell: ({ row }) => {
        const date = row.original.updatedAt;
        return (
          <span className="text-xs text-muted-foreground font-medium">
            {formatDistanceToNow(new Date(date), { addSuffix: true })}
          </span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const wf = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px] bg-card border-border shadow-xl">
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate(`/workflows/${wf.id}/edit`)} className="cursor-pointer gap-2 group focus:bg-accent focus:text-accent-foreground">
                <Edit className="size-3.5 group-hover:text-primary transition-colors" /> Edit Canvas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(wf.id)} className="cursor-pointer gap-2">
                <Copy className="size-3.5 text-muted-foreground" /> Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => deleteWorkflowMutation.mutate(wf.id)}
                className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground gap-2 group"
                disabled={deleteWorkflowMutation.isPending}
              >
                <Trash className="size-3.5 group-hover:scale-110 transition-transform" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        workflows && workflows.length > 0 ? (
          <DataTable
            columns={columns}
            data={workflows}
            searchKey="name"
            searchPlaceholder="Search workflows by name..."
          />
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
