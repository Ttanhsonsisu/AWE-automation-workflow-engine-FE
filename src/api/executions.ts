import { useQuery } from '@tanstack/react-query';
import type { ExecutionLog } from '@/types';

const mockExecutions: ExecutionLog[] = [
  {
    id: 'exec-001',
    workflowId: 'demo-123',
    workflowName: 'Customer Onboarding',
    status: 'Success',
    startedAt: new Date(Date.now() - 120000).toISOString(),
    completedAt: new Date(Date.now() - 118000).toISOString(),
    durationMs: 2000,
    triggerType: 'Webhook',
    steps: [],
  },
  {
    id: 'exec-002',
    workflowId: 'sync-456',
    workflowName: 'Daily DB Backup',
    status: 'Failed',
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 86395000).toISOString(),
    durationMs: 5000,
    triggerType: 'Schedule',
    steps: [],
  },
  {
    id: 'exec-003',
    workflowId: 'demo-123',
    workflowName: 'Customer Onboarding',
    status: 'Running',
    startedAt: new Date().toISOString(),
    triggerType: 'Manual',
    steps: [],
  },
];

export const fetchExecutions = async (): Promise<ExecutionLog[]> => {
  return new Promise((resolve) => setTimeout(() => resolve(mockExecutions), 500));
};

export const useExecutions = () => {
  return useQuery({
    queryKey: ['executions'],
    queryFn: fetchExecutions,
  });
};
