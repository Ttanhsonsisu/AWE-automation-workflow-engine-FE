// ======================================================================
// Workflow Types - Maps to backend .NET C# models (PascalCase → camelCase)
// ======================================================================

export type WorkflowStatus = 'draft' | 'active' | 'archived';
export type NodeCategory = 'trigger' | 'action' | 'logic' | 'api' | 'database' | (string & {});
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

/** Represents a Workflow definition from the backend */
export interface WorkflowSchema {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isPublished: boolean;
}

/** A single node inside a workflow graph */
export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeConfig;
}

/** Configuration data embedded in a node */
export interface NodeConfig {
  label: string;
  description?: string;
  category: NodeCategory;
  icon?: string;
  color?: string;
  // Node-specific fields
  settings: Record<string, unknown>;
  // Advanced
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
}

/** An edge between two nodes */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
  label?: string;
  condition?: string;
}

/** Execution log from running a workflow */
export interface ExecutionLog {
  id: string;
  workflowId: string;
  workflowName: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  triggeredBy: string;
  steps: ExecutionStep[];
  error?: string;
}

/** A single step within an execution */
export interface ExecutionStep {
  nodeId: string;
  nodeName: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

/** Plugin / Integration definition */
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  category: NodeCategory;
  isInstalled: boolean;
  isEnabled: boolean;
  author: string;
}

/** Audit log entry */
export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  timestamp: string;
  details?: string;
  ipAddress?: string;
}

/** Node definition in the library (template to drag onto canvas) */
export interface NodeDefinition {
  type: string;
  label: string;
  description: string;
  category: NodeCategory;
  icon: string;
  color: string;
  defaultSettings: Record<string, unknown>;
  inputs: number;
  outputs: number;
}
