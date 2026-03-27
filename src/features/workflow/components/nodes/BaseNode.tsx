import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export interface BaseNodeProps {
  id: string;
  data: any;
  selected: boolean;
  children?: React.ReactNode;
  isStartNode?: boolean;
}

export const BaseNode: React.FC<BaseNodeProps> = ({
  data,
  selected,
  children,
  isStartNode,
}) => {
  const status = data?.status || 'idle';

  let statusRingClass = '';
  if (status === 'running') {
    statusRingClass = 'ring-[3px] ring-primary shadow-[0_0_25px_hsl(var(--primary)/0.5)] animate-pulse border-primary';
  } else if (status === 'success') {
    statusRingClass = 'ring-2 ring-emerald-500 border-emerald-500';
  } else if (status === 'error') {
    statusRingClass = 'ring-2 ring-destructive animate-shake border-destructive';
  }

  return (
    <div
      className={cn(
        'relative bg-card rounded-[14px] min-w-[240px] shadow-sm transition-all duration-300 border border-border group',
        selected && 'ring-2 ring-primary border-primary shadow-md',
        statusRingClass,
        isStartNode && 'border-primary ring-2 ring-primary shadow-[0_0_35px_hsl(var(--primary)/0.7)] bg-primary/10' // Huge glow for start node
      )}
    >
      {status === 'running' && (
        <div className="absolute -top-3 -right-3 bg-background rounded-full p-1 shadow-sm border border-primary">
          <Loader2 className="size-4 text-primary animate-spin" />
        </div>
      )}
      {status === 'success' && (
        <div className="absolute -top-3 -right-3 bg-background rounded-full p-1 shadow-sm border border-emerald-500">
          <CheckCircle2 className="size-4 text-emerald-500" />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute -top-3 -right-3 bg-background rounded-full p-1 shadow-sm border border-destructive">
          <XCircle className="size-4 text-destructive" />
        </div>
      )}

      {/* Main Node Content wrapper */}
      <div className="p-0">
        {children}
      </div>

      {/* Optional: Error Tooltip on Hover if error */}
      {status === 'error' && (
        <div className="absolute top-1/2 left-full ml-2 -translate-y-1/2 bg-destructive text-destructive-foreground text-[10px] uppercase font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Execution Failed
        </div>
      )}
      
      {/* Running Title Below Node */}
      {status === 'running' && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-primary/90 flex items-center gap-1.5 whitespace-nowrap animate-pulse">
          <Loader2 className="size-3 animate-spin" />
          Running...
        </div>
      )}
    </div>
  );
};

export const CustomHandle: React.FC<React.ComponentProps<typeof Handle> & { hideUnlessHovered_or_Connected?: boolean }> = ({ 
  className, 
  ...props 
}) => {
  return (
    <Handle
      className={cn(
        'size-3 bg-background border-2 border-primary transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-125 focus:opacity-100',
        className
      )}
      {...props}
    />
  );
};
