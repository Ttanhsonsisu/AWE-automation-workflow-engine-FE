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

