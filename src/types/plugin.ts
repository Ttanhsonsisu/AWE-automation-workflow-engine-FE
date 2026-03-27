// ======================================================================
// Plugin Catalog Types - Maps to backend API response
// GET /api/plugins/catalog
// ======================================================================

/** JSON Schema definition for plugin input/output */
export interface JsonSchemaProperty {
  type: string;
  title?: string;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  format?: string;
  items?: JsonSchemaProperty;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
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
  executionMode: 'BuiltIn' | 'DynamicDll' | string;
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
