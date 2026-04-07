/**
 * usePreloadPluginDetails Hook
 * ─────────────────────────────────────────────────────────────────
 * Preloads plugin details for all nodes requiring them (DynamicDll + RemoteGrpc)
 * This ensures forms can render immediately without waiting for individual fetches.
 */

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchPluginDetail } from '@/services/pluginService';
import type { WorkflowNode } from '@/stores/workflowStore';

interface PreloadOptions {
  /** Auto-retry failed fetches */
  autoRetry?: boolean;
  /** Callback for debugging/logging */
  onProgress?: (nodeId: string, status: 'fetching' | 'success' | 'error', error?: Error) => void;
}

/**
 * Preload plugin details for all nodes that need them (DynamicDll).
 * Stores results in React Query cache so usePluginDetail hooks use cached results.
 * 
 * Usage:
 * ```tsx
 * usePreloadPluginDetails(nodes, {
 *   onProgress: (nodeId, status, error) => {
 *     if (status === 'error') console.error(`Failed to load ${nodeId}`, error);
 *   }
 * });
 * ```
 */
export function usePreloadPluginDetails(
  nodes: WorkflowNode[],
  options?: PreloadOptions
) {
  const queryClient = useQueryClient();
  const inFlightRef = useRef<Set<string>>(new Set());
  const lastFingerprintRef = useRef<string>('');

  const autoRetry = options?.autoRetry ?? false;
  const onProgress = options?.onProgress;

  type PreloadTarget = {
    nodeId: string;
    executionMode: 'DynamicDll' | 'RemoteGrpc';
    pluginName: string;
    packageId?: string | null;
    version?: string | null;
    sha256?: string | null;
  };

  const buildCacheKey = useCallback(
    (target: Pick<PreloadTarget, 'executionMode' | 'pluginName' | 'version' | 'sha256'>) => {
      return [
        'plugin-detail',
        target.executionMode,
        target.pluginName,
        target.sha256 || (target.version ?? 'unknown'),
      ] as const;
    },
    []
  );

  const preloadTargets = useMemo<PreloadTarget[]>(() => {
    const targets: Array<PreloadTarget | null> = nodes.map((node) => {
        const executionMode = node.data.pluginMetadata?.executionMode;
        if (executionMode !== 'DynamicDll' && executionMode !== 'RemoteGrpc') {
          return null;
        }

        const pluginName = node.data.pluginMetadata?.name;
        if (!pluginName) return null;

        const packageId = node.data.pluginMetadata?.packageId;
        const version = node.data.pluginMetadata?.version;
        const executionMetadata = node.data.pluginMetadata?.executionMetadata as any;
        const sha256 = executionMetadata?.Sha256 || executionMetadata?.sha256;

        return {
          nodeId: node.id,
          executionMode: executionMode as 'DynamicDll' | 'RemoteGrpc',
          pluginName,
          packageId,
          version,
          sha256,
        };
      });

    return targets.filter((target): target is PreloadTarget => target !== null);
  }, [nodes]);

  const preloadFingerprint = useMemo(() => {
    // Fingerprint ignores position and other UI-only state, so dragging nodes won't retrigger preloading.
    return preloadTargets
      .map(
        (t) =>
          `${t.nodeId}|${t.executionMode}|${t.pluginName}|${t.packageId ?? ''}|${t.version ?? ''}|${t.sha256 ?? ''}`
      )
      .sort()
      .join('||');
  }, [preloadTargets]);

  const preloadNode = useCallback(
    async (target: PreloadTarget) => {
      const cacheKey = buildCacheKey(target);
      const requestId = cacheKey.join('|');

      // If cached already, do not call API again.
      const cached = queryClient.getQueryData(cacheKey);
      if (cached) return;

      // Prevent duplicate requests while a fetch for this key is in progress.
      if (inFlightRef.current.has(requestId)) return;
      inFlightRef.current.add(requestId);

      onProgress?.(target.nodeId, 'fetching');

      try {
        const response = await fetchPluginDetail({
          mode: target.executionMode,
          name: target.pluginName,
          packageId: target.packageId,
          version: target.version,
          sha256: target.sha256,
        });

        if (response.success) {
          // Store in React Query cache so usePluginDetail can reuse this data.
          queryClient.setQueryData(cacheKey, response.data);

          onProgress?.(target.nodeId, 'success');
        } else {
          throw new Error('API returned success: false');
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onProgress?.(target.nodeId, 'error', err);

        // Optionally retry
        if (autoRetry) {
          setTimeout(() => preloadNode(target), 2000);
        }
      } finally {
        inFlightRef.current.delete(requestId);
      }
    },
    [queryClient, buildCacheKey, onProgress, autoRetry]
  );

  // Preload only when plugin metadata fingerprint changes (not when node positions change).
  useEffect(() => {
    if (!preloadFingerprint || preloadFingerprint === lastFingerprintRef.current) {
      return;
    }

    lastFingerprintRef.current = preloadFingerprint;
    preloadTargets.forEach(preloadNode);
  }, [preloadFingerprint, preloadTargets, preloadNode]);
}

/**
 * Count how many nodes need preloading
 */
export function countNodesToPreload(nodes: WorkflowNode[]): number {
  return nodes.filter(
    n => n.data.pluginMetadata?.executionMode === 'DynamicDll' ||
         n.data.pluginMetadata?.executionMode === 'RemoteGrpc'
  ).length;
}

/**
 * Get all nodes that are DynamicDll plugins
 */
export function getDynamicDllNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  return nodes.filter(n => n.data.pluginMetadata?.executionMode === 'DynamicDll');
}
