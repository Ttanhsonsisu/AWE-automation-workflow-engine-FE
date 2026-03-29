import React, { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, GripVertical, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePluginStore } from '@/stores/pluginStore';
import {
  catalogToNodeCategories,
  type NodeDefinition,
} from '../nodeDefinitions';

interface NodeLibrarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Draggable item for a single node ──
const DraggableNode: React.FC<{ node: NodeDefinition }> = ({ node }) => {
  const Icon = node.icon;

  const onDragStart = (e: React.DragEvent) => {
    // Store all the metadata needed for node creation
    const transferData = {
      type: node.type,
      label: node.label,
      category: node.category,
      description: node.description,
      executionMode: node.executionMode,
      inputSchema: node.inputSchema,
      outputSchema: node.outputSchema,
      packageId: node.packageId,
      activeVersion: node.activeVersion,
      icon: '', // icon name not needed for data, resolved at render
    };
    e.dataTransfer.setData('application/reactflow-node-type', node.type);
    e.dataTransfer.setData('application/reactflow-node-label', node.label);
    e.dataTransfer.setData('application/reactflow-node-category', node.category);
    e.dataTransfer.setData('application/reactflow-node-description', node.description);
    e.dataTransfer.setData('application/reactflow-plugin-data', JSON.stringify(transferData));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing 
                 hover:bg-accent/60 transition-all duration-150 group border border-transparent hover:border-border/50"
    >
      <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0', node.bgColor)}>
        <Icon className={cn('size-4', node.color.replace('bg-', 'text-'))} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate leading-tight">{node.label}</p>
          {node.activeVersion && (
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] px-1.5 py-0 h-4 font-mono shrink-0',
                node.activeVersion === 'Built-in'
                  ? 'border-emerald-500/30 text-emerald-500'
                  : 'border-blue-500/30 text-blue-500'
              )}
            >
              {node.activeVersion}
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
          {node.description}
        </p>
      </div>
      <GripVertical className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
    </div>
  );
};

export const NodeLibrarySheet: React.FC<NodeLibrarySheetProps> = ({ open, onOpenChange }) => {
  const [search, setSearch] = useState('');
  const { categories, isLoading, error, hasFetched, fetchCatalog } = usePluginStore();

  // Fetch plugin catalog when sheet opens for the first time
  useEffect(() => {
    if (open && !hasFetched && !isLoading) {
      fetchCatalog();
    }
  }, [open, hasFetched, isLoading, fetchCatalog]);

  // Convert API categories to node definitions
  const nodeGroups = useMemo(() => catalogToNodeCategories(categories), [categories]);

  // Filter by search term
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return nodeGroups;

    const q = search.toLowerCase().trim();
    return nodeGroups
      .map((group) => ({
        ...group,
        nodes: group.nodes.filter(
          (n) =>
            n.label.toLowerCase().includes(q) ||
            n.description.toLowerCase().includes(q) ||
            n.type.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.nodes.length > 0);
  }, [nodeGroups, search]);

  const totalPlugins = categories.reduce((sum, cat) => sum + cat.plugins.length, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="right" className="w-80 sm:w-96 p-0 flex flex-col" aria-describedby={undefined}>
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">
              Node Library
            </SheetTitle>
            {hasFetched && (
              <Badge variant="secondary" className="text-[10px] font-mono">
                {totalPlugins} plugins
              </Badge>
            )}
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm plugin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="size-8 text-primary animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Đang tải danh sách plugin...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="size-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-destructive">Không thể tải plugin</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCatalog()}
                className="gap-2 mt-2"
              >
                <RefreshCw className="size-3.5" />
                Thử lại
              </Button>
            </div>
          )}

          {/* Plugin List */}
          {!isLoading && !error && filteredCategories.length > 0 && (
            <Accordion
              type="multiple"
              defaultValue={nodeGroups.map((c) => c.category)}
            >
              {filteredCategories.map(({ category, label, nodes }) => (
                <AccordionItem key={category} value={category} className="border-none">
                  <AccordionTrigger className="py-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline">
                    {label}
                    <span className="text-[10px] font-normal ml-1 text-muted-foreground/60">
                      ({nodes.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="flex flex-col gap-0.5">
                      {nodes.map((node) => (
                        <DraggableNode key={node.type} node={node} />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          {/* Empty search results */}
          {!isLoading && !error && filteredCategories.length === 0 && hasFetched && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="size-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Không tìm thấy plugin</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Thử từ khóa khác</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
