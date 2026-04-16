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

import { useWorkflow } from '@/api/workflows';
import { toast } from 'sonner';

import { useWorkflowStore, type WorkflowNode, type NodeCategory } from '@/stores/workflowStore';
import { WorkflowTopbar } from './components/WorkflowTopbar';
import { NodeLibrarySheet } from './components/NodeLibrarySheet';
import { NodeConfigPanel } from './components/NodeConfigPanel';
import { WorkflowInputConfigDialog } from './WorkflowInputConfigDialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePluginStore } from '@/stores/pluginStore';
import { hydrateWorkflowFromDefinition, identifyPendingPluginDetails } from './utils/workflowHydration';
import { usePreloadPluginDetails } from './hooks/usePreloadPluginDetails';

// Custom Nodes / Edges
import { StartNode } from './components/nodes/StartNode';
import { ActionNode } from './components/nodes/ActionNode';
import { CustomEdge } from './components/edges/CustomEdge';
import { BottomLogPanel } from './components/BottomLogPanel';

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
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [logPanelVisible, setLogPanelVisible] = useState(false);

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
    isExecuting,
  } = useWorkflowStore();

  const { categories, hasFetched, isLoading: isCatalogLoading, fetchCatalog } = usePluginStore();

  const isExecutionMode = canvasMode === 'execution';

  // Ensure plugin catalog is ready when entering edit page so node icon/style renders immediately.
  useEffect(() => {
    if (!hasFetched && !isCatalogLoading) {
      fetchCatalog();
    }
  }, [hasFetched, isCatalogLoading, fetchCatalog]);

  const handlePreloadProgress = useCallback((nodeId: string, status: 'fetching' | 'success' | 'error', error?: Error) => {
    if (status === 'error') {
      console.warn(`Failed to preload plugin detail for node ${nodeId}:`, error?.message);
    }
  }, []);

  // Preload plugin details for DynamicDll nodes (so forms render instantly)
  usePreloadPluginDetails(nodes, {
    onProgress: handlePreloadProgress,
  });

  // Fetch true definition from backend
  const { data: workflowDef, isLoading: isFetching } = useWorkflow(id || '');

  // Initialize workflow on mount or when API data changes
  useEffect(() => {
    if (id && workflowDef) {
      let initialNodes = workflowDef.uiJson?.nodes || [];
      let initialEdges = workflowDef.uiJson?.edges || [];

      // ─────────────────────────────────────────────────────────────
      // HYDRATION LOGIC: Rebuild UI layout from backend Definition
      // Target: workflows created via API without UiJson (null)
      // ─────────────────────────────────────────────────────────────
      if (initialNodes.length === 0 && workflowDef.definition?.Steps?.length > 0) {
        console.log('[WorkflowEditPage] Triggering hydration for workflow without UiJson');
        toast.info("Tái tạo giao diện", { 
          description: "Đang tự động vẽ giao diện từ dữ liệu API gốc..." 
        });

        try {
          const hydrationResult = hydrateWorkflowFromDefinition(
            workflowDef.definition.Steps,
            workflowDef.definition.Transitions || [],
            categories
          );

          initialNodes = hydrationResult.nodes;
          initialEdges = hydrationResult.edges;

          console.log('[WorkflowEditPage] Hydration complete:', {
            nodeCount: initialNodes.length,
            edgeCount: initialEdges.length,
          });

          // Log which nodes need plugin detail fetching
          const pendingDetails = identifyPendingPluginDetails(initialNodes);
          if (pendingDetails.length > 0) {
            console.log('[WorkflowEditPage] Nodes pending plugin detail:', pendingDetails);
          }
        } catch (error) {
          console.error('[WorkflowEditPage] Hydration failed:', error);
          toast.error("Lỗi tái tạo giao diện", {
            description: "Không thể tái tạo giao diện từ dữ liệu. Vui lòng kiểm tra log."
          });
        }
      }

      // ─────────────────────────────────────────────────────────────
      // SYNC LOGIC: Ensure nodes mirror the true backend state
      // Updates execution metadata, versions from latest backend data
      // ─────────────────────────────────────────────────────────────
      const backendSteps = workflowDef.definition?.Steps || [];
      if (initialNodes.length > 0 && backendSteps.length > 0) {
        initialNodes = initialNodes.map((node: any) => {
          const matchingStep = backendSteps.find((s: any) => s.Id === node.id || s.Id === node.data.config?.stepId);
          if (matchingStep) {
            return {
              ...node,
              data: {
                ...node.data,
                pluginMetadata: {
                  ...node.data.pluginMetadata,
                  executionMode: matchingStep.ExecutionMode || node.data.pluginMetadata?.executionMode,
                  executionMetadata: matchingStep.ExecutionMetadata || matchingStep.executionMetadata || node.data.pluginMetadata?.executionMetadata,
                  version: matchingStep.Version || matchingStep.version || node.data.pluginMetadata?.version,
                }
              }
            };
          }
          return node;
        });
      }

      setWorkflow(id, workflowDef.name || `Workflow ${id}`, initialNodes, initialEdges);
    }

    return () => {
      // Clear store entirely when completely leaving this workflow edit session to ensure 100% clean state for next visits
      setWorkflow('', 'Untitled Workflow', [], []);
    };
  }, [id, workflowDef, setWorkflow, categories]);


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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const currentMode = useWorkflowStore.getState().canvasMode;
        useWorkflowStore.getState().setCanvasMode(currentMode === 'editor' ? 'execution' : 'editor');
        toast.info(currentMode === 'editor' ? "Switch to Preview mode" : "Switch to Design mode", { 
          duration: 1500,
          position: 'top-center'
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-show log panel when execution starts
  useEffect(() => {
    if (isExecuting) {
      setLogPanelVisible(true);
    }
  }, [isExecuting]);
  if (isFetching && !workflowDef) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading workflow...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden relative">
      <WorkflowTopbar />

      <div className="flex flex-col flex-1 w-full overflow-hidden relative">
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
            className={cn(
              "!bg-slate-50 dark:!bg-slate-950/50 transition-all duration-700",
              isExecutionMode && "bg-slate-100/80 dark:bg-slate-900/80 ring-2 ring-inset ring-primary/10"
            )}
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

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setConfigDialogOpen(true)}
                      size="icon"
                      variant="outline"
                      className="size-10 rounded-xl bg-card/90 hover:bg-secondary text-foreground shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 border-border/50"
                    >
                      <Settings className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Config Workflow Input</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}

          {/* ── Bottom Log Panel (overlay inside canvas) ── */}
          <BottomLogPanel
            visible={logPanelVisible}
            onClose={() => setLogPanelVisible(false)}
          />

          {/* ── Floating Toggle Button to reopen log panel ── */}
          {!logPanelVisible && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setLogPanelVisible(true)}
                    size="sm"
                    variant="outline"
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 gap-1.5 h-8 px-3 rounded-full bg-card/90 backdrop-blur-sm border-border/60 shadow-lg hover:shadow-xl transition-all text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <Plus className="size-3" />
                    Show Execution Log
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Open execution log panel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Node Library Sheet */}
      <NodeLibrarySheet open={nodeLibraryOpen} onOpenChange={setNodeLibraryOpen} />

      {/* Workflow Input Config Dialog */}
      <WorkflowInputConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        workflowDefinitionId={id || null}
        workflowName={workflowDef?.name}
      />

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
