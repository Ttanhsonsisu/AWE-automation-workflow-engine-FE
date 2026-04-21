# Hướng Dẫn Sửa Lỗi Đồng Bộ UI Workflow - UiJson Hydration System

## 📋 Tóm Tắt Vấn Đề

Khi tạo Workflow qua API (Postman) với `UiJson = null`, hệ thống không thể:
1. **Render giao diện**: Không hiển thị nodes và edges trên canvas
2. **Điền form**: Form không có dữ liệu để render input fields cho DynamicDll plugins
3. **Lưu lại**: Khi save, UiJson chưa được tạo hoặc không chính xác

## ✅ Giải Pháp Được Triển Khai

### 1. **Auto-Layout Engine** (`workflowHydration.ts`)

**Vấn đề cũ**: Layout đơn giản (vertical grid) không tối ưu

**Giải pháp**:
- 🎯 **Hierarchical Layout Algorithm** (DAG-based):
  - Tính rank cho mỗi node dựa trên khoảng cách từ start node
  - Xếp node theo cột (x = rank × spacing.x)
  - Center node trong rank (y = indexInRank × spacing.y)
  
```typescript
computeAutoLayout(
  stepIds: string[],
  transitionMap: Map<Source, [Target...]>,
  options?: { rankSpacingX?, rankSpacingY?, ... }
): LayoutPosition
```

**Kết quả**: Diagram được xếp khoảng cách đều, duyệt được từ trái sang phải, dễ đọc.

---

### 2. **Hydration System** (`workflowHydration.ts`)

**Ba hàm chính**:

#### `hydrateNodesFromDefinition(steps, categories, layoutPositions)`
- Chuyển `DefinitionJson.Steps` → `WorkflowNodes`
- **Sử dụng Step.Id làm node ID** (thay vì random) → consistency
- Map plugin metadata từ catalog
- Gán layout position từ auto-layout

**Input**:
```typescript
DefinitionStep {
  Id: string;
  Type: string;
  DisplayName?: string;
  ExecutionMode: "BuiltIn" | "DynamicDll" | "RemoteGrpc";
  ExecutionMetadata?: any;
  Inputs?: Record<string, unknown>;
  Version?: string;
}
```

**Output**:
```typescript
WorkflowNode {
  id: step.Id,  // Konsisten!
  type: "startNode" | "actionNode",
  position: { x, y },  // Từ auto-layout
  data: {
    pluginMetadata: {..., executionMode, inputSchema, outputSchema},
    config: { inputs, stepId, isConfigured },
    uiState: { isValid: true }
  }
}
```

#### `hydrateEdgesFromTransitions(transitions)`
- Chuyển `DefinitionJson.Transitions` → `WorkflowEdges`
- Map Step IDs → Node IDs

#### `hydrateWorkflowFromDefinition(steps, transitions, categories)`
- **Orchestrator**: Gọi tất cả hàm trên
- Trả về: `{ nodes, edges, layoutPositions }`

---

### 3. **Plugin Detail Preloading** (`usePreloadPluginDetails.ts`)

**Vấn đề cũ**: 
- Form load → cần plugin detail → fetch API → form wait → user see loading

**Giải pháp**:
```typescript
usePreloadPluginDetails(nodes, { 
  autoRetry?: true,
  onProgress?: (nodeId, status, error) => {...}
})
```

**Cách hoạt động**:
1. Scan tất cả nodes tìm `ExecutionMode === "DynamicDll"`
2. Preload plugin detail cho từng node → cache bằng React Query
3. Khi `usePluginDetail` hook được gọi trong NodeConfigPanel → data đã có sẵn

**Benefit**: Form render instantly, không thấy loading skeleton

---

### 4. **Enhanced usePluginDetail Hook** (`usePluginDetail.ts`)

**Cải tiến**:
1. ✅ **Validation tốt hơn**: Không gửi request nếu thiếu param
2. ✅ **Priority logic DynamicDll**:
   - Ưu tiên `sha256` (specific binary)
   - Fallback: `packageId + version`
   - Fallback: `pluginName` (BuiltIn)
