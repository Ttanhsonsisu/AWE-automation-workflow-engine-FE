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
  UiJson: string | null;
}

export async function saveWorkflowDefinition(payload: WorkflowDefinitionPayload) {
  const response = await apiClient.post('/workflows/definitions', payload);
  return response.data;
}
