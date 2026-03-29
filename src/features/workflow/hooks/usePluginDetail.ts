import { useQuery } from '@tanstack/react-query';
import { fetchPluginDetail } from '@/services/pluginService';
import type { PluginDetailData } from '@/types/plugin';

/**
 * React Query hook to fetch and cache plugin detail (input/output schemas).
 * Automatically handles caching, dedup, and refetch logic.
 *
 * Cache key: ['plugin-detail', name, mode, version]
 * - BuiltIn plugins: version is ignored (keyed by name+mode only)
 * - DynamicDll/RemoteGrpc: keyed by name+mode+version
 */
export function usePluginDetail(
  pluginName: string | undefined,
  executionMode: string | undefined,
  packageId?: string | null,
  version?: string | null
) {
  const isBuiltIn = executionMode === 'BuiltIn';
  const cacheVersion = isBuiltIn ? 'Built-in' : (version ?? 'unknown');

  return useQuery<PluginDetailData>({
    queryKey: ['plugin-detail', pluginName, executionMode, cacheVersion],
    queryFn: async () => {
      const response = await fetchPluginDetail({
        mode: executionMode!,
        name: pluginName!,
        packageId: isBuiltIn ? undefined : packageId,
        version: isBuiltIn ? undefined : version,
      });

      if (!response.success) {
        throw new Error('Failed to fetch plugin detail');
      }

      return response.data;
    },
    enabled: !!pluginName && !!executionMode,
    staleTime: 5 * 60 * 1000, // 5 minutes — schemas rarely change
    gcTime: 30 * 60 * 1000,   // 30 minutes garbage collection
  });
}
