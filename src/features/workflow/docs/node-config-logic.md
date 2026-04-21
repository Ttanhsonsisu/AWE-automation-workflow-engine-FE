# NodeConfigPanel Logic Documentation

This document explains the logic behind the `NodeConfigPanel` component, which is used to configure individual nodes in the workflow editor.

## Overview
The `NodeConfigPanel` is a modal interface that allows users to:
1.  Modify basic node metadata (Name, Description, Step ID).
2.  Select and switch between different versions of a plugin/package.
3.  Configure dynamic parameters defined by the plugin's JSON Schema.
4.  Persist these settings into the workflow state, which is eventually saved to the Backend (BE).

## Key Hooks and State

### 1. Data Fetching
- **`usePluginDetail`**: Fetches the full JSON Schema (input/output), display name, and execution metadata for a specific plugin version.
  - If it's a "Built-In" node, it uses the local definition.
  - If it's a "Package" node, it fetches from the orchestrator API based on `pluginName`, `version`, and `sha256`.
- **`usePackageVersions`**: Fetches all available versions for a given package ID.

### 2. State Management
- **`localFormData`**: Holds the current values of the dynamic input fields rendered by the RJSF (React JSON Schema Form). This is initialized from `node.data.config.inputs`.
- **`nodeName`, `nodeDescription`, `stepId`**: Local state for the basic node properties.
- **`selectedVersion`**: Tracks the currently selected plugin version.

## Logic Flow

### Schema Resolution (`resolveSchemaRefs`)
The backend often returns JSON Schemas with `$ref` pointers or `oneOf` structures that standard RJSF might struggle with if the definitions are nested. 
- The `resolveSchemaRefs` function flattens these refs into a structure RJSF can render directly.
- It recursively resolves objects and arrays to ensure deep structures are handled.

### Version Switching
- When a user changes the version, a confirmation dialog appears if there's already data in `localFormData`.
- Switching versions clears `localFormData` because the schema for the new version might be incompatible.

### Saving Data (`handleSave`)
When the user clicks "Lưu cấu hình", the following data is sent to the `updateNodeData` action in `workflowStore`:
- **`pluginMetadata`**: 
  - `version`: The selected version string.
  - `description`: The updated description.
  - `executionMetadata`: Metadata needed by the execution engine (like SHA256).
- **`config`**:
  - `nodeLabel`: The display name of the node.
  - `stepId`: The unique identifier used in the workflow logic.
  - `inputs`: The `localFormData` object containing all configured parameters.
  - `isConfigured`: Set to `true` to indicate the node is ready.

## Future Extensibility
To add more fields for the backend (e.g., timeout, retry policy, etc.):
1.  Add a new local state in `NodeConfigPanel.tsx`.
2.  Add a UI input for that state.
3.  Update the `handleSave` function to include this new state inside the `config` or `pluginMetadata` object in the `updateNodeData` call.
4.  Ensure the Backend and Execution Engine are updated to recognize these new fields in the workflow JSON.
