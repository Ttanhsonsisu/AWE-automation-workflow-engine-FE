import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import type { WorkflowSchema, WorkflowStatus } from '@/types';

// Mock list of workflows for Phase 4
const mockWorkflows: WorkflowSchema[] = [
  {
    id: 'demo-123',
    name: 'Customer Onboarding',
    description: 'Send welcome email and setup CRM profile.',
    status: 'Active',
    nodes: [],
    edges: [],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    lastTriggeredAt: new Date().toISOString(),
  },
  {
    id: 'sync-456',
    name: 'Daily DB Backup',
    description: 'Cron job to backup database to S3.',
    status: 'Active',
    nodes: [],
    edges: [],
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date().toISOString(),
    lastTriggeredAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'draft-789',
    name: 'Lead Qualification',
    status: 'Draft',
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export interface WorkflowFilterParams {
  pageSize?: number;
  pageNo?: number;
  groupVersion?: boolean;
  isPublished?: boolean;
  name?: string;
}

export const fetchWorkflows = async (params: WorkflowFilterParams = {}): Promise<any> => {
  // Merge defaults with provided params
  const queryParams = {
    pageSize: 30,
    pageNo: 1,
    groupVersion: true,
    ...params
  };

  const { data } = await apiClient.get('/workflows/definitions', {
    params: queryParams
  });
  console.log("🔥 [fetchWorkflows] Raw Data from API:", data);
  
  // To handle if data is already the paginated object vs wrapped in {success, data}
  return data.data || data; 
};

export const useWorkflows = (params: WorkflowFilterParams = {}) => {
  return useQuery({
    queryKey: ['workflows', params],
    queryFn: () => fetchWorkflows(params),
  });
};

// ── GET Single Workflow Definition by ID ──
export const fetchWorkflowById = async (id: string): Promise<any> => {
  const { data } = await apiClient.get(`/workflows/${id}`);
  return data.data || data;
};

export const useWorkflow = (id: string) => {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => fetchWorkflowById(id),
    enabled: !!id,
  });
};

// ── CREATE Workflow ──
import { createWorkflowDefinition } from '@/services/workflowService';
import type { WorkflowGroup, WorkflowPagedResponse, WorkflowVersion } from '@/types';

export const createWorkflow = async (name: string): Promise<WorkflowVersion> => {
  try {
    const result = await createWorkflowDefinition({
      Name: name,
      DefinitionJson: { Steps: [], Transitions: [] },
      UiJson: null,
    });

    return {
      id: result.data.id || result.id, 
      name: result.data.name || result.name || name,
      version: result.data.version || result.version || 1,
      isPublished: false,
      createdAt: new Date().toISOString(),
      lastUpdated: null,
      totalRunCount: 0,
      statusCounts: {
        Running: 0, Suspended: 0, Completed: 0, Failed: 0, Compensating: 0, Compensated: 0, Cancelled: 0
      }
    } as WorkflowVersion;
  } catch (error) {
    console.error("Failed to create workflow definition:", error);
    // Fallback or rethrow
    throw error;
  }
};

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkflow,
    onSuccess: (newVersion) => {
      queryClient.setQueryData(['workflows'], (old: WorkflowPagedResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          items: [
            {
              name: newVersion.name,
              versions: [newVersion]
            },
            ...(Array.isArray(old.items) ? old.items : [])
          ]
        };
      });
    },
  });
};

// ── Publish / Unpublish API Error Shape ──
export interface WorkflowApiError {
  code: string;
  message: string;
  type: number;
}

// ── PUBLISH Workflow Definition ──
export const publishWorkflow = async (id: string): Promise<void> => {
  try {
    await apiClient.post(`/workflows/definitions/${id}/publish`);
  } catch (err: any) {
    const errData: WorkflowApiError | undefined = err?.response?.data;
    if (errData?.message) {
      throw new Error(errData.message);
    }
    throw err;
  }
};

// ── UNPUBLISH Workflow Definition ──
export const unpublishWorkflow = async (id: string): Promise<void> => {
  try {
    await apiClient.post(`/workflows/definitions/${id}/unpublish`);
  } catch (err: any) {
    const errData: WorkflowApiError | undefined = err?.response?.data;
    if (errData?.message) {
      throw new Error(errData.message);
    }
    throw err;
  }
};

// ── UPDATE Status (Toggle Publish / Unpublish) ──
export const updateWorkflowStatus = async ({ id, publish }: { id: string; publish: boolean }): Promise<void> => {
  if (publish) {
    await publishWorkflow(id);
  } else {
    await unpublishWorkflow(id);
  }
};

export const useUpdateWorkflowStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateWorkflowStatus,
    onSuccess: (_data, variables) => {
      // Optimistic update: flip isPublished on the single-definition cache immediately
      queryClient.setQueryData(['workflow', variables.id], (old: any) => {
        if (!old) return old;
        return { ...old, isPublished: variables.publish };
      });
    },
    onSettled: (_data, _error, variables) => {
      // Hard-refresh both the list and the single definition
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflow', variables?.id] });
    },
  });
};

