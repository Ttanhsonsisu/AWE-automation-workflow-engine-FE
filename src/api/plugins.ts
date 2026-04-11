import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import apiClient from '@/services/apiClient'; // uncomment when backend is ready
import type {
  PluginPackagePagedResponse,
  PluginPackageFilters,
  PluginPackageDetail,
  CreatePluginPackageDto,
  PluginPackageVersion,
  PluginPackageItem,
} from '@/types/plugin';

// ======================================================================
// 🔧 MOCK DATA — Remove this section when backend APIs are available
// ======================================================================

const MOCK_PLUGINS: PluginPackageItem[] = [
  {
    id: 'pkg-001',
    uniqueName: 'postgres-connector',
    displayName: 'PostgreSQL Connector',
    description: 'Connect to PostgreSQL databases for read/write operations, execute queries, and manage transactions in your workflows.',
    category: 'Database',
    icon: '🐘',
    executionMode: 'BuiltIn',
    latestVersion: '2.4.1',
    isEnabled: true,
    createdAt: '2025-08-15T10:30:00Z',
    updatedAt: '2026-03-20T14:15:00Z',
  },
  {
    id: 'pkg-002',
    uniqueName: 'slack-notifier',
    displayName: 'Slack Notifier',
    description: 'Send messages, notifications, and rich cards to Slack channels. Supports threads, reactions, and file sharing.',
    category: 'Communication',
    icon: '💬',
    executionMode: 'RemoteGrpc',
    latestVersion: '1.8.0',
    isEnabled: true,
    createdAt: '2025-09-01T08:00:00Z',
    updatedAt: '2026-04-01T09:30:00Z',
  },
  {
    id: 'pkg-003',
    uniqueName: 'email-smtp-sender',
    displayName: 'Email SMTP Sender',
    description: 'Send transactional and marketing emails via SMTP. Supports HTML templates, attachments, and CC/BCC recipients.',
    category: 'Communication',
    icon: '📧',
    executionMode: 'BuiltIn',
    latestVersion: '3.1.2',
    isEnabled: true,
    createdAt: '2025-06-10T12:00:00Z',
    updatedAt: '2026-02-28T16:45:00Z',
  },
  {
    id: 'pkg-004',
    uniqueName: 'azure-blob-storage',
    displayName: 'Azure Blob Storage',
    description: 'Upload, download, and manage files in Azure Blob Storage containers with support for SAS tokens and metadata.',
    category: 'Storage',
    icon: '☁️',
    executionMode: 'DynamicDll',
    latestVersion: '1.3.0',
    isEnabled: true,
    createdAt: '2025-11-20T15:00:00Z',
    updatedAt: '2026-03-15T11:20:00Z',
  },
  {
    id: 'pkg-005',
    uniqueName: 'rest-api-caller',
    displayName: 'REST API Caller',
    description: 'Make HTTP requests to any REST API endpoint. Supports GET, POST, PUT, DELETE, custom headers, and authentication.',
    category: 'Integration',
    icon: '🔗',
    executionMode: 'BuiltIn',
    latestVersion: '4.0.0',
    isEnabled: true,
    createdAt: '2025-05-01T09:00:00Z',
    updatedAt: '2026-04-05T10:00:00Z',
  },
  {
    id: 'pkg-006',
    uniqueName: 'json-transformer',
    displayName: 'JSON Transformer',
    description: 'Transform, map, and manipulate JSON data structures. Supports JSONPath, JMESPath, and custom transformation scripts.',
    category: 'Utility',
    icon: '⚙️',
    executionMode: 'BuiltIn',
    latestVersion: '2.1.0',
    isEnabled: true,
    createdAt: '2025-07-15T11:30:00Z',
    updatedAt: '2026-01-10T08:45:00Z',
  },
  {
    id: 'pkg-007',
    uniqueName: 'redis-cache',
    displayName: 'Redis Cache Manager',
    description: 'Interact with Redis for caching, pub/sub messaging, and key-value store operations with TTL support.',
    category: 'Database',
    icon: '🔴',
    executionMode: 'DynamicDll',
    latestVersion: '1.5.2',
    isEnabled: false,
    createdAt: '2025-10-05T14:00:00Z',
    updatedAt: '2026-02-20T09:30:00Z',
  },
  {
    id: 'pkg-008',
    uniqueName: 'openai-gpt-connector',
    displayName: 'OpenAI GPT Connector',
    description: 'Integrate with OpenAI GPT models for text generation, summarization, classification, and conversational AI tasks.',
    category: 'AI',
    icon: '🤖',
    executionMode: 'RemoteGrpc',
    latestVersion: '2.0.1',
    isEnabled: true,
    createdAt: '2025-12-01T10:00:00Z',
    updatedAt: '2026-04-08T13:00:00Z',
  },
  {
    id: 'pkg-009',
    uniqueName: 'csv-parser',
    displayName: 'CSV Parser & Writer',
    description: 'Parse CSV files into structured data and write data back to CSV format. Supports custom delimiters and encoding.',
    category: 'Utility',
    icon: '📄',
    executionMode: 'BuiltIn',
    latestVersion: '1.2.0',
    isEnabled: true,
    createdAt: '2025-08-20T16:00:00Z',
    updatedAt: '2025-12-15T12:30:00Z',
  },
  {
    id: 'pkg-010',
    uniqueName: 'mysql-connector',
    displayName: 'MySQL Connector',
    description: 'Connect to MySQL databases for executing queries, stored procedures, and managing database connections with pooling.',
    category: 'Database',
    icon: '🐬',
    executionMode: 'DynamicDll',
    latestVersion: '1.7.3',
    isEnabled: true,
    createdAt: '2025-09-15T09:30:00Z',
    updatedAt: '2026-03-25T10:15:00Z',
  },
  {
    id: 'pkg-011',
    uniqueName: 'webhook-trigger',
    displayName: 'Webhook Trigger',
    description: 'Expose HTTP webhook endpoints to trigger workflows from external services with payload validation and auth headers.',
    category: 'Integration',
    icon: '🪝',
    executionMode: 'BuiltIn',
    latestVersion: '3.2.1',
    isEnabled: true,
    createdAt: '2025-04-10T07:00:00Z',
    updatedAt: '2026-04-10T15:00:00Z',
  },
  {
    id: 'pkg-012',
    uniqueName: 'jwt-auth-validator',
    displayName: 'JWT Auth Validator',
    description: 'Validate and decode JWT tokens, extract claims, and enforce role-based access control within workflow steps.',
    category: 'Security',
    icon: '🛡️',
    executionMode: 'BuiltIn',
    latestVersion: '1.0.4',
    isEnabled: true,
    createdAt: '2025-11-10T13:00:00Z',
    updatedAt: '2026-01-22T11:00:00Z',
  },
  {
    id: 'pkg-013',
    uniqueName: 'prometheus-metrics',
    displayName: 'Prometheus Metrics Exporter',
    description: 'Export workflow execution metrics to Prometheus for monitoring, alerting, and performance tracking dashboards.',
    category: 'Analytics',
    icon: '📊',
    executionMode: 'RemoteGrpc',
    latestVersion: '0.9.0',
    isEnabled: false,
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-03-30T14:45:00Z',
  },
  {
    id: 'pkg-014',
    uniqueName: 'docker-executor',
    displayName: 'Docker Container Executor',
    description: 'Run isolated tasks in Docker containers with custom images, volume mounts, and environment variable injection.',
    category: 'DevOps',
    icon: '🐳',
    executionMode: 'RemoteGrpc',
    latestVersion: '1.1.0',
    isEnabled: true,
    createdAt: '2025-12-20T08:30:00Z',
    updatedAt: '2026-04-02T12:00:00Z',
  },
  {
    id: 'pkg-015',
    uniqueName: 'teams-notifier',
    displayName: 'Microsoft Teams Notifier',
    description: 'Send adaptive cards and messages to Microsoft Teams channels and group chats using incoming webhooks.',
    category: 'Notification',
    icon: '🔔',
    executionMode: 'DynamicDll',
    latestVersion: '1.4.0',
    isEnabled: true,
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-04-09T16:30:00Z',
  },
];

