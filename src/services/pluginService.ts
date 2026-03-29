import apiClient from './apiClient';
import type {
  PluginCatalogResponse,
  PluginDetailParams,
  PluginDetailResponse,
} from '@/types/plugin';

/**
 * Fetch the plugin catalog from the backend.
 * GET /plugins/catalog
 */
export async function fetchPluginCatalog(): Promise<PluginCatalogResponse> {
  const response = await apiClient.get<PluginCatalogResponse>('/plugins/catalog');
  return response.data;
}

/**
 * Fetch detailed info for a specific plugin (input/output schema, metadata).
 * GET /plugins/details?mode=...&name=...&packageId=...&version=...
 *
 * For BuiltIn plugins: only `mode` and `name` are required.
 * For DynamicDll / RemoteGrpc: all four params are required.
 */
export async function fetchPluginDetail(
  params: PluginDetailParams
): Promise<PluginDetailResponse> {
  const queryParams: Record<string, string> = {
    mode: params.mode,
    name: params.name,
  };

  // Only include packageId and version for non-BuiltIn plugins
  if (params.mode !== 'BuiltIn') {
    if (params.packageId) queryParams.packageId = params.packageId;
    if (params.version) queryParams.version = params.version;
  }

  const response = await apiClient.get<PluginDetailResponse>('/plugins/details', {
    params: queryParams,
  });
  return response.data;
}

/**
 * Fetch available versions for a given plugin package ID.
 * GET /dropdown/version/package?packageId=...
 */
export async function fetchPackageVersions(
  packageId: string
): Promise<string[]> {
  const response = await apiClient.get<{ success: boolean; data: string[] }>(
    `/dropdown/version/package`,
    {
      params: { packageId },
    }
  );
  return response.data.data;
}