// ── DELETE Workflow ──
export const deleteWorkflow = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/workflows/definitions/${id}`);
  } catch (err: any) {
    const errData: WorkflowApiError | undefined = err?.response?.data;
    if (errData?.message) throw new Error(errData.message);
    throw err;
  }
};

export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
};

// ── CLONE Workflow Definition ──
export interface CloneWorkflowParams {
  id: string;
  newName?: string;
}

export const cloneWorkflow = async ({ id, newName }: CloneWorkflowParams): Promise<WorkflowVersion> => {
  try {
    const { data } = await apiClient.post(`/workflows/definitions/${id}/clone`, {
      SourceDefinitionId: id,
      NewName: newName,
    });
    const result = data.data || data;
    return {
      id: result.id,
      name: result.name,
      version: result.version || 1,
      isPublished: false,
      createdAt: new Date().toISOString(),
      lastUpdated: null,
      totalRunCount: 0,
      statusCounts: {
        Running: 0, Suspended: 0, Completed: 0, Failed: 0, Compensating: 0, Compensated: 0, Cancelled: 0,
      },
    } as WorkflowVersion;
  } catch (err: any) {
    const errData: WorkflowApiError | undefined = err?.response?.data;
    if (errData?.message) throw new Error(errData.message);
    throw err;
  }
};

export const useCloneWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cloneWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
};

// ── EXPORT Workflow Definition ──
// The exported file contains the exact payload the server expects on import:
// { Name, DefinitionJson, UiJson } — extracted from the server's exportedJson field
export const exportWorkflow = async (id: string): Promise<void> => {
  try {
    const { data } = await apiClient.get(`/workflows/definitions/${id}/export`);
    // Server returns: { data: { name, version, exportedJson: { Name, DefinitionJson, UiJson } } }
    const exportResponse = data.data || data;

    // Extract the importable payload — must have Name, DefinitionJson, UiJson
    const payload = exportResponse.exportedJson ?? exportResponse.ExportedJson;
    if (!payload) {
      throw new Error('Export response does not contain exportedJson payload.');
    }

    const workflowName = exportResponse.name || exportResponse.Name || `workflow-${id}`;
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '_')}_v${exportResponse.version || 1}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    const errData: WorkflowApiError | undefined = err?.response?.data;
    if (errData?.message) throw new Error(errData.message);
    throw err;
  }
};

export const useExportWorkflow = () => {
  return useMutation({
    mutationFn: exportWorkflow,
  });
};

// ── GET & UPDATE Workflow Input Data ──
export const fetchWorkflowInputData = async (id: string): Promise<Record<string, any> | null> => {
  const { data } = await apiClient.get(`/workflows/definitions/${id}/input-data`);
  return data.data;
};

export const useWorkflowInputData = (id: string | null) => {
  return useQuery({
    queryKey: ['workflow-input-data', id],
    queryFn: () => fetchWorkflowInputData(id as string),
    enabled: !!id,
  });
};

export const updateWorkflowInputData = async ({ id, inputData }: { id: string; inputData: Record<string, any> | null }): Promise<any> => {
  const { data } = await apiClient.put(`/workflows/definitions/${id}/input-data`, {
    InputData: inputData,
  });
  return data.data;
};

export const useUpdateWorkflowInputData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateWorkflowInputData,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['workflow-input-data', variables.id], variables.inputData);
    },
  });
};

// ── IMPORT Workflow Definition ──
// API: POST /api/workflows/definitions/import
// Body: { ImportedJson: string } — raw JSON string of the exported workflow file
// Server parses Name, DefinitionJson, UiJson from that JSON string
export interface ImportDefinitionResponse {
  id: string;
  name: string;
  version: number;
}

export const importWorkflow = async (file: File): Promise<ImportDefinitionResponse> => {
  const rawText = await file.text();

  // Parse and validate JSON
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Invalid JSON file. Please upload a valid workflow export file.');
  }

  // ASP.NET Core serializes to camelCase by default, so the exported file has:
  //   { name, definitionJson, uiJson }  (camelCase)
  // But the server import's TryGetProperty looks for PascalCase: Name, DefinitionJson, UiJson
  //
  // Strategy: find the actual definition payload (handle both wrapper and direct formats),
  // then re-map all keys to PascalCase before sending.

  // Step 1 — unwrap if it's a wrapper format { name, version, exportedJson: {...} }
  let raw = parsed;
  if (parsed.exportedJson || parsed.ExportedJson) {
    raw = parsed.exportedJson ?? parsed.ExportedJson;
  }

  // Step 2 — extract values supporting both camelCase and PascalCase keys
  const nameValue    = raw.Name           ?? raw.name           ?? 'ImportedWorkflow';
  const defJsonValue = raw.DefinitionJson ?? raw.definitionJson;
  const uiJsonValue  = raw.UiJson         ?? raw.uiJson         ?? {};

  // Step 3 — validate
  if (!defJsonValue) {
    throw new Error(
      'Invalid export file: could not find DefinitionJson. Please re-export the workflow and try again.'
    );
  }

  // Step 4 — rebuild payload with PascalCase keys that the server expects
  const importPayload = {
    Name: nameValue,
    DefinitionJson: defJsonValue,
    UiJson: uiJsonValue,
  };

  const importedJson = JSON.stringify(importPayload);

  try {
    const { data } = await apiClient.post('/workflows/definitions/import', {
      ImportedJson: importedJson,
    });
    const result = data.data || data;
    return {
      id: result.id,
      name: result.name,
      version: result.version,
    };
  } catch (err: any) {
    const errData: WorkflowApiError | undefined = err?.response?.data;
    if (errData?.message) throw new Error(errData.message);
    throw err;
  }
};

export const useImportWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
};