3. ✅ **Retry logic**: Auto-retry 2 lần với exponential backoff
4. ✅ **Debug logging**: Chi tiết cho troubleshooting

---

### 5. **Updated WorkflowEditPage** 

**Thay đổi**:
```typescript
// HYDRATION: Nếu UiJson = null
if (initialNodes.length === 0 && workflowDef.definition?.Steps?.length > 0) {
  const result = hydrateWorkflowFromDefinition(
    workflowDef.definition.Steps,
    workflowDef.definition.Transitions || [],
    categories
  );
  initialNodes = result.nodes;
  initialEdges = result.edges;
}

// PRELOAD: Trước khi render canvas
usePreloadPluginDetails(nodes, { /* ... */ });
```

---

### 6. **Save Workflow với UiJson** (`WorkflowTopbar.tsx` - Đã tồn tại)

**Kiểm tra**: Payload khi save:
```typescript
const payload = {
  Id: workflowId,
  Name: workflowName,
  DefinitionJson: {
    Steps: nodes.map(n => ({
      Id: n.data.config.stepId,
      Type: n.data.pluginMetadata.name,
      ExecutionMode: n.data.pluginMetadata.executionMode,
      Inputs: n.data.config.inputs,
      ...
    })),
    Transitions: edges.map(e => ({
      Source: sourceNode.data.config.stepId,
      Target: targetNode.data.config.stepId,
    }))
  },
  UiJson: { nodes, edges }  // ✅ CRUCIAL!
};
```

---

## 🧪 Kiểm Tra Hệ Thống

### Test 1: Tạo Workflow qua API (Postman)

```bash
POST /workflows/definitions
{
  "Name": "Test Workflow via API",
  "DefinitionJson": {
    "Steps": [
      {
        "Id": "step-1",
        "Type": "TextProcessor",
        "ExecutionMode": "DynamicDll",
        "ExecutionMetadata": { "Sha256": "abc123..." },
        "Inputs": { "text": "Hello" }
      },
      {
        "Id": "step-2",
        "Type": "Logger",
        "ExecutionMode": "BuiltIn",
        "Inputs": {}
      }
    ],
    "Transitions": [
      { "Source": "step-1", "Target": "step-2" }
    ]
  },
  "UiJson": null
}
```

### Test 2: Mở Edit Page

**Kỳ vọng**:
- ✅ Canvas render 2 nodes: [step-1] [step-2] ngang hàng hoặc hierarchical
- ✅ Console: Log "Hydration complete: nodeCount=2, edgeCount=1"
- ✅ Console: Log "Nodes pending plugin detail: [...]"

### Test 3: Double-click Node → Mở Form

**Kỳ vọng**:
- ✅ NodeConfigPanel dialog mở
- ✅ Form inputs có sẵn (không thấy Loader skeleton)
- ✅ Inputs pre-filled từ DefinitionJson.Steps[x].Inputs

### Test 4: Chỉnh Sửa & Save

1. Sửa input text: "Hello" → "Hello World"
2. Nhấn Save button trong form
3. Nhấn **Ctrl+S** hoặc "Save Workflow" topbar

**Kỳ vọng**:
- ✅ Toast: "Lưu thành công"
- ✅ Backend nhận UiJson với nodes/edges position
- ✅ Lần tiếp theo open: layout được restore lại

### Test 5: Browser Console Debug

```javascript
// Check preload status
usePreloadPluginDetails logs:
// "[usePreloadPluginDetails] Loaded details for step-1 (TextProcessor)"
// "[usePreloadPluginDetails] Loaded details for step-2 (Logger)"

// Check hydration
// "[WorkflowEditPage] Hydration complete: nodeCount=2, edgeCount=1"

// Check plugin detail fetch
// "[usePluginDetail] Success: { name: "TextProcessor", mode: "DynamicDll" }"
```

---

## 📂 File Structure

