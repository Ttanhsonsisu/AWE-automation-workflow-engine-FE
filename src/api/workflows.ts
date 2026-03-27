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

// ── GET Workflows ──
export const fetchWorkflows = async (): Promise<WorkflowSchema[]> => {
  // Uncomment below when backend is ready
  // const { data } = await apiClient.get<WorkflowSchema[]>('/workflows');
  // return data;

  // Mock implementation
  return new Promise((resolve) => setTimeout(() => resolve(mockWorkflows), 600));
};

export const useWorkflows = () => {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: fetchWorkflows,
  });
};

// ── CREATE Workflow ──
export const createWorkflow = async (name: string): Promise<WorkflowSchema> => {
  const newWf: WorkflowSchema = {
    id: `wf-${Math.floor(Math.random() * 10000)}`,
    name,
    status: 'Draft',
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return new Promise((resolve) => setTimeout(() => resolve(newWf), 400));
};

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkflow,
    onSuccess: (newWf) => {
      queryClient.setQueryData(['workflows'], (old: WorkflowSchema[] = []) => [newWf, ...old]);
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
      const previousWorkflows = queryClient.getQueryData<WorkflowSchema[]>(['workflows']);
      if (previousWorkflows) {
        queryClient.setQueryData(
          ['workflows'],
          previousWorkflows.map((wf) =>
            wf.id === newStatus.id ? { ...wf, status: newStatus.status } : wf
          )
        );
      }
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
      queryClient.setQueryData(['workflows'], (old: WorkflowSchema[] = []) =>
        old.filter((wf) => wf.id !== deletedId)
      );
    },
  });
};