const MOCK_VERSIONS: Record<string, PluginPackageVersion[]> = {
  'pkg-001': [
    { id: 'v001-3', packageId: 'pkg-001', version: '2.4.1', bucket: 'production', releaseNotes: 'Fixed connection pooling memory leak on high-concurrency workloads.', filePath: null, sha256: null, createdAt: '2026-03-20T14:15:00Z', isActive: true },
    { id: 'v001-2', packageId: 'pkg-001', version: '2.3.0', bucket: 'production', releaseNotes: 'Added support for JSONB column types and array parameters.', filePath: null, sha256: null, createdAt: '2026-01-10T09:00:00Z', isActive: false },
    { id: 'v001-1', packageId: 'pkg-001', version: '2.0.0', bucket: 'production', releaseNotes: 'Major rewrite with connection pooling, SSL support, and batch operations.', filePath: null, sha256: null, createdAt: '2025-10-05T12:00:00Z', isActive: false },
  ],
  'pkg-002': [
    { id: 'v002-2', packageId: 'pkg-002', version: '1.8.0', bucket: 'production', releaseNotes: 'Added Block Kit support for rich message formatting.', filePath: '/uploads/slack-1.8.0.zip', sha256: 'abc123', createdAt: '2026-04-01T09:30:00Z', isActive: true },
    { id: 'v002-1', packageId: 'pkg-002', version: '1.5.0', bucket: 'staging', releaseNotes: 'Initial gRPC implementation with basic message sending.', filePath: '/uploads/slack-1.5.0.zip', sha256: 'def456', createdAt: '2025-11-15T10:00:00Z', isActive: false },
  ],
  'pkg-004': [
    { id: 'v004-2', packageId: 'pkg-004', version: '1.3.0', bucket: 'production', releaseNotes: 'Added SAS token generation and container-level operations.', filePath: '/uploads/azure-blob-1.3.0.dll', sha256: 'ghi789', createdAt: '2026-03-15T11:20:00Z', isActive: true },
    { id: 'v004-1', packageId: 'pkg-004', version: '1.0.0', bucket: 'production', releaseNotes: 'Initial release with upload, download, and list blob operations.', filePath: '/uploads/azure-blob-1.0.0.dll', sha256: 'jkl012', createdAt: '2025-11-20T15:00:00Z', isActive: false },
  ],
  'pkg-008': [
    { id: 'v008-3', packageId: 'pkg-008', version: '2.0.1', bucket: 'production', releaseNotes: 'Patched token counting for GPT-4 Turbo model responses.', filePath: '/uploads/openai-2.0.1.zip', sha256: 'mno345', createdAt: '2026-04-08T13:00:00Z', isActive: true },
    { id: 'v008-2', packageId: 'pkg-008', version: '2.0.0', bucket: 'production', releaseNotes: 'Added GPT-4 Turbo and vision model support. Breaking change: new config schema.', filePath: '/uploads/openai-2.0.0.zip', sha256: 'pqr678', createdAt: '2026-02-15T10:00:00Z', isActive: false },
    { id: 'v008-1', packageId: 'pkg-008', version: '1.0.0', bucket: 'staging', releaseNotes: 'Initial release with GPT-3.5 support and basic prompt chaining.', filePath: '/uploads/openai-1.0.0.zip', sha256: 'stu901', createdAt: '2025-12-01T10:00:00Z', isActive: false },
  ],
  'pkg-010': [
    { id: 'v010-1', packageId: 'pkg-010', version: '1.7.3', bucket: 'production', releaseNotes: 'Fixed parameterized query escaping for special characters.', filePath: '/uploads/mysql-1.7.3.dll', sha256: 'vwx234', createdAt: '2026-03-25T10:15:00Z', isActive: true },
  ],
  'pkg-014': [
    { id: 'v014-2', packageId: 'pkg-014', version: '1.1.0', bucket: 'production', releaseNotes: 'Added GPU passthrough support and custom network configuration.', filePath: '/uploads/docker-1.1.0.zip', sha256: 'yza567', createdAt: '2026-04-02T12:00:00Z', isActive: true },
    { id: 'v014-1', packageId: 'pkg-014', version: '1.0.0', bucket: 'staging', releaseNotes: 'Initial Docker executor with basic container lifecycle management.', filePath: '/uploads/docker-1.0.0.zip', sha256: 'bcd890', createdAt: '2025-12-20T08:30:00Z', isActive: false },
  ],
};

