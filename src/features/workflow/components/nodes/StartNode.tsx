import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WorkflowNode } from '@/stores/workflowStore';
import { usePluginStore } from '@/stores/pluginStore';
import { BaseNode } from './BaseNode';
import { catalogToNodeCategories, getNodeDefinition } from '../../nodeDefinitions';
import { CheckCircle2, Play, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export const StartNode: React.FC<NodeProps<WorkflowNode>> = ({ id, data, selected }) => {
  const { categories } = usePluginStore();
  const nodeGroups = catalogToNodeCategories(categories);
  const def = getNodeDefinition(data.pluginMetadata?.name as string, nodeGroups);
  const Icon = def?.icon || Play;

  return (
    <BaseNode id={id} data={data} selected={selected} isStartNode>
      {/* Target handle is intentionally excluded, StartNode only has outputs */}

      {/* Start Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <Badge className="bg-primary hover:bg-primary text-[10px] leading-tight px-2 py-0.5 tracking-wider font-bold shadow-md ring-2 ring-primary">
          START
        </Badge>
      </div>

      <div className="flex flex-col p-4 w-[260px] relative top-1">
        <div className="flex items-center gap-3">
          <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-primary/20 bg-primary/10')}>
            <Icon className="size-5 text-primary" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{data.config?.nodeLabel || data.pluginMetadata?.displayName}</h3>
            <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
              {data.pluginMetadata?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Source Handles - Right and Bottom */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="size-3 bg-background border-2 border-primary transition-all duration-200 hover:scale-125 hover:bg-primary opacity-30 focus:opacity-100 hover:opacity-100 right-[-6px]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="size-3 bg-background border-2 border-primary transition-all duration-200 hover:scale-125 hover:bg-primary opacity-30 focus:opacity-100 hover:opacity-100 bottom-[-6px]"
      />
    </BaseNode>
  );
};
