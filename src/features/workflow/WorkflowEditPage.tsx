import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  MarkerType,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowStore, type WorkflowNode, type NodeCategory } from '@/stores/workflowStore';
import { WorkflowTopbar } from './components/WorkflowTopbar';
import { NodeLibrarySheet } from './components/NodeLibrarySheet';
import { NodeConfigPanel } from './components/NodeConfigPanel';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Custom Nodes / Edges
import { StartNode } from './components/nodes/StartNode';
import { ActionNode } from './components/nodes/ActionNode';
import { CustomEdge } from './components/edges/CustomEdge';
import { ExecutionLogPanel } from './components/ExecutionLogPanel';

// ── Register custom node/edge types (must be outside component!) ──
const nodeTypes: NodeTypes = {
  startNode: StartNode,
  actionNode: ActionNode,
};

const edgeTypes: EdgeTypes = {
  customEdge: CustomEdge,
};

// ── Inner flow component (needs ReactFlowProvider context) ──
const WorkflowCanvas: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { screenToFlowPosition } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodeLibraryOpen, setNodeLibraryOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setWorkflow,
    setSelectedNode,
    pushHistory,
    canvasMode,
  } = useWorkflowStore();

  const isExecutionMode = canvasMode === 'execution';

  // Initialize demo workflow on mount
  useEffect(() => {
    if (id) {
      const demoNodes: WorkflowNode[] = [
        {
          id: 'trigger-1',
          type: 'startNode',
          position: { x: 300, y: 50 },
          data: {
            pluginMetadata: {
              name: 'webhook_trigger',
              displayName: 'Webhook',
              category: 'trigger',
              description: 'Listen for incoming requests',
            },
            config: {
              inputs: {},
              isConfigured: true,
              stepId: 'Step_1_Start',
            },
            uiState: { isValid: true },
            status: 'idle',
          },
        },
        {
          id: 'action-1',
          type: 'actionNode',
          position: { x: 300, y: 250 },
          data: {
            pluginMetadata: {
              name: 'http_request',
              displayName: 'HTTP Request',
              category: 'api',
              description: 'Call external API',
            },
            config: {
              inputs: {},
              isConfigured: false,
              stepId: 'Step_2_Action1',
            },
            uiState: { isValid: false },
            status: 'idle',
          },
        },
        {
          id: 'action-2',
          type: 'actionNode',
          position: { x: 300, y: 450 },
          data: {
            pluginMetadata: {
              name: 'send_email',
              displayName: 'Send Email',
              category: 'action',
              description: 'Notify on success',
            },
            config: {
              inputs: {},
              isConfigured: true,
              stepId: 'Step_3_Action2',
            },
            uiState: { isValid: true },
            status: 'idle',
          },
        },
      ];

      const demoEdges = [
        { id: 'e-t1-a1', source: 'trigger-1', target: 'action-1', type: 'customEdge' },
        { id: 'e-a1-a2', source: 'action-1', target: 'action-2', type: 'customEdge' },
      ];

      setWorkflow(id, `Workflow ${id}`, demoNodes, demoEdges);
    }
  }, [id, setWorkflow]);

  // ── Drag & Drop from Node Library ──
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow-node-type');
      const label = event.dataTransfer.getData('application/reactflow-node-label');
      const category = event.dataTransfer.getData('application/reactflow-node-category') as NodeCategory;
      const description = event.dataTransfer.getData('application/reactflow-node-description');

      // Parse full plugin data if available
      let pluginData: Record<string, unknown> = {};
      try {
        const rawPluginData = event.dataTransfer.getData('application/reactflow-plugin-data');
        if (rawPluginData) {
          pluginData = JSON.parse(rawPluginData);
        }
      } catch {
        // Ignore parse errors
      }

      if (!type || !label) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const isStart = category === 'trigger' || category === 'Trigger';

      // Build plugin metadata (only include defined values)
      const pluginMeta: any = {
        name: type,
        displayName: label,
        category,
        description,
      };
      if (pluginData.executionMode) pluginMeta.executionMode = pluginData.executionMode;
      if (pluginData.inputSchema) pluginMeta.inputSchema = pluginData.inputSchema;
      if (pluginData.outputSchema) pluginMeta.outputSchema = pluginData.outputSchema;
      if (pluginData.packageId) pluginMeta.packageId = pluginData.packageId;
      if (pluginData.activeVersion) pluginMeta.version = pluginData.activeVersion;

      const newNode: WorkflowNode = {
        id: `${type}-${Date.now()}`,
        type: isStart ? 'startNode' : 'actionNode',
        position,
        data: {
          pluginMetadata: pluginMeta,
          config: {
            inputs: {},
            isConfigured: false,
            stepId: `${label.replace(/\s+/g, '_')}_${Date.now().toString().slice(-6)}`,
          },
          uiState: { isValid: true },
          status: 'idle',
        },
      };

      addNode(newNode);
    },
    [screenToFlowPosition, addNode]
  );

  // ── Selection tracking ──
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: WorkflowNode) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: WorkflowNode) => {
      setEditingNodeId(node.id);
      setNodeLibraryOpen(false); // Close library if open
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // ── Save history on node drag stop ──
  const onNodeDragStop = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        useWorkflowStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        useWorkflowStore.getState().redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        useWorkflowStore.getState().markSaved();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden relative">
      <WorkflowTopbar />

      <div className="flex flex-row flex-1 w-full overflow-hidden relative">
        <div className="flex-1 h-full min-w-0 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={isExecutionMode ? undefined : onNodesChange}
            onEdgesChange={isExecutionMode ? undefined : onEdgesChange}
            onConnect={isExecutionMode ? undefined : onConnect}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={isExecutionMode ? undefined : onNodeDoubleClick}
            onPaneClick={onPaneClick}
            onNodeDragStop={isExecutionMode ? undefined : onNodeDragStop}
            onDragOver={isExecutionMode ? undefined : onDragOver}
            onDrop={isExecutionMode ? undefined : onDrop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable={!isExecutionMode}
            nodesConnectable={!isExecutionMode}
            elementsSelectable={true}
            edgesFocusable={!isExecutionMode}
            defaultEdgeOptions={{
              type: 'customEdge',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: 'hsl(var(--muted-foreground)/0.4)',
              },
            }}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode={['Backspace', 'Delete']}
            connectionLineStyle={{ stroke: 'hsl(var(--primary))', strokeWidth: 2.5 }}
            className="!bg-slate-50 dark:!bg-slate-950/50"
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="hsl(var(--primary)/0.15)" />
            <Controls
              position="bottom-right"
              className="!bg-card/60 !backdrop-blur-md !border !border-primary/20 !rounded-xl !shadow-lg [&>button]:!bg-transparent [&>button]:!border-primary/10 [&>button]:!text-foreground [&>button:hover]:!bg-primary/5 [&>button_svg]:!fill-primary"
            />
          </ReactFlow>

          {/* ── Floating Add Button (Editor Mode Only) ── */}
          {!isExecutionMode && (
            <TooltipProvider delayDuration={100}>
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setNodeLibraryOpen(true)}
                      size="icon"
                      className="size-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-105"
                    >
                      <Plus className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Add Node</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}
        </div>

        {/* Execution Log Right Panel */}
        {isExecutionMode && (
          <aside className="w-[400px] min-w-[400px] max-w-[400px] h-full border-l border-border bg-card flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right-4 duration-300">
            <ExecutionLogPanel />
          </aside>
        )}
      </div>

      {/* Node Library Sheet */}
      <NodeLibrarySheet open={nodeLibraryOpen} onOpenChange={setNodeLibraryOpen} />

      {/* Node Config Panel */}
      <NodeConfigPanel nodeId={editingNodeId} onClose={() => setEditingNodeId(null)} />
    </div>
  );
};

// ── Page wrapper with ReactFlowProvider ──
const WorkflowEditPage: React.FC = () => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas />
    </ReactFlowProvider>
  );
};

export default WorkflowEditPage;
