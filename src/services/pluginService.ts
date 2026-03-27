import apiClient from './apiClient';
import type { PluginCatalogResponse } from '@/types/plugin';

/**
 * Fetch the plugin catalog from the backend.
 * GET /plugins/catalog
 */
export async function fetchPluginCatalog(): Promise<PluginCatalogResponse> {
  const response = await apiClient.get<PluginCatalogResponse>('/plugins/catalog');
  return response.data;
}
