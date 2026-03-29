import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { catalogToNodeCategories, getNodeDefinition } from '../nodeDefinitions';
import { usePluginStore } from '@/stores/pluginStore';
import type { WorkflowNode } from '@/stores/workflowStore';

const WorkflowNodeComponent: React.FC<NodeProps<WorkflowNode>> = ({ data, selected }) => {
  const { categories } = usePluginStore();
  const nodeGroups = catalogToNodeCategories(categories);
  const definition = getNodeDefinition((data.pluginMetadata?.name as string) || (data.config?.nodeLabel as string) || '', nodeGroups);
  const Icon = definition?.icon;

  // Category colors
  const categoryColors: Record<string, { header: string; ring: string; indicator: string }> = {
    trigger: { header: 'bg-orange-500', ring: 'ring-orange-500/30', indicator: 'bg-orange-400' },
    action: { header: 'bg-blue-500', ring: 'ring-blue-500/30', indicator: 'bg-blue-400' },
    logic: { header: 'bg-emerald-500', ring: 'ring-emerald-500/30', indicator: 'bg-emerald-400' },
    api: { header: 'bg-violet-500', ring: 'ring-violet-500/30', indicator: 'bg-violet-400' },
    database: { header: 'bg-pink-500', ring: 'ring-pink-500/30', indicator: 'bg-pink-400' },
    output: { header: 'bg-cyan-500', ring: 'ring-cyan-500/30', indicator: 'bg-cyan-400' },
  };

  const colors = categoryColors[data.pluginMetadata?.category as string] || categoryColors.action;

  return (
    <div
      className={cn(
        'relative bg-card border border-border rounded-xl shadow-md min-w-[180px] max-w-[220px]',
        'transition-all duration-200 group',
        selected && `ring-2 ${colors.ring} shadow-lg`,
        !selected && 'hover:shadow-lg hover:border-border/80'
      )}
    >
      {data.pluginMetadata?.category !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-card hover:!bg-primary !-top-1.5 transition-colors duration-200"
        />
      )}

      {/* Header with category color */}
      <div className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-t-xl', colors.header)}>
        <div className="flex items-center justify-center size-7 rounded-lg bg-white/20 shrink-0">
          {Icon ? (
            <Icon className="size-4 text-white" />
          ) : (
            <div className="size-4 rounded-sm bg-white/40" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-white truncate leading-tight">
            {(data.config?.nodeLabel as string) || (data.pluginMetadata?.displayName as string)}
          </span>
          <span className="text-[10px] text-white/70 capitalize leading-tight">
            {data.pluginMetadata?.category as string}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        {data.pluginMetadata?.description ? (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            {data.pluginMetadata?.description as string}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground/50 italic">
            Double-click to configure
          </p>
        )}

        {/* Configured indicator */}
        {data.config?.isConfigured !== undefined && (
          <div className="flex items-center gap-1.5 mt-2">
            <div
              className={cn(
                'size-1.5 rounded-full',
                data.config?.isConfigured ? 'bg-emerald-400' : 'bg-amber-400'
              )}
            />
            <span className="text-[10px] text-muted-foreground">
              {data.config?.isConfigured ? 'Configured' : 'Needs setup'}
            </span>
          </div>
        )}
      </div>

      {data.pluginMetadata?.category !== 'output' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-card hover:!bg-primary !-bottom-1.5 transition-colors duration-200"
        />
      )}
    </div>
  );
};

export default memo(WorkflowNodeComponent);
