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
