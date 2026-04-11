import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import type {
  PluginPackagePagedResponse,
  PluginPackageFilters,
  PluginPackageDetail,
  PluginVersionDetail,
  CreatePluginPackageDto,
  PluginPackageVersion,
  DropdownItem,
} from '@/types/plugin';

// ─── Dropdown Data (Execution Mode & Category) ───────────────────

export const fetchExecutionModeDropdown = async (): Promise<DropdownItem[]> => {
  const { data } = await apiClient.get('/dropdown/plugin-execution-mode');
  return data.data;
};

export const useExecutionModeDropdown = () => {
  return useQuery({
    queryKey: ['dropdown', 'plugin-execution-mode'],
    queryFn: fetchExecutionModeDropdown,
    staleTime: 10 * 60 * 1000, // cache for 10 minutes
  });
};

export const fetchCategoryDropdown = async (): Promise<DropdownItem[]> => {
  const { data } = await apiClient.get('/dropdown/plugin-category');
  return data.data;
};

export const useCategoryDropdown = () => {
  return useQuery({
    queryKey: ['dropdown', 'plugin-category'],
    queryFn: fetchCategoryDropdown,
    staleTime: 10 * 60 * 1000,
  });
};

// ─── Fetch Plugin Packages (Paged) ────────────────────────────────

export const fetchPluginPackages = async (
  filters: PluginPackageFilters
): Promise<PluginPackagePagedResponse> => {
  const params: Record<string, string | number | undefined> = {
    page: filters.page,
    size: filters.size,
  };

  // Only send non-empty values as query params
  if (filters.search && filters.search.trim()) {
    params.search = filters.search.trim();
  }
  if (filters.executionMode) {
    params.executionMode = filters.executionMode;
  }
  if (filters.category) {
    params.category = filters.category;
  }

  const { data } = await apiClient.get('/plugins/packages', { params });
  return data.data;
};

export const usePluginPackages = (filters: PluginPackageFilters) => {
  return useQuery({
    queryKey: ['plugin-packages', filters],
    queryFn: () => fetchPluginPackages(filters),
  });
};

// ─── Fetch Plugin Package Detail ──────────────────────────────────

export const fetchPluginPackageDetail = async (
  packageId: string
): Promise<PluginPackageDetail> => {
  const { data } = await apiClient.get(`/plugins/packages/${packageId}`);
  return data.data;
};

export const usePluginPackageDetail = (packageId: string | null) => {
  return useQuery({
    queryKey: ['plugin-package-detail', packageId],
    queryFn: () => fetchPluginPackageDetail(packageId!),
    enabled: !!packageId,
  });
};

// ─── Fetch Plugin Version Detail (Schemas & Metadata) ─────────────

export interface PluginVersionDetailParams {
  mode: string;
  name?: string;
  packageId?: string;
  version?: string;
}

export const fetchPluginVersionDetail = async (
  params: PluginVersionDetailParams
): Promise<PluginVersionDetail> => {
  const { data } = await apiClient.get('/plugins/details', { params });
  return data.data;
};

export const usePluginVersionDetail = (params: PluginVersionDetailParams | null) => {
  return useQuery({
    queryKey: ['plugin-version-detail', params],
    queryFn: () => fetchPluginVersionDetail(params!),
    enabled: !!params,
  });
};

// ─── Fetch Plugin Package Versions ────────────────────────────────

export const fetchPluginPackageVersions = async (
  packageId: string
): Promise<PluginPackageVersion[]> => {
  const { data } = await apiClient.get(
    `/plugins/packages/${packageId}/versions`
  );
  return data.data;
};

export const usePluginPackageVersions = (packageId: string | null) => {
  return useQuery({
    queryKey: ['plugin-package-versions', packageId],
    queryFn: () => fetchPluginPackageVersions(packageId!),
    enabled: !!packageId,
  });
};

// ─── Create Plugin Package ────────────────────────────────────────

export const createPluginPackage = async (
  dto: CreatePluginPackageDto
): Promise<{ id: string }> => {
  const { data } = await apiClient.post('/plugins/packages', dto);
  return data.data;
};

export const useCreatePluginPackage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPluginPackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugin-packages'] });
    },
  });
};

// ─── Upload Plugin Version ────────────────────────────────────────

export interface UploadVersionParams {
  packageId: string;
  version: string;
  bucket: string;
  releaseNotes: string;
  file: File;
}

export const uploadPluginVersion = async (
  params: UploadVersionParams
): Promise<PluginPackageVersion> => {
  const formData = new FormData();
  formData.append('version', params.version);
  formData.append('bucket', params.bucket);
  formData.append('releaseNotes', params.releaseNotes);
  formData.append('file', params.file);

  const { data } = await apiClient.post(
    `/plugins/packages/${params.packageId}/versions`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minutes for file uploads
    }
  );
  return data.data;
};

export const useUploadPluginVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadPluginVersion,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plugin-packages'] });
      queryClient.invalidateQueries({
        queryKey: ['plugin-package-detail', variables.packageId],
      });
      queryClient.invalidateQueries({
        queryKey: ['plugin-package-versions', variables.packageId],
      });
    },
  });
};

// ─── Toggle Enable/Disable Plugin Package ─────────────────────────

export const togglePluginPackage = async ({
  packageId,
  enabled,
}: {
  packageId: string;
  enabled: boolean;
}): Promise<void> => {
  await apiClient.patch(`/plugins/packages/${packageId}/toggle`, { enabled });
};

export const useTogglePluginPackage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: togglePluginPackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugin-packages'] });
    },
  });
};

// ─── Toggle a Specific Plugin Version On/Off ──────────────────────

export const toggleVersionActive = async ({
  packageId,
  versionId,
  active,
}: {
  packageId: string;
  versionId: string;
  active: boolean;
}): Promise<void> => {
  await apiClient.patch(
    `/plugins/packages/${packageId}/versions/${versionId}/toggle`,
    { active }
  );
};

export const useToggleVersionActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleVersionActive,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plugin-packages'] });
      queryClient.invalidateQueries({
        queryKey: ['plugin-package-detail', variables.packageId],
      });
      queryClient.invalidateQueries({
        queryKey: ['plugin-package-versions', variables.packageId],
      });
    },
  });
};
