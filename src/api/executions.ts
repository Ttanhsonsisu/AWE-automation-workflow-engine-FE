import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import type { 
  ExecutionPagedResponse, 
  ExecutionFilters, 
  WorkflowDefinitionDropdownItem, 
  StatusDropdownItem 
} from '@/types/execution';

export const fetchExecutions = async (filters: ExecutionFilters): Promise<ExecutionPagedResponse> => {
  // Create a copy of filters to avoid mutating the state
  const params: any = { ...filters };

  // Convert date strings to UTC ISO strings
  // When a user selects a date like "2026-04-10", they mean that day in their local time.
  // We convert it to the beginning/end of that local day and then to UTC ISO string.
  
  if (params.createdFrom) {
    params.createdFrom = startOfDay(parseISO(params.createdFrom)).toISOString();
  }
  if (params.createdTo) {
    params.createdTo = endOfDay(parseISO(params.createdTo)).toISOString();
  }
  if (params.startTimeFrom) {
    params.startTimeFrom = startOfDay(parseISO(params.startTimeFrom)).toISOString();
  }
  if (params.startTimeTo) {
    params.startTimeTo = endOfDay(parseISO(params.startTimeTo)).toISOString();
  }

  // Clean up null/undefined values and empty arrays
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v != null && v !== '')
  );

  const { data } = await apiClient.get('/executions', {
    params: cleanParams
  });
  return data.data;
};

export const useExecutions = (filters: ExecutionFilters) => {
  return useQuery({
    queryKey: ['executions', filters],
    queryFn: () => fetchExecutions(filters),
  });
};

export const fetchWorkflowDefinitionsDropdown = async (): Promise<WorkflowDefinitionDropdownItem[]> => {
  const { data } = await apiClient.get('/dropdown/workflow-definition');
  return data.data;
};

export const useWorkflowDefinitionsDropdown = () => {
  return useQuery({
    queryKey: ['dropdown', 'workflow-definitions'],
    queryFn: fetchWorkflowDefinitionsDropdown,
  });
};

export const fetchWorkflowInstanceStatusDropdown = async (): Promise<StatusDropdownItem[]> => {
  const { data } = await apiClient.get('/dropdown/workflow-instance-status');
  return data.data;
};

export const useWorkflowInstanceStatusDropdown = () => {
  return useQuery({
    queryKey: ['dropdown', 'workflow-instance-status'],
    queryFn: fetchWorkflowInstanceStatusDropdown,
  });
};

// ─── Execution Action Mutations ───────────────────────────────────

import {
  retryExecution,
  suspendExecution,
  resumeExecution,
  cancelExecution,
} from '@/services/workflowService';

export const useRetryExecution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) => retryExecution(instanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    },
  });
};

export const useSuspendExecution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) => suspendExecution(instanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    },
  });
};

export const useResumeExecution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) => resumeExecution(instanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    },
  });
};

export const useCancelExecution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) => cancelExecution(instanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    },
  });
};

export const fetchExecutionLogs = async (instanceId: string) => {
  const { data } = await apiClient.get(`/executions/${instanceId}/logs`);
  return data.data; // Assuming it returns { success: true, data: ExecutionLog[] }
};

export const useExecutionLogs = (instanceId: string | null, isRunning: boolean) => {
  return useQuery({
    queryKey: ['execution-logs', instanceId],
    queryFn: () => fetchExecutionLogs(instanceId as string),
    enabled: !!instanceId,
    refetchInterval: isRunning ? 3000 : false, // Autorefresh every 3 seconds if running
  });
};

