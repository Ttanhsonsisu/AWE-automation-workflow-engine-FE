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
  // Strategy pattern based on executionMode
  switch (params.mode) {
    case 'DynamicDll': {
      // Rule 1: Load exactly compiled DLL by its Sha256 signature
      if (params.sha256) {
        const response = await apiClient.get<PluginDetailResponse>(`/plugins/details/by-sha256/${params.sha256}`);
        return response.data;
      }
      
      // Rule 2: Load DLL specs using its PackageId & Version
      if (params.packageId && params.version) {
        const response = await apiClient.get<PluginDetailResponse>('/plugins/details', {
          params: {
            mode: params.mode,
            name: params.name,
            packageId: params.packageId,
            version: params.version,
          },
        });
        return response.data;
      }

      throw new Error(`[DynamicDll] Missing required load parameters. Need either 'sha256' or both 'packageId' and 'version'`);
    }

    case 'RemoteGrpc': {
      // Future-proofing logic for RemoteGrpc (currently expects packageId & version)
      const response = await apiClient.get<PluginDetailResponse>('/plugins/details', {
        params: {
          mode: params.mode,
          name: params.name,
          packageId: params.packageId,
          version: params.version,
        },
      });
      return response.data;
    }

    case 'BuiltIn':
    default: {
      // BuiltIn relies purely on mode and name
      const response = await apiClient.get<PluginDetailResponse>('/plugins/details', {
        params: {
          mode: params.mode,
          name: params.name,
        },
      });
      return response.data;
    }
  }
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
