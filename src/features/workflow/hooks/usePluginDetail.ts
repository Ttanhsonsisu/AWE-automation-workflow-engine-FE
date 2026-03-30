import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPluginDetail } from '@/services/pluginService';
import type { PluginDetailData } from '@/types/plugin';

/**
 * React Query hook to fetch and cache plugin detail (input/output schemas).
 * Automatically handles caching, dedup, and refetch logic.
 *
 * Cache key: ['plugin-detail', name, mode, version]
 * - BuiltIn plugins: version is ignored (keyed by name+mode only)
 * - DynamicDll/RemoteGrpc: keyed by name+mode+version or sha256
 * 
 * Priority for DynamicDll loading:
 * 1. If sha256 is provided → fetch by sha256 (most specific)
 * 2. If packageId + version → fetch by package version
 * 3. If only pluginName → assume BuiltIn fallback
 */
export function usePluginDetail(
  pluginName: string | undefined,
  executionMode: string | undefined,
  packageId?: string | null,
  version?: string | null,
  sha256?: string | null
) {
  const isBuiltIn = executionMode === 'BuiltIn';
  
  // Cache key strategy:
  // - If sha256 available, use it (highest priority)
  // - Otherwise use version or default identifier
  const cacheVersion = sha256 || (isBuiltIn ? 'BuiltIn' : (version ?? 'unknown'));

  // Validation: prevent hitting backend with incomplete params
  const canFetch = (() => {
    if (!executionMode) {
      console.warn('[usePluginDetail] Missing executionMode - skipping fetch');
      return false;
    }
    
    if (executionMode === 'DynamicDll') {
      // DynamicDll requires one of: sha256 OR (packageId + version)
      const hasSha256 = !!sha256;
      const hasPackageVersion = !!(packageId && version);
      const canFetchDll = hasSha256 || hasPackageVersion;
      
      if (!canFetchDll) {
        console.warn(
          '[usePluginDetail] DynamicDll requires sha256 or (packageId + version)',
          { sha256, packageId, version }
        );
      }
      return canFetchDll;
    }
    
    if (executionMode === 'RemoteGrpc') {
      // RemoteGrpc requires pluginName + packageId + version
      const canFetchGrpc = !!(pluginName && packageId && version);
      if (!canFetchGrpc) {
        console.warn(
          '[usePluginDetail] RemoteGrpc requires name, packageId, and version',
          { pluginName, packageId, version }
        );
      }
      return canFetchGrpc;
    }
    
    // BuiltIn: only needs pluginName
    const canFetchBuiltIn = !!pluginName;
    if (!canFetchBuiltIn) {
      console.warn('[usePluginDetail] BuiltIn requires pluginName');
    }
    return canFetchBuiltIn;
  })();

  // Debug logging for hydration troubleshooting
  useEffect(() => {
    if (canFetch) {
      console.log('[usePluginDetail] Fetch enabled:', {
        executionMode,
        pluginName,
        packageId,
        version,
        sha256,
        cacheVersion,
      });
    }
  }, [canFetch, executionMode, pluginName, packageId, version, sha256, cacheVersion]);

  return useQuery<PluginDetailData>({
    queryKey: ['plugin-detail', executionMode, pluginName, cacheVersion],
    queryFn: async () => {
      console.log('[usePluginDetail] Fetching:', { executionMode, pluginName, sha256 });
      
      const response = await fetchPluginDetail({
        mode: executionMode!,
        name: pluginName || 'Unknown',
        packageId: isBuiltIn ? undefined : packageId,
        version: isBuiltIn ? undefined : version,
        sha256: sha256,
      });

      if (!response.success) {
        const errorMsg = `Failed to fetch plugin detail for ${pluginName} (${executionMode})`;
        console.error('[usePluginDetail] API error:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('[usePluginDetail] Success:', {
        name: response.data.name,
        mode: response.data.executionMode,
      });

      return response.data;
    },
    enabled: canFetch,
    staleTime: 5 * 60 * 1000,    // 5 minutes — schemas rarely change
    gcTime: 30 * 60 * 1000,      // 30 minutes garbage collection
    retry: 2,                     // Retry failed requests
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 500ms → 1000ms → 2000ms
      return (attemptIndex + 1) * 500;
    },
  });
}
