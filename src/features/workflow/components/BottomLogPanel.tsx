import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { ExecutionLogPanel } from './ExecutionLogPanel';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Constants ──
const MIN_HEIGHT = 42;    // collapsed = header only
const DEFAULT_HEIGHT = 280;
const MAX_HEIGHT_RATIO = 0.65; // max 65% of viewport

interface BottomLogPanelProps {
  /** Whether the panel is visible at all */
  visible: boolean;
  /** Callback to hide the panel entirely */
  onClose: () => void;
}

export const BottomLogPanel: React.FC<BottomLogPanelProps> = ({ visible, onClose }) => {
  const { isExecuting, canvasMode } = useWorkflowStore();
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // Auto-expand when execution starts
  useEffect(() => {
    if (isExecuting && isCollapsed) {
      setIsCollapsed(false);
      setPanelHeight(prev => Math.max(prev, DEFAULT_HEIGHT));
    }
  }, [isExecuting]);

  // ── Drag resize logic ──
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartHeight.current = panelHeight;
    },
    [panelHeight]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
      const delta = dragStartY.current - e.clientY; // dragging up = bigger
      const newHeight = Math.max(MIN_HEIGHT + 20, Math.min(maxHeight, dragStartHeight.current + delta));
      setPanelHeight(newHeight);
      
      // Auto-collapse if dragged very small
      if (newHeight <= MIN_HEIGHT + 30) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  const toggleCollapse = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setPanelHeight(prev => Math.max(prev, DEFAULT_HEIGHT));
    } else {
      setIsCollapsed(true);
    }
  }, [isCollapsed]);

  const toggleMaximize = useCallback(() => {
    const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
    if (panelHeight >= maxHeight - 10) {
      setPanelHeight(DEFAULT_HEIGHT);
    } else {
      setPanelHeight(maxHeight);
      setIsCollapsed(false);
    }
  }, [panelHeight]);

  if (!visible) return null;

  const displayHeight = isCollapsed ? MIN_HEIGHT : panelHeight;

  return (
    <div
      ref={panelRef}
      className={cn(
        'absolute bottom-0 left-0 right-0 z-20 flex flex-col bg-card border-t border-border/60 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]',
        'transition-shadow duration-300',
        isDragging && 'shadow-[0_-8px_32px_rgba(0,0,0,0.15)]',
      )}
      style={{
        height: displayHeight,
        transition: isDragging ? 'none' : 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* ── Drag Handle ── */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          'flex items-center justify-center h-[6px] cursor-row-resize group shrink-0 relative',
          'before:absolute before:inset-x-0 before:-top-2 before:h-6',  // larger hit area
        )}
      >
        <div
          className={cn(
            'w-12 h-1 rounded-full transition-all duration-200',
            isDragging
              ? 'bg-primary w-16 h-1.5'
              : 'bg-border group-hover:bg-primary/50 group-hover:w-16'
          )}
        />
      </div>

      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-3 py-1 shrink-0 border-b border-border/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            Execution Log
          </span>
          {isExecuting && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-primary">
              <span className="relative flex size-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full size-1.5 bg-primary" />
              </span>
              Running
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {/* Collapse/Expand */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="size-6 text-muted-foreground hover:text-foreground"
          >
            {isCollapsed ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </Button>

          {/* Maximize/Restore */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMaximize}
            className="size-6 text-muted-foreground hover:text-foreground"
          >
            {panelHeight >= window.innerHeight * MAX_HEIGHT_RATIO - 10 ? (
              <Minimize2 className="size-3" />
            ) : (
              <Maximize2 className="size-3" />
            )}
          </Button>

          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-6 text-muted-foreground hover:text-destructive"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0 overflow-hidden animate-in fade-in duration-200">
          <ExecutionLogPanel />
        </div>
      )}
    </div>
  );
};
