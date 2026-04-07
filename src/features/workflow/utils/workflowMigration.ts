/**
 * Workflow Migration Utilities
 * ─────────────────────────────────────────────────────────────────
 * Helpers để chuyển đổi workflows cũ (tạo qua API) sang dạng mới
 * có UiJson được tính toán.
 */

import type { WorkflowNode } from '@/stores/workflowStore';
import type { Edge } from '@xyflow/react';
import { hydrateWorkflowFromDefinition } from './workflowHydration';
import type { PluginCategory } from '@/types/plugin';

/**
 * Check if a workflow is "hydrated" (has valid UiJson)
 * Returns true if workflow has nodes/edges with position data
 */
export function isWorkflowHydrated(
  uiJson: any | null,
  definitionJson: any | null
): boolean {
  // If UiJson exists and has nodes with positions
  if (uiJson?.nodes && Array.isArray(uiJson.nodes) && uiJson.nodes.length > 0) {
    const hasPositions = uiJson.nodes.every((node: any) => 
      node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number'
    );
    if (hasPositions) return true;
  }

  // If UiJson is null or invalid, but has Definition
  return false;
}

/**
 * Migrate a workflow from API-created format to hydrated format
 * 
 * If workflow was created via API with UiJson=null:
 * - Takes DefinitionJson.Steps and Transitions
 * - Generates nodes/edges with auto-positions
 * - Returns hydrated UiJson
 */
export async function migrateWorkflowToHydrated(
  workflowId: string,
  definitionJson: any,
  pluginCategories: PluginCategory[]
): Promise<{ nodes: WorkflowNode[]; edges: Edge[] } | null> {
  if (!definitionJson?.Steps || definitionJson.Steps.length === 0) {
    console.warn(`[migrateWorkflowToHydrated] ${workflowId} has no Definition.Steps`);
    return null;
  }

  try {
    const result = hydrateWorkflowFromDefinition(
      definitionJson.Steps,
      definitionJson.Transitions || [],
      pluginCategories
    );

    console.log(
      `[migrateWorkflowToHydrated] SUCCESS: ${workflowId}`,
      { nodeCount: result.nodes.length, edgeCount: result.edges.length }
    );

    return { nodes: result.nodes, edges: result.edges };
  } catch (error) {
    console.error(`[migrateWorkflowToHydrated] FAILED: ${workflowId}`, error);
    return null;
  }
}

/**
 * Batch migrate multiple workflows
 * Useful for data migration / seeding
 * 
 * Example:
 * ```tsx
 * const workflows = [
 *   { id: '1', definitionJson: {...}, uiJson: null },
 *   { id: '2', definitionJson: {...}, uiJson: null },
 * ];
 * 
 * const results = await batchMigrateWorkflows(workflows, categories);
 * console.log(`Migrated ${results.successful} workflows`);
 * ```
 */
export async function batchMigrateWorkflows(
  workflows: Array<{
    id: string;
    definitionJson: any;
    uiJson: any;
  }>,
  pluginCategories: PluginCategory[]
): Promise<{
  successful: number;
  failed: number;
  results: Array<{
    workflowId: string;
    success: boolean;
    nodes?: WorkflowNode[];
    edges?: Edge[];
    error?: string;
  }>;
}> {
  const results: Array<{
    workflowId: string;
    success: boolean;
    nodes?: WorkflowNode[];
    edges?: Edge[];
    error?: string;
  }> = [];

  for (const workflow of workflows) {
    // Skip if already hydrated
    if (isWorkflowHydrated(workflow.uiJson, workflow.definitionJson)) {
      console.log(`[batchMigrateWorkflows] Skipping ${workflow.id} - already hydrated`);
      results.push({ workflowId: workflow.id, success: true });
      continue;
    }

    try {
      const hydrated = await migrateWorkflowToHydrated(
        workflow.id,
        workflow.definitionJson,
        pluginCategories
      );

      if (hydrated) {
        results.push({
          workflowId: workflow.id,
          success: true,
          nodes: hydrated.nodes,
          edges: hydrated.edges,
        });
      } else {
        results.push({
          workflowId: workflow.id,
          success: false,
          error: 'Hydration returned null',
        });
      }
    } catch (error) {
      results.push({
        workflowId: workflow.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(
    `[batchMigrateWorkflows] Complete: ${successful} success, ${failed} failed`
  );

  return { successful, failed, results };
}

/**
 * Create a migration summary for reporting
 */
export function generateMigrationReport(
  results: Array<{
    workflowId: string;
    success: boolean;
    error?: string;
  }>
): string {
  const lines: string[] = [];
  lines.push('╔════════════════════════════════════════╗');
  lines.push('║   Workflow Migration Report            ║');
  lines.push('╚════════════════════════════════════════╝');
  lines.push('');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  lines.push(`✅ Successful: ${successful}/${results.length}`);
  lines.push(`❌ Failed: ${failed}/${results.length}`);
  lines.push('');

  if (failed > 0) {
    lines.push('Failed Workflows:');
    results.filter(r => !r.success).forEach(r => {
      lines.push(`  • ${r.workflowId}: ${r.error || 'Unknown error'}`);
    });
  }

  return lines.join('\n');
}

/**
 * Export migration plan (for documentation / audit)
 */
export function exportMigrationPlan(
  workflows: Array<{ id: string; uiJson: any; definitionJson: any }>,
  pluginCategories: PluginCategory[]
): Array<{
  workflowId: string;
  isHydrated: boolean;
  nodeCount: number;
  edgeCount: number;
  willMigrate: boolean;
}> {
  return workflows.map(workflow => {
    const isHydrated = isWorkflowHydrated(workflow.uiJson, workflow.definitionJson);
    const nodeCount = workflow.definitionJson?.Steps?.length || 0;
    const edgeCount = workflow.definitionJson?.Transitions?.length || 0;

    return {
      workflowId: workflow.id,
      isHydrated,
      nodeCount,
      edgeCount,
      willMigrate: !isHydrated && nodeCount > 0,
    };
  });
}
