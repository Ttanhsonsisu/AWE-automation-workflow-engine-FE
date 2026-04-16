export interface WorkflowExecution {
  id: string;
  definitionId: string;
  definitionName: string;
  definitionVersion: number;
  status: string | number;
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  createdAt: string;
  parentInstanceId: string | null;
  childInstances: any[];
}

export interface ExecutionPagedResponse {
  items: WorkflowExecution[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ExecutionFilters {
  page: number;
  size: number;
  definitionIds?: string[];
  status?: string;
  startTimeFrom?: string;
  startTimeTo?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface WorkflowDefinitionDropdownItem {
  id: string;
  name: string;
  version: number;
  description: string;
}

export interface StatusDropdownItem {
  value: string;
  label: string;
}

export interface ExecutionLog {
  id: number;
  instanceId: string;
  executionPointerId: string | null;
  nodeId: string;
  level: number;
  event: string;
  message: string;
  metadata: any | null;
  createdAt: string;
}
