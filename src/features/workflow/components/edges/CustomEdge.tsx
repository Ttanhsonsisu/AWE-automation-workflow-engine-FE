import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
  useReactFlow,
} from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  animated,
}) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 24, // Smoother curve corners
  });

  const onEdgeClick = (evt: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((e) => e.id !== id));
  };

  // Determine styles dynamically -> if animated (running state) it breathes stroke-primary
  const strokeColor = animated
    ? 'hsl(var(--primary))' // Glowing blue/violet outline
    : selected
    ? 'hsl(var(--foreground))' // Darker when clicked
    : 'hsl(var(--muted-foreground)/0.4)'; // Slate 400 faint line otherwise

  const strokeWidth = selected || animated ? 2.5 : 2;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          transition: 'stroke 0.3s ease, stroke-width 0.2s ease',
        }}
        className={animated ? 'react-flow__edge-path-animated' : ''}
      />
      {/* Edge Hover Label -> Show X button when selected OR hovered via CSS group or interactive overlay  */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`nodrag nopan ${selected ? 'opacity-100' : 'opacity-0'} hover:opacity-100 transition-opacity z-50`}
        >
          <Button
            variant="destructive"
            size="icon"
            className="size-5 rounded-full shadow-lg border border-background hover:scale-110"
            onClick={onEdgeClick}
          >
            <X className="size-3" />
          </Button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
