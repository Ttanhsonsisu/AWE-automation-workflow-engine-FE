/**
 * Workflow Hydration Utilities
 * ─────────────────────────────────────────────────────────────────
 * Handles conversion of backend DefinitionJson to frontend UI format (UiJson)
 * when workflows are created via API without UI coordinates.
 * 
 * Features:
 * - Auto-layout computation (dagreJS-like algorithm)
 * - Node hydration from Definition Steps
 * - Edge hydration from Definition Transitions
 * - Plugin detail enrichment for DynamicDll nodes
 */

import type { WorkflowNode, NodeCategory } from '@/stores/workflowStore';
import type { Edge } from '@xyflow/react';
import type { PluginCategory } from '@/types/plugin';
import { catalogToNodeCategories, getNodeDefinition } from '../nodeDefinitions';

// ═══════════════════════════════════════════════════════════════════
// 1. AUTO-LAYOUT: Simple dagre-like algorithm
// ═══════════════════════════════════════════════════════════════════

interface LayoutNode {
  id: string;
  width: number;
  height: number;
  children?: string[];
}

interface LayoutPosition {
  [nodeId: string]: { x: number; y: number };
}

/**
 * Simple hierarchical layout algorithm:
 * - Computes node ranks based on their distance from start node
 * - Positions nodes in columns (x = rank * spacing.x)
 * - Centers nodes within their rank (y = indexInRank * spacing.y)
 */
