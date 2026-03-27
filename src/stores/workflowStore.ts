import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Connection,
} from '@xyflow/react';

// ── Node Data Types ──────────────────────────────
// Supports both legacy hardcoded categories and dynamic ones from the API
export type NodeCategory = 'trigger' | 'action' | 'logic' | 'api' | 'database' | 'output' | (string & {});

export interface ExecutionLogItem {
  id: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: 'running' | 'success' | 'error';
  timestamp: string;
  duration?: number;
  inputData?: any;
  outputData?: any;
  error?: string;
}

export interface WorkflowNodeData {
  label: string;
  category: NodeCategory;
  description?: string;
  icon?: string;
  config?: Record<string, unknown>;
  isConfigured?: boolean;
  // Dynamic plugin metadata from the API
  executionMode?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  packageId?: string | null;
  activeVersion?: string;
  [key: string]: unknown;
}

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

// ── History snapshot for Undo/Redo ───────────────
interface HistorySnapshot {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

const MAX_HISTORY = 50;

// ── Store Interface ──────────────────────────────
interface WorkflowState {
  // Workflow meta
  workflowId: string | null;
  workflowName: string;
  isSaved: boolean;
  isExecuting: boolean;
  
  canvasMode: 'editor' | 'execution';
  executionLogs: ExecutionLogItem[];

  // Graph
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];

  // History (Undo/Redo)
  history: HistorySnapshot[];
  historyIndex: number;

  // Selected node (for config panel)
  selectedNodeId: string | null;

  // ── Actions ──
  setWorkflow: (id: string, name: string, nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  setWorkflowName: (name: string) => void;

  // React Flow callbacks
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Node manipulation
  addNode: (node: WorkflowNode) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  deleteNode: (nodeId: string) => void;

  // Selection
  setSelectedNode: (nodeId: string | null) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Save state
  markSaved: () => void;
  markUnsaved: () => void;

  // Execution
  setExecuting: (executing: boolean) => void;
  setCanvasMode: (mode: 'editor' | 'execution') => void;
  addExecutionLog: (log: ExecutionLogItem) => void;
  updateExecutionLog: (id: string, logUpdate: Partial<ExecutionLogItem>) => void;
  clearExecutionLogs: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  workflowId: null,
  workflowName: 'Untitled Workflow',
  isSaved: true,
  isExecuting: false,
  canvasMode: 'editor',
  executionLogs: [],
  nodes: [],
  edges: [],
  history: [],
  historyIndex: -1,
  selectedNodeId: null,

  // ── Set entire workflow ──
  setWorkflow: (id, name, nodes, edges) => {
    set({
      workflowId: id,
      workflowName: name,
      nodes,
      edges,
      history: [{ nodes, edges }],
      historyIndex: 0,
      isSaved: true,
      selectedNodeId: null,
    });
  },

  setWorkflowName: (name) => {
    set({ workflowName: name, isSaved: false });
  },

  // ── React Flow change handlers ──
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as WorkflowNode[],
      isSaved: false,
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      isSaved: false,
    }));
  },

  onConnect: (connection: Connection) => {
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          type: 'smoothstep',
          animated: state.isExecuting,
          style: { strokeWidth: 2 },
        },
        state.edges
      ),
      isSaved: false,
    }));
    // Push history after connect
    get().pushHistory();
  },

  // ── Node manipulation ──
  addNode: (node) => {
    set((state) => ({
      nodes: [...state.nodes, node],
      isSaved: false,
    }));
    get().pushHistory();
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
      isSaved: false,
    }));
  },

  deleteNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      isSaved: false,
    }));
    get().pushHistory();
  },

  // ── Selection ──
  setSelectedNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  // ── History (Undo/Redo) ──
  pushHistory: () => {
    set((state) => {
      const snapshot: HistorySnapshot = {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };

      // Discard any "future" history if we're not at the end
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(snapshot);

      // Keep max history
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }

      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const snapshot = history[historyIndex - 1];
      set({
        nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
        edges: JSON.parse(JSON.stringify(snapshot.edges)),
        historyIndex: historyIndex - 1,
        isSaved: false,
      });
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const snapshot = history[historyIndex + 1];
      set({
        nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
        edges: JSON.parse(JSON.stringify(snapshot.edges)),
        historyIndex: historyIndex + 1,
        isSaved: false,
      });
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // ── Save state ──
  markSaved: () => set({ isSaved: true }),
  markUnsaved: () => set({ isSaved: false }),

  // ── Execution ──
  setExecuting: (executing) => {
    set((state) => ({
      isExecuting: executing,
      edges: state.edges.map((e) => ({ ...e, animated: executing })),
    }));
  },
  
  setCanvasMode: (mode) => set({ canvasMode: mode }),
  
  addExecutionLog: (log) => {
    set((state) => ({ executionLogs: [...state.executionLogs, log] }));
  },

  updateExecutionLog: (id, logUpdate) => {
    set((state) => ({
      executionLogs: state.executionLogs.map(log => 
        log.id === id ? { ...log, ...logUpdate } : log
      )
    }));
  },
  
  clearExecutionLogs: () => set({ executionLogs: [] }),
}));
