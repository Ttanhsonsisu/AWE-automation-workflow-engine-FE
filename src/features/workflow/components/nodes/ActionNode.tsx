import React, { useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WorkflowNode } from '@/stores/workflowStore';
import { usePluginStore } from '@/stores/pluginStore';
import { BaseNode } from './BaseNode';
import { catalogToNodeCategories, getNodeDefinition } from '../../nodeDefinitions';
import { cn } from '@/lib/utils';
import { Ban, AlertTriangle } from 'lucide-react';

export const ActionNode: React.FC<NodeProps<WorkflowNode>> = ({ id, data, selected }) => {
  const { categories } = usePluginStore();
  const nodeGroups = useMemo(() => catalogToNodeCategories(categories), [categories]);
  const def = useMemo(() => getNodeDefinition(data.type as string, nodeGroups), [data.type, nodeGroups]);
  const Icon = def?.icon || Ban;
  const isConfigured = data.isConfigured !== false; 
  const isValid = data.uiState?.isValid !== false; // Default to valid if not set

  return (
    <BaseNode id={id} data={data} selected={selected}>
      {/* Top Handle - Target */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="size-3 bg-card border-2 border-foreground/30 transition-all duration-200 hover:scale-125 hover:bg-foreground opacity-0 group-hover:opacity-100 top-[-6px]"
      />
      {/* Left Handle - Target */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="size-3 bg-card border-2 border-foreground/30 transition-all duration-200 hover:scale-125 hover:bg-foreground opacity-0 group-hover:opacity-100 left-[-6px]"
      />

      {/* Validation Warning Badge */}
      {!isValid && (
        <div className="absolute -top-2.5 -left-2.5 z-10 bg-destructive rounded-full p-1 shadow-md border-2 border-background animate-in zoom-in duration-200">
          <AlertTriangle className="size-3 text-destructive-foreground" />
        </div>
      )}

      <div className={cn(
        'flex flex-col w-[260px] relative overflow-hidden rounded-t-xl transition-all duration-200',
        !isValid && 'ring-2 ring-destructive/60',
      )}>
        <div className={cn('h-1 w-full', def?.color || 'bg-slate-500')} />
        
        <div className="flex flex-col p-4 bg-card">
          <div className="flex items-center gap-3">
            <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border', def?.bgColor || 'bg-slate-500/10 border-slate-500/20')}>
              <Icon className={cn('size-5', def?.color?.replace('bg-', 'text-'))} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">{data.label}</h3>
              <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                {data.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
             <div className={cn(
               'size-2 rounded-full',
               !isValid ? 'bg-destructive animate-pulse' :
               isConfigured ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
             )} />
             <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
               {!isValid ? 'Validation Error' :
                isConfigured ? 'Configured' : 'Needs setup'}
             </span>
          </div>
        </div>
      </div>

      {/* Right Handle - Source */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="size-3 bg-foreground border-2 border-card transition-all duration-200 hover:scale-125 opacity-0 group-hover:opacity-100 right-[-6px]"
      />
      {/* Bottom Handle - Source */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="size-3 bg-foreground border-2 border-card transition-all duration-200 hover:scale-125 opacity-0 group-hover:opacity-100 bottom-[-6px]"
      />
    </BaseNode>
  );
};
