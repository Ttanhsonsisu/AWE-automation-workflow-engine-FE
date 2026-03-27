import React from 'react';
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
  EdgeLabelRenderer,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';

const WorkflowEdge: React.FC<EdgeProps> = (props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    animated,
  } = props;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const deleteNode = useWorkflowStore((s) => s.onEdgesChange);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode([{ id, type: 'remove' }]);
  };

  return (
    <>
      {/* Edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? 'hsl(234 89% 63%)' : 'hsl(215 27.9% 30%)',
          strokeWidth: selected ? 2.5 : 2,
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
        className={animated ? 'react-flow__edge-path--animated' : ''}
      />

      {/* Delete button on hover/select */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              onClick={handleDelete}
              className="flex items-center justify-center size-5 rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/80 transition-all duration-150 hover:scale-110"
            >
              <X className="size-3" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default WorkflowEdge;
