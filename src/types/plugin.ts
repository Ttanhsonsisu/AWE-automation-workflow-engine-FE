// ======================================================================
// Plugin Catalog Types - Maps to backend API response
// GET /api/plugins/catalog
// ======================================================================

/** Execution modes for plugins */
export type PluginExecutionMode = 'BuiltIn' | 'DynamicDll' | 'RemoteGrpc';

/** JSON Schema definition for plugin input/output */
export interface JsonSchemaProperty {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  format?: string;
  items?: JsonSchemaProperty | JsonSchemaProperty[];
  /** Recursive properties for objects */
  properties?: Record<string, JsonSchemaProperty>;
  /** Required fields for objects */
  required?: string[];
  'x-nullable'?: boolean;
  'x-enumNames'?: string[];
  /** JSON Schema $ref pointer, e.g. "#/definitions/TextOperation" */
  $ref?: string;
  /** oneOf combinator — used by backend for enum references */
  oneOf?: JsonSchemaProperty[];
}

export interface JsonSchema {
  $schema?: string;
  title?: string;
  type?: string;
  additionalProperties?: boolean;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  /** JSON Schema definitions block for $ref resolution */
  definitions?: Record<string, JsonSchemaProperty>;
}

/** A single plugin definition from the catalog API */
export interface PluginDefinition {
  packageId: string | null;
  activeVersion: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  icon: string;
  executionMode: PluginExecutionMode | string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
}

/** A category group from the catalog API */
export interface PluginCategory {
  category: string;
  plugins: PluginDefinition[];
}

/** The full API response */
export interface PluginCatalogResponse {
  success: boolean;
  data: PluginCategory[];
}

// ======================================================================
// Plugin Detail Types - Maps to backend API response
// GET /api/plugins/details?mode=...&name=...&packageId=...&version=...
// ======================================================================

/** Query params for plugin detail API */
export interface PluginDetailParams {
  mode: PluginExecutionMode | string;
  name: string;
  /** Required for DynamicDll / RemoteGrpc; null for BuiltIn */
  packageId?: string | null;
  /** Required for DynamicDll / RemoteGrpc; null for BuiltIn */
  version?: string | null;
  /** Used to fetch specific plugin dll by sha256 when packageId is unavailable */
  sha256?: string | null;
}

export interface PluginDetailData {
  packageId?: string | null;
  name: string;
  displayName: string;
  description?: string;
  category?: string;
  icon?: string;
  executionMode: PluginExecutionMode | string;
  version: string | null;
  executionMetadata: unknown;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
}

/** Full API response wrapper */
export interface PluginDetailResponse {
  success: boolean;
  data: PluginDetailData;
}

/** Response wrapper for package versions list */
export interface PackageVersionsResponse {
  success: boolean;
  data: string[];
}

// ======================================================================
// Plugin Package Management Types
// ======================================================================

/** Execution mode numeric enum mapping from C# backend */
export const ExecutionModeMap: Record<number, PluginExecutionMode> = {
  0: 'BuiltIn',
  1: 'DynamicDll',
  2: 'RemoteGrpc',
};

/** A single plugin package in the list/grid — maps to GET /api/plugins/packages */
export interface PluginPackageItem {
  /** null for BuiltIn plugins */
  id: string | null;
  uniqueName: string;
  displayName: string;
  description: string;
  category: string;
  icon: string;
  /** Backend returns a number: 0=BuiltIn, 1=DynamicDll, 2=RemoteGrpc */
  executionMode: number | string;
  latestVersion: string | null;
  isBuiltIn: boolean;
  isEnabled?: boolean;
}

/** Paged response for plugin packages */
export interface PluginPackagePagedResponse {
  items: PluginPackageItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/** Version entry for a specific plugin package */
export interface PluginPackageVersion {
  id: string;
  packageId: string;
  version: string;
  bucket: string;
  releaseNotes: string;
  filePath: string | null;
  sha256: string | null;
  createdAt: string;
  isActive: boolean;
}

/** DTO for creating a new plugin package */
export interface CreatePluginPackageDto {
  uniqueName: string;
  displayName: string;
  description: string;
}

/** DTO for uploading a new version to a plugin package */
export interface UploadPluginVersionDto {
  packageId: string;
  version: string;
  bucket: string;
  releaseNotes: string;
  file: File;
}

/** Filter params for listing plugin packages */
export interface PluginPackageFilters {
  page: number;
  size: number;
  search?: string;
  executionMode?: string;
  category?: string;
}

/** Generic dropdown item from /api/dropdown/* endpoints */
export interface DropdownItem {
  value: string;
  label: string;
}

/** Plugin package detail (full info including inputs/outputs) */
export interface PluginPackageDetail {
  id: string | null;
  uniqueName: string;
  displayName: string;
  description: string;
  category: string;
  icon: string;
  executionMode: number | string;
  latestVersion: string | null;
  isBuiltIn: boolean;
  isEnabled?: boolean;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  versions: PluginPackageVersion[];
}

/** Detail for a specific version/built-in plugin — maps to GET /api/plugins/details */
export interface PluginVersionDetail {
  name: string;
  displayName: string;
  executionMode: string;
  version: string | null;
  executionMetadata: ExecutionMetadata | null;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
}

/** Metadata related to plugin execution (e.g. file size, sha256) */
export interface ExecutionMetadata {
  Size: number;
  Bucket: string;
  Sha256: string;
  ObjectKey: string;
  PluginType: string;
  OutputSchema?: JsonSchema;
}