const MOCK_DETAILS: Record<string, Partial<PluginPackageDetail>> = {
  'pkg-001': {
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: { type: 'string', description: 'PostgreSQL connection string (e.g. host=localhost;port=5432;...)' },
        query: { type: 'string', description: 'SQL query to execute' },
        parameters: { type: 'object', description: 'Query parameters as key-value pairs' },
        timeout: { type: 'number', description: 'Query timeout in seconds', default: 30 },
      },
      required: ['connectionString', 'query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        rows: { type: 'array', description: 'Array of result rows' },
        rowCount: { type: 'number', description: 'Number of affected/returned rows' },
        executionTimeMs: { type: 'number', description: 'Query execution time in milliseconds' },
      },
    },
  },
  'pkg-002': {
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Slack channel ID or name (e.g. #general)' },
        message: { type: 'string', description: 'Message text content' },
        blocks: { type: 'array', description: 'Block Kit JSON blocks for rich formatting' },
        threadTs: { type: 'string', description: 'Thread timestamp to reply in thread' },
      },
      required: ['channel', 'message'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        ts: { type: 'string', description: 'Message timestamp ID' },
        channel: { type: 'string', description: 'Channel the message was posted to' },
        ok: { type: 'boolean', description: 'Whether the operation was successful' },
      },
    },
  },
  'pkg-005': {
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Full URL to send the request to' },
        method: { type: 'string', description: 'HTTP method', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        headers: { type: 'object', description: 'Request headers as key-value pairs' },
        body: { type: 'string', description: 'Request body (JSON string)' },
        timeout: { type: 'number', description: 'Request timeout in seconds', default: 30 },
        retryCount: { type: 'number', description: 'Number of retry attempts on failure', default: 0 },
      },
      required: ['url', 'method'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', description: 'HTTP response status code' },
        body: { type: 'string', description: 'Response body as string' },
        headers: { type: 'object', description: 'Response headers' },
        elapsedMs: { type: 'number', description: 'Request duration in milliseconds' },
      },
    },
  },
  'pkg-008': {
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'OpenAI model ID (e.g. gpt-4-turbo)', enum: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'] },
        prompt: { type: 'string', description: 'User prompt / input text' },
        systemMessage: { type: 'string', description: 'System message to set the behavior' },
        maxTokens: { type: 'number', description: 'Maximum response tokens', default: 1024 },
        temperature: { type: 'number', description: 'Sampling temperature (0.0 - 2.0)', default: 0.7 },
      },
      required: ['model', 'prompt'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Generated response text' },
        finishReason: { type: 'string', description: 'Reason the model stopped generating' },
        promptTokens: { type: 'number', description: 'Number of tokens in the prompt' },
        completionTokens: { type: 'number', description: 'Number of tokens in the response' },
        totalTokens: { type: 'number', description: 'Total tokens used' },
      },
    },
  },
};

