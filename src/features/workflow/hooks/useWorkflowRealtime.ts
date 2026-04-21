import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useWorkflowStore } from '@/stores/workflowStore';

// Assuming the Hub is hosted at the same origin or via env variable
const SIGNALR_URL = import.meta.env.VITE_SIGNALR_URL || 'https://localhost:7049/hubs/workflow';

interface NodeStatusUpdateMessage {
  stepId: string;
  status: string;
  timestamp: string;
}

interface LogUpdateMessage {
  stepId: string;
  level: string;
  message: string;
  timestamp: string;
}

interface WorkflowStatusUpdateMessage {
  status: string;
  timestamp: string;
}

export const useWorkflowRealtime = (instanceId: string | null) => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // 1. Setup Connection Once
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_URL)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connectionRef.current = connection;

    connection.on("NodeStatusChanged", (payload: NodeStatusUpdateMessage) => {
      console.log("[SignalR] NodeStatusChanged", payload);
      const state = useWorkflowStore.getState();
      const statusLower = payload.status.toLowerCase();
      
      const targetNode = state.nodes.find(n => n.id === payload.stepId || n.data.config?.stepId === payload.stepId);
      const nodeIdToUpdate = targetNode ? targetNode.id : payload.stepId;

      state.updateNodeData(nodeIdToUpdate, { status: statusLower });
      state.upsertExecutionLog(nodeIdToUpdate, {
        status: statusLower as any,
        timestamp: payload.timestamp,
      });
    });

    connection.on("WorkflowStatusChanged", (status: string, timestamp?: string) => {
      console.log("[SignalR] WorkflowStatusChanged", status, timestamp);
      const state = useWorkflowStore.getState();
      state.setWorkflowExecutionStatus(status);
      
      const lowerStatus = status.toLowerCase();
      if (['completed', 'failed', 'suspended'].includes(lowerStatus)) {
        state.setExecuting(false);
      } else if (lowerStatus === 'running') {
        state.setExecuting(true);
      }
    });

    connection.on("WorkflowLogReceived", (log: LogUpdateMessage) => {
      console.log("[SignalR] WorkflowLogReceived", log);
      useWorkflowStore.setState((state) => {
        const logs = [...state.executionLogs];
        const targetNodeLog = state.nodes.find(n => n.id === log.stepId || n.data.config?.stepId === log.stepId);
        const resolvedNodeId = targetNodeLog ? targetNodeLog.id : log.stepId;
        
        const existingIndex = logs.findIndex(l => l.nodeId === resolvedNodeId);
        
        if (existingIndex >= 0) {
          const currentRuntimeLogs = logs[existingIndex].runtimeLogs || [];
          const isDuplicate = currentRuntimeLogs.some(
            l => l.timestamp === log.timestamp && l.message === log.message
          );

          if (!isDuplicate) {
            logs[existingIndex] = {
              ...logs[existingIndex],
              runtimeLogs: [...currentRuntimeLogs, { level: log.level, message: log.message, timestamp: log.timestamp }]
            };
          }
        } else {
          logs.push({
            id: `log-${resolvedNodeId}`,
            nodeId: resolvedNodeId,
            nodeLabel: targetNodeLog?.data?.config?.nodeLabel || targetNodeLog?.data?.pluginMetadata?.displayName || log.stepId,
            nodeType: targetNodeLog?.data?.pluginMetadata?.name || 'unknown',
            status: 'running',
            timestamp: log.timestamp,
            runtimeLogs: [{ level: log.level, message: log.message, timestamp: log.timestamp }]
          });
        }
        return { executionLogs: logs };
      });
    });

    connection.onreconnecting((error) => {
      console.warn("[SignalR] Reconnecting...", error);
      setConnectionStatus('Reconnecting');
    });

    connection.onreconnected(() => {
      console.log("[SignalR] Reconnected Hub");
      setConnectionStatus('Connected');
    });

    connection.onclose((error) => {
      console.warn("[SignalR] Connection closed", error);
      setConnectionStatus('Disconnected');
    });

    const connectToHub = async () => {
      try {
        await connection.start();
        setConnectionStatus('Connected');
        console.log("[SignalR] Connected to Hub");
      } catch (error) {
        console.error("[SignalR] Connection error:", error);
        setConnectionStatus('Error');
      }
    };

    connectToHub();

    return () => {
      connection.stop();
    };
  }, []);

  // 2. Handle Join / Leave Workflow Group logic dynamically
  useEffect(() => {
    const connection = connectionRef.current;
    if (!instanceId || !connection || connectionStatus !== 'Connected') return;

    let isJoined = false;

    const joinGroup = async () => {
      try {
        await connection.invoke("JoinWorkflowGroup", instanceId);
        isJoined = true;
        console.log(`[SignalR] Joined workflow group: ${instanceId}`);
      } catch (error) {
        console.error("[SignalR] Join Group error:", error);
      }
    };
    
    joinGroup();

    return () => {
      const leaveGroup = async () => {
        if (isJoined && connection.state === signalR.HubConnectionState.Connected) {
          try {
            await connection.invoke("LeaveWorkflowGroup", instanceId);
            console.log(`[SignalR] Left workflow group: ${instanceId}`);
          } catch (error) {
            console.error("[SignalR] Leave Group error:", error);
          }
        }
      };
      
      leaveGroup();
    };
  }, [instanceId, connectionStatus]);

  return { connectionStatus };
};