```
src/features/workflow/
├── utils/
│   └── workflowHydration.ts          ✨ NEW: Hydration engine
├── hooks/
│   ├── usePluginDetail.ts            🔄 ENHANCED: Better logging, retry
│   └── usePreloadPluginDetails.ts    ✨ NEW: Preload plugin details
├── components/
│   ├── NodeConfigPanel.tsx           ✓ Unchanged (sử dụng preloaded data)
│   └── WorkflowTopbar.tsx            ✓ Unchanged (save UiJson)
├── WorkflowEditPage.tsx              🔄 UPDATED: Hydration + preload
└── ...
```

---

## 🔧 Configuration

### Auto-Layout Spacing

**Default**:
```typescript
rankSpacingX: 300   // Horizontal gap between columns
rankSpacingY: 180   // Vertical gap between nodes
nodeWidth: 200      // (reserved for future)
nodeHeight: 100     // (reserved for future)
```

**Customize** (in WorkflowEditPage):
```typescript
const result = hydrateWorkflowFromDefinition(
  steps, transitions, categories,
  { rankSpacingX: 400, rankSpacingY: 150 }
);
```

### Preload Retry

**Current**: Auto-retry 2 times with 500ms exponential backoff

**Customize** (in WorkflowCanvas):
```typescript
usePreloadPluginDetails(nodes, {
  autoRetry: false,  // Disable retry
  onProgress: (nodeId, status, error) => {
    if (status === 'error' && error) {
      console.error(`Node ${nodeId}: ${error.message}`);
    }
  }
});
```

---

## ⚠️ Known Limitations & Future Improvements

### Hiện tại
- ✅ Basic hierarchical layout (rank-based)
- ✅ Sequential preload (one-by-one)
- ✅ Single DynamicDll loading (by sha256 or packageId+version)

### Cần cải tiến
1. **Smarter Layout**: Minimize edge crossings (sugiyama algorithm)
2. **Parallel Preload**: Fetch multiple plugin details simultaneously
3. **Fallback Chain**: If sha256 fails → try packageId+version
4. **Caching**: Per-workflow hydration cache (avoid re-compute)
5. **Migration Tool**: Auto-convert old workflows without UiJson

---

## 🐛 Troubleshooting

### Issue: Nodes load nhưng không có edges
**Nguyên nhân**: Transition Source/Target không match node ID

**Fix**: Ensure WorkflowTopbar saves transitions với chính xác:
```typescript
const transitions = edges.map(edge => ({
  Source: nodes.find(n => n.id === edge.source)?.data.config.stepId,
  Target: nodes.find(n => n.id === edge.target)?.data.config.stepId,
}));
```

### Issue: Form loads nhưng không có input fields
**Nguyên nhân**: Plugin detail fetch failed

**Debug**:
1. Open DevTools → Console
2. Look for `[usePluginDetail]` logs
3. Check API response: `GET /api/plugins/details?mode=DynamicDll&sha256=...`
4. Verify backend plugin catalog có plugin này

### Issue: Hydration timed out / slow
**Nguyên nhân**: Plugin detail API slow

**Solution**: Increase timeout in `usePreloadPluginDetails`:
```typescript
// Add timeout wrapper
await Promise.race([
  fetchPluginDetail(...),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 5000)
  )
]);
```

---

## 📞 Support

### Log Points untuk Debug
1. WorkflowEditPage.tsx line ~85: Hydration trigger
2. workflowHydration.ts line ~30: Layout computation
3. usePluginDetail.ts line ~70: Plugin detail fetch enable/disable
4. usePreloadPluginDetails.ts line ~50: Preload progress
5. NodeConfigPanel.tsx line ~300: Form render with data

### Checklist Trước Deploy

- [ ] Hydration works: UiJson null → nodes render ✓
- [ ] Auto-layout sensible: nodes không overlap ✓
- [ ] Plugin preload: Console no errors ✓
- [ ] Form inputs: DynamicDll pre-filled ✓
- [ ] Save workflow: UiJson persist ✓
- [ ] Browser refresh: Data restore ✓
- [ ] Edge cases: Empty workflow, single node, etc. ✓

---

**Last Updated**: 2026-03-30  
**Author**: AI Engineering  
**Status**: Ready for Testing