/** Simulate network delay */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Fetch Plugin Packages (Paged) ────────────────────────────────

export const fetchPluginPackages = async (
  filters: PluginPackageFilters
): Promise<PluginPackagePagedResponse> => {
  await delay(600); // simulate network

  let items = [...MOCK_PLUGINS];

  // Apply search filter
  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        p.uniqueName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }

  // Apply execution mode filter
  if (filters.executionMode) {
    items = items.filter((p) => p.executionMode === filters.executionMode);
  }

  // Apply category filter
  if (filters.category) {
    items = items.filter((p) => p.category === filters.category);
  }

  const totalCount = items.length;
  const pageSize = filters.size || 12;
  const pageNumber = filters.page || 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIdx = (pageNumber - 1) * pageSize;
  const pagedItems = items.slice(startIdx, startIdx + pageSize);

  return {
    items: pagedItems,
    pageNumber,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage: pageNumber > 1,
    hasNextPage: pageNumber < totalPages,
  };
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
  await delay(400);

  const pkg = MOCK_PLUGINS.find((p) => p.id === packageId);
  if (!pkg) throw new Error('Package not found');

  const extra = MOCK_DETAILS[packageId] || {};

  return {
    ...pkg,
    inputSchema: extra.inputSchema || { type: 'object', properties: {} },
    outputSchema: extra.outputSchema || { type: 'object', properties: {} },
    versions: MOCK_VERSIONS[packageId] || [],
  };
};

