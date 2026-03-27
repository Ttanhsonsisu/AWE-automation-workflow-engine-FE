// Models matching .NET Backend data structure (converted to camelCase for TS frontend)

export type WorkflowStatus = 'Active' | 'Draft' | 'Archived';
export type ExecutionStatus = 'Success' | 'Failed' | 'Running' | 'Pending';

export interface NodeConfig {
  id: string;
  type: string;
  positionX: number;
  positionY: number;
  configData: Record<string, unknown>; // JSON payload
}

export interface EdgeConfig {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition?: string; // Optional branching logic
}

export interface WorkflowSchema {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  nodes: NodeConfig[];
  edges: EdgeConfig[];
  createdAt: string; // ISO Date String
  updatedAt: string; // ISO Date String
  lastTriggeredAt?: string | null;
}

export interface StepLog {
  stepId: string;
  nodeId: string;
  nodeName: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  inputData?: Record<string, unknown>; // JSON payload
  outputData?: Record<string, unknown>; // JSON payload
  errorMessage?: string;
}

export interface ExecutionLog {
  id: string;
  workflowId: string;
  workflowName: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  triggerType: 'Manual' | 'Schedule' | 'Webhook';
  steps: StepLog[]; // Detailed timeline steps
}

export interface PluginItem {
  id: string;
  name: string;
  version: string;
  publisher: string;
  status: 'Installed' | 'Available' | 'Deprecated';
  iconUrl?: string;
  description: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: 'Workflow' | 'Plugin' | 'System';
  entityId?: string;
  performedBy: string; // User ID/Email
  timestamp: string;
  details?: string;
}