export function computeAutoLayout(
  stepIds: string[],
  transitionMap: Map<string, string[]>, // Map of Source → [Target...]
  options?: {
    rankSpacingX?: number;
    rankSpacingY?: number;
    nodeWidth?: number;
    nodeHeight?: number;
  }
): LayoutPosition {
  const spacing = {
    x: options?.rankSpacingX || 300,
    y: options?.rankSpacingY || 180,
  };

  const positions: LayoutPosition = {};

  if (stepIds.length === 0) return positions;

  // Step 1: Compute rank for each node (BFS from start node)
  const ranks = new Map<string, number>();
  const queue: Array<{ id: string; rank: number }> = [];

  // Start from all root nodes (nodes with no incoming edges)
  const incomingCount = new Map<string, number>();
  stepIds.forEach(id => incomingCount.set(id, 0));
  
  transitionMap.forEach((targets) => {
    targets.forEach(target => {
      incomingCount.set(target, (incomingCount.get(target) || 0) + 1);
    });
  });

  // Queue all root nodes (no incoming edges)
  stepIds.forEach(id => {
    if (incomingCount.get(id) === 0) {
      queue.push({ id, rank: 0 });
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { id, rank } = current;
    if (ranks.has(id)) continue;
    ranks.set(id, rank);

    const targets = transitionMap.get(id) || [];
    for (const target of targets) {
      if (!ranks.has(target)) {
        queue.push({ id: target, rank: rank + 1 });
      }
    }
  }

  // Fallback: assign any unassigned nodes to rank 0
  stepIds.forEach(id => {
    if (!ranks.has(id)) {
      ranks.set(id, 0);
    }
  });

  // Step 2: Group nodes by rank
  const nodesByRank = new Map<number, string[]>();
  ranks.forEach((rank, nodeId) => {
    if (!nodesByRank.has(rank)) {
      nodesByRank.set(rank, []);
    }
    nodesByRank.get(rank)!.push(nodeId);
  });

  // Step 3: Position each node
  nodesByRank.forEach((nodeIds, rank) => {
    const x = rank * spacing.x + 50; // Offset from left edge
    const totalHeight = (nodeIds.length - 1) * spacing.y;
    const startY = 100 - totalHeight / 2; // Center vertically

    nodeIds.forEach((nodeId, index) => {
      const y = startY + index * spacing.y;
      positions[nodeId] = { x, y };
    });
  });

  return positions;
}

// ═══════════════════════════════════════════════════════════════════
// 2. NODE HYDRATION: Convert DefinitionJson Steps to WorkflowNodes
// ═══════════════════════════════════════════════════════════════════

export interface DefinitionStep {
  Id: string;
  Type: string;
  DisplayName?: string;
  displayName?: string;
  ExecutionMode?: string;
  ExecutionMetadata?: any;
  Inputs?: Record<string, unknown>;
  Version?: string;
  version?: string;
}

export interface DefinitionTransition {
  Source: string;
  Target: string;
}

/**
 * Convert backend Definition Steps into React Flow nodes.
 * Automatically maps plugin metadata from the plugin catalog.
 */
export function hydrateNodesFromDefinition(
  steps: DefinitionStep[],
  pluginCategories: PluginCategory[],
  layoutPositions: LayoutPosition
): WorkflowNode[] {
  if (steps.length === 0) return [];

  const nodeGroups = catalogToNodeCategories(pluginCategories);

  return steps.map((step, index) => {
    // Find plugin definition to get metadata
    const definition = getNodeDefinition(step.Type, nodeGroups);

    // Determine node type based on category
    const isStart = index === 0; // First step is start node
    const category = (definition?.category || 'action') as NodeCategory;

    // Get position from pre-calculated layout
    const position = layoutPositions[step.Id] || { x: 350, y: 100 + index * 180 };

    return {
      id: step.Id, // Use backend Step ID directly for consistency
      type: isStart ? 'startNode' : 'actionNode',
      position,
      data: {
        pluginMetadata: {
          name: step.Type,
          displayName: step.DisplayName || step.displayName || definition?.label || step.Type,
          category,
          description: definition?.description || '',
          icon: definition?.icon ? (definition.icon as any).name : undefined,
          version: step.Version || step.version || definition?.activeVersion,
          executionMode: step.ExecutionMode || definition?.executionMode || 'BuiltIn',
          executionMetadata: step.ExecutionMetadata,
          packageId: definition?.packageId,
          inputSchema: definition?.inputSchema,
          outputSchema: definition?.outputSchema,
        },
        config: {
          inputs: step.Inputs || {},
          stepId: step.Id,
          isConfigured: !!step.Inputs && Object.keys(step.Inputs).length > 0,
        },
        status: 'idle',
        uiState: { isValid: true },
      },
    } as WorkflowNode;
  });
}

/**
 * EDGE HYDRATION: Convert DefinitionJson Transitions to WorkflowEdges
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * Convert backend Definition Transitions into React Flow edges.
 * Maps step IDs to node IDs (which are the same after hydration).
 */
export function hydrateEdgesFromTransitions(
  transitions: DefinitionTransition[],
  hydrationMap?: Map<string, string> // Optional: map of Backend Step ID → Node ID
): Edge[] {
  return transitions.map((transition, index) => ({
    id: `hydrated-edge-${index}`,
    source: hydrationMap?.get(transition.Source) || transition.Source,
    target: hydrationMap?.get(transition.Target) || transition.Target,
    type: 'customEdge',
  }));
}

// ═══════════════════════════════════════════════════════════════════
// 4. FULL HYDRATION ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════

export interface HydrationResult {
  nodes: WorkflowNode[];
  edges: Edge[];
  layoutPositions: LayoutPosition;
}

/**
 * Main hydration function: converts DefinitionJson to UiJson
 * Called when UiJson is null (workflow created via API).
 */
export function hydrateWorkflowFromDefinition(
  definitionSteps: DefinitionStep[],
  definitionTransitions: DefinitionTransition[],
  pluginCategories: PluginCategory[]
): HydrationResult {
  if (definitionSteps.length === 0) {
    return { nodes: [], edges: [], layoutPositions: {} };
  }

  // Step 1: Build transition map for layout computation
  const transitionMap = new Map<string, string[]>();
  definitionTransitions.forEach(t => {
    if (!transitionMap.has(t.Source)) {
      transitionMap.set(t.Source, []);
    }
    transitionMap.get(t.Source)!.push(t.Target);
  });

  // Step 2: Compute node layout
  const stepIds = definitionSteps.map(s => s.Id);
  const layoutPositions = computeAutoLayout(stepIds, transitionMap);

  // Step 3: Hydrate nodes with layout
  const nodes = hydrateNodesFromDefinition(
    definitionSteps,
    pluginCategories,
    layoutPositions
  );

  // Step 4: Hydrate edges
  const edges = hydrateEdgesFromTransitions(definitionTransitions);

  return { nodes, edges, layoutPositions };
}

// ═══════════════════════════════════════════════════════════════════
// 5. PLUGIN DETAIL ENRICHMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Identifies which nodes need plugin detail fetched (DynamicDll nodes).
 * Used to pre-fetch required schemas before rendering forms.
 */
export function identifyPendingPluginDetails(nodes: WorkflowNode[]): Array<{
  nodeId: string;
  nodeLabel: string;
  executionMode: string;
  pluginName: string;
  packageId?: string | null;
  version?: string | null;
  sha256?: string | null;
}> {
  return nodes
    .filter(node => node.data.pluginMetadata?.executionMode === 'DynamicDll')
    .map(node => ({
      nodeId: node.id,
      nodeLabel: node.data.pluginMetadata.displayName || node.data.pluginMetadata.name,
      executionMode: node.data.pluginMetadata.executionMode!,
      pluginName: node.data.pluginMetadata.name,
      packageId: node.data.pluginMetadata.packageId,
      version: node.data.pluginMetadata.version,
      sha256: undefined, // Will be fetched from backend if needed
    }));
}
