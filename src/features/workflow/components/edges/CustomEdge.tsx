import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
  useReactFlow,
} from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/stores/workflowStore';

type BranchKind = 'positive' | 'negative' | 'default';

const getBranchPresentation = (condition?: unknown, branchType?: unknown) => {
  if (branchType === 'true') {
    return { kind: 'positive' as const, label: 'TRUE', color: '#10b981' };
  }
  if (branchType === 'false') {
    return { kind: 'negative' as const, label: 'FALSE', color: '#ef4444' };
  }

  const rawCondition = typeof condition === 'string' ? condition.trim() : '';
  const normalized = rawCondition.toLowerCase().replace(/\s+/g, ' ');

  const isNegative =
    /^(false|failed|failure|error)$/.test(normalized) ||
    /(?:===?|is)\s*['"]?(?:false|failed|failure|error)['"]?/.test(normalized) ||
    /!={1,2}\s*['"]?true['"]?/.test(normalized) ||
    /^!\s*\{\{/.test(normalized) ||
    /(?:status|result|success)\s*(?:===?|is)\s*['"]?(?:false|failed|failure|error)['"]?/.test(normalized) ||
    /success\s*!={1,2}\s*true/.test(normalized);

  const kind: BranchKind = isNegative
    ? 'negative'
    : rawCondition
      ? 'positive'
      : 'default';

  if (kind === 'positive') {
    return { kind, label: 'TRUE', color: '#10b981' };
  }
  if (kind === 'negative') {
    return { kind, label: 'FALSE', color: '#ef4444' };
  }
  return { kind, label: '', color: 'hsl(var(--muted-foreground))' };
};

export const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  selected,
  animated,
  data,
}) => {
  const { setEdges } = useReactFlow();
  const setEdgeBranchType = useWorkflowStore((state) => state.setEdgeBranchType);
  const condition = data?.condition ?? data?.Condition;
  const branchType = data?.branchType ?? data?.BranchType;
  const branch = getBranchPresentation(condition, branchType);
  const markerId = `branch-arrow-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 24,
  });

  const onEdgeClick = (evt: React.MouseEvent<HTMLButtonElement>) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  const onBranchTypeChange = (
    evt: React.MouseEvent<HTMLButtonElement>,
    nextBranchType: 'true' | 'false'
  ) => {
    evt.stopPropagation();
    setEdgeBranchType(id, nextBranchType);
  };

  const strokeColor = animated ? 'hsl(var(--primary))' : branch.color;
  const strokeWidth = selected || animated || branch.kind !== 'default' ? 2.5 : 2;

  return (
    <>
      <svg aria-hidden="true" className="absolute size-0 overflow-hidden">
        <defs>
          <marker
            id={markerId}
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="6"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 12 6 L 0 12 z" fill={strokeColor} />
          </marker>
        </defs>
      </svg>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          transition: 'stroke 0.3s ease, stroke-width 0.2s ease',
        }}
        className={animated ? 'react-flow__edge-path-animated' : ''}
      />

      {(branch.kind !== 'default' || selected) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan z-50 flex items-center gap-1.5"
          >
            {branch.kind !== 'default' && (
              <div
                className={cn(
                  'flex max-w-56 items-center gap-1.5 rounded-full border bg-background/95 px-2.5 py-1 text-[10px] font-bold tracking-wide shadow-md backdrop-blur-sm',
                  branch.kind === 'positive' && 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
                  branch.kind === 'negative' && 'border-red-500/40 text-red-600 dark:text-red-400',
                )}
              >
                {branch.kind === 'positive' ? (
                  <Check className="size-3 shrink-0" />
                ) : branch.kind === 'negative' ? (
                  <X className="size-3 shrink-0" />
                ) : null}
                <span>{branch.label}</span>
              </div>
            )}

            {selected && (
              <div className="flex items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-lg backdrop-blur-sm">
                <button
                  type="button"
                  onClick={(event) => onBranchTypeChange(event, 'true')}
                  className={cn(
                    'rounded-md px-2 py-1 text-[10px] font-bold transition-colors',
                    branchType === 'true'
                      ? 'bg-emerald-500 text-white'
                      : 'text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600'
                  )}
                  aria-label="Set as TRUE branch"
                >
                  TRUE
                </button>
                <button
                  type="button"
                  onClick={(event) => onBranchTypeChange(event, 'false')}
                  className={cn(
                    'rounded-md px-2 py-1 text-[10px] font-bold transition-colors',
                    branchType === 'false'
                      ? 'bg-red-500 text-white'
                      : 'text-muted-foreground hover:bg-red-500/10 hover:text-red-600'
                  )}
                  aria-label="Set as FALSE branch"
                >
                  FALSE
                </button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="ml-0.5 size-5 shrink-0 rounded-full border border-background shadow-sm hover:scale-110"
                  onClick={onEdgeClick}
                  aria-label="Delete connection"
                >
                  <X className="size-3" />
                </Button>
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