export const usePluginPackageDetail = (packageId: string | null) => {
  return useQuery({
    queryKey: ['plugin-package-detail', packageId],
    queryFn: () => fetchPluginPackageDetail(packageId!),
    enabled: !!packageId,
  });
};

// ─── Fetch Plugin Package Versions ────────────────────────────────

export const fetchPluginPackageVersions = async (
  packageId: string
): Promise<PluginPackageVersion[]> => {
  await delay(350);
  return MOCK_VERSIONS[packageId] || [];
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
  await delay(800);

  const newId = `pkg-${String(MOCK_PLUGINS.length + 1).padStart(3, '0')}`;
  const newPkg: PluginPackageItem = {
    id: newId,
    uniqueName: dto.uniqueName,
    displayName: dto.displayName,
    description: dto.description,
    category: 'Utility',
    icon: '🧩',
    executionMode: 'DynamicDll',
    latestVersion: null,
    isEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  MOCK_PLUGINS.unshift(newPkg);

  console.log('✅ [Mock] Created plugin package:', newPkg);
  return { id: newId };
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
  await delay(1200); // simulate file upload

  const newVersion: PluginPackageVersion = {
    id: `v-${Date.now()}`,
    packageId: params.packageId,
    version: params.version,
    bucket: params.bucket,
    releaseNotes: params.releaseNotes,
    filePath: `/uploads/${params.file.name}`,
    sha256: Math.random().toString(36).substring(2, 15),
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  // Add to versions mock
  if (!MOCK_VERSIONS[params.packageId]) {
    MOCK_VERSIONS[params.packageId] = [];
  }
  // Mark old versions as inactive
  MOCK_VERSIONS[params.packageId].forEach((v) => (v.isActive = false));
  MOCK_VERSIONS[params.packageId].unshift(newVersion);

  // Update latest version on the package
  const pkg = MOCK_PLUGINS.find((p) => p.id === params.packageId);
  if (pkg) {
    pkg.latestVersion = params.version;
    pkg.updatedAt = new Date().toISOString();
  }

  console.log('✅ [Mock] Uploaded version:', newVersion);
  return newVersion;
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
  await delay(400);

  const pkg = MOCK_PLUGINS.find((p) => p.id === packageId);
  if (pkg) {
    pkg.isEnabled = enabled;
    console.log(`✅ [Mock] Plugin ${pkg.displayName} → ${enabled ? 'Enabled' : 'Disabled'}`);
  }
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
  await delay(400);

  const versions = MOCK_VERSIONS[packageId];
  if (versions) {
    const ver = versions.find((v) => v.id === versionId);
    if (ver) {
      ver.isActive = active;
      console.log(`✅ [Mock] Version ${ver.version} → ${active ? 'ON' : 'OFF'}`);
    }
  }
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

