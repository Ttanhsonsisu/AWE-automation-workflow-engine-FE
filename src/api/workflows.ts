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

// ── UPDATE Status (Toggle Publish) ──
export const updateWorkflowStatus = async ({ id, status }: { id: string; status: WorkflowStatus }): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, 300));
};

export const useUpdateWorkflowStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateWorkflowStatus,
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: ['workflows'] });
      const previousWorkflows = queryClient.getQueryData<WorkflowPagedResponse>(['workflows']);
      
      // We will refresh the page via invalidateQueries, local update of paged list is complex
      return { previousWorkflows };
    },
    onError: (err, newStatus, context) => {
      if (context?.previousWorkflows) {
        queryClient.setQueryData(['workflows'], context.previousWorkflows);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
};

// ── DELETE Workflow ──
export const deleteWorkflow = async (id: string): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, 300));
};

export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWorkflow,
    onSuccess: (_, deletedId) => {
      // Refresh the list from the server to get accurate groups
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
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
