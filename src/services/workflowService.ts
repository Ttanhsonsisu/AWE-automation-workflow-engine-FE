import apiClient from './apiClient';

export interface WorkflowDefinitionPayload {
  Name: string;
  DefinitionJson: {
    Steps: Array<{
      Id: string;
      Type: string;
      ExecutionMode: string;
      ExecutionMetadata?: any;
      Inputs?: Record<string, unknown>;
    }>;
    Transitions: Array<{
      Source: string;
      Target: string;
    }>;
  };
  UiJson: any | null;
}

export interface UpdateWorkflowDefinitionPayload extends WorkflowDefinitionPayload {
  Id: string;
}

export async function createWorkflowDefinition(payload: WorkflowDefinitionPayload) {
  const response = await apiClient.post('/workflows/definitions', payload);
  return response.data;
}

export async function updateWorkflowDefinition(payload: UpdateWorkflowDefinitionPayload) {
  const response = await apiClient.put('/workflows/definitions', payload);
  return response.data;
}

export interface StartWorkflowPayload {
  DefinitionId: string;
  JobName?: string;
  InputData?: Record<string, any>;
  IsTest?: boolean;
  StopAtStepId?: string | null;
}

export async function startWorkflow(payload: StartWorkflowPayload) {
  const response = await apiClient.post('/workflows', payload);
  return response.data;
}

export async function suspendExecution(instanceId: string) {
  const response = await apiClient.post(`/executions/${instanceId}/suspend`);
  return response.data;
}

export async function resumeExecution(instanceId: string) {
  const response = await apiClient.post(`/executions/${instanceId}/resume`);
  return response.data;
}

