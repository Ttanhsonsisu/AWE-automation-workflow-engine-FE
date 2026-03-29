import { useQuery } from '@tanstack/react-query';
import { fetchPackageVersions } from '@/services/pluginService';

/**
 * Hook to fetch and cache version list for a plugin package.
 * Cache key: ['package-versions', packageId]
 */
export function usePackageVersions(packageId: string | null | undefined) {
  return useQuery<string[]>({
    queryKey: ['package-versions', packageId],
    queryFn: async () => {
      if (!packageId) return [];
      return fetchPackageVersions(packageId);
    },
    enabled: !!packageId,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });
}
