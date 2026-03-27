# 📘 Tài Liệu Kiến Trúc Custom Nodes (React Flow)

Tài liệu này mô tả chi tiết cách hệ thống Node được thiết kế trên Canvas bằng **React Flow (XYFlow)** và **shadcn/ui**. Nó đóng vai trò như một cẩm nang (Guideline) để bạn có thể mở rộng, custom giao diện hoặc thêm logic mới trong tương lai.

## 1. Cấu Trúc Thư Mục Cốt Lõi 📂

Toàn bộ logic thao tác với Node trên giao diện nằm ở thư mục: `src/features/workflow/components/`

```text
src/features/workflow/
├── nodeDefinitions.ts          # Nơi ĐỊNH NGHĨA dữ liệu tĩnh (metadata: icon, name, category) của toàn bộ các Node.
├── components/
│   ├── nodes/                  # UI Components cho Node
│   │   ├── BaseNode.tsx        # (1) Wrapper bao bọc UI chung (Border, Animation shadow, Error tooltips).
│   │   ├── StartNode.tsx       # (2) UI chuyên biệt cho Trigger / Start Nodes (Chỉ có ngõ ra - Outputs).
│   │   └── ActionNode.tsx      # (3) UI phổ thông cho Logic / API / Actions (Hỗ trợ 4 cổng In/Out đa hướng).
│   └── edges/
│       └── CustomEdge.tsx      # (4) Nét vẽ custom thay thế Edge mặc định (Có mũi tên, màu Primary, nút xóa X).
```

## 2. Luồng Dữ Liệu: "Làm thế nào một Node xuất hiện?" 🔄

Quy trình bạn kéo từ thanh cửa sổ bên phải (Node Library) thả vào Canvas hoạt động như sau:

1. Kéo thẻ từ `NodeLibrarySheet.tsx` (component sử dụng HTML5 `draggable`). Sự kiện `onDragStart` sẽ mang theo dữ liệu `type`, `label`, `category`.
2. Thả chuột ở `WorkflowEditPage.tsx`. Sự kiện `onDrop` kích hoạt, tính toán toạ độ (xy) bằng hàm `screenToFlowPosition` chuẩn của mạng React Flow.
3. Thuật toán sẽ check:
   - Nếu `category === 'trigger'`, Node này gán `<ReactFlow type="startNode" />`.
   - Nếu `category !== 'trigger'`, Node này gán `<ReactFlow type="actionNode" />`.
4. Gọi action `addNode(newNode)` đẩy object vào trong `Zustand store`.
5. Mạng lưới `<ReactFlow nodes={nodes} />` nhận phản ứng data từ store -> Vẽ component `StartNode.tsx` hoặc `ActionNode.tsx` lên bề mặt!

📝 **Bí kíp để sửa:**
Nếu sau này bạn có thêm loại Node thứ 3, ví dụ như **ConditionNode** hình hình thoi (Diamond Shape), bạn sẽ:
- Tạo `app/nodes/ConditionNode.tsx`
- Đăng kí type `conditionNode: ConditionNode` trong biến `nodeTypes` ở file `WorkflowEditPage.tsx`.
- Sửa hàm `onDrop` để chia IF/ELSE gán type đúng cho loại Node này.

## 3. Kiến Trúc Của Một Node Giao Diện 💠

Thay vì code lại bóng đổ hay viền mỗi khi tạo node mới, chúng ta áp dụng pattern **Base Wrapper**. Component `BaseNode.tsx` nhận tham số `data.status` để render hiệu ứng động theo thời gian thực.

### Mô hình State (status):
Zustand quy định một Node có property: `data.status`.
Mặc định sẽ là `'idle'`. Khi chạy (Execute), nó sẽ đổi sang một trong 3 màu tương ứng:
- `'running'`: Màu **Xanh dương (Blue)**. Node nhấp nháy phát sáng (`animate-pulse` & `ring-2`).
- `'success'`: Màu **Xanh lá (Emerald)**. Hiện dấu tick xanh nổi lên ở góc trái.
- `'error'`: Màu **Đỏ (Destructive)**. Rung lắc báo lỗi (CSS Keyframes `animate-shake`).

### Mã Mẫu Một Action Node (`ActionNode.tsx`):
```tsx
<BaseNode id={id} data={data} selected={selected}>
  {/* ĐỈNH NOTE VÀ TRÁI: Dùng làm đường Nhận Input (Target) */}
  <Handle type="target" position={Position.Top} id="top" />
  <Handle type="target" position={Position.Left} id="left" />

  {/* PHẦN LÕI: Render icon, text, trạng thái */}
  <div className="bg-card w-[260px]">
      <h3>{data.label}</h3>
  </div>

  {/* ĐÁY NODE VÀ PHẢI: Dùng làm đường Xuất Output (Source) */}
  <Handle type="source" position={Position.Right} id="right" />
  <Handle type="source" position={Position.Bottom} id="bottom" />
</BaseNode>
```

## 4. Cách Cấu Hình Cổng Kết Nối (`<Handle />`) 🔌

Handles là các chấm nhỏ (dots) để kéo dây mạng. Trong cấu hình hiện tại, chúng ta thiết kế UI thông minh:

*   Các handle được **ẩn đi** (`opacity-0`).
*   Chúng chỉ hiện rõ lên (`opacity-100`) khi bạn **hover** con trỏ chuột vào Component Node.
*   **Target (Nhập):** Bắt buộc phải gắn `type="target"`. Chúng ta gán mặc định Target nằm ở Đỉnh (`Position.Top`) và Trái (`Position.Left`).
*   **Source (Xuất):** Bắt buộc gắn `type="source"`. Nằm ở Mép Dưới (`Position.Bottom`) và Phải (`Position.Right`).

📝 **Lưu ý Cực Kì Quan Trọng:** React Flow tự động theo dõi `id` của Handle. Mọi thao tác kết nối sẽ lưu vào danh sách `edges` của Zustand Store bằng cấu trúc `sourceNode -> sourceHandleID -> targetNode -> targetHandleID`. `id` của Handle ví dụ như `id="left"` **bắt buộc phải unique trong 1 Node**.

## 5. Hướng Dẫn Từng Bước Thêm Mới 1 Node Logic Bất Kỳ 🦸‍♂️

Giả sử bạn muốn thêm tính năng "Tạo file Google Docs" vào Node Library.

1. **Mở file `nodeDefinitions.ts`**.
2. Cuộn tới Array `nodeDefinitions`.
3. Thêm object cấu hình tĩnh:
   ```ts
   {
     type: 'google_docs_create',
     label: 'Create Google Doc',
     description: 'Creates a word document on drive',
     category: 'api',           // Bạn muốn đưa nó vào nhóm nào? api/action/database?
     icon: FileText,            // Lựa chọn Icon của thư viện lucide-react
     color: 'bg-indigo-500',    // Màu đường viền chỉ thị cho nhóm chức năng này
     bgColor: 'bg-indigo-500/10',
   }
   ```
4. Ngay lập tức, node này sẽ xuất hiện ở **thanh cửa sổ Drag & Drop bên phải (Sheet)**. Bạn có thể kéo thả nó vào Canvas thành một `ActionNode`!
5. **Mở file `NodeConfigPanel.tsx`** nếu bạn muốn custom bảng Form (nhập URL, Authorization Token,...) dựa trên Node ID. File Panel sử dụng form React Hook Form + Zod, ở đó chúng ta map giao diện dựa trên tham số `nodeData.type === 'google_docs_create'`.

## 6. Mở Rộng Hệ Thống Test Execution (API Thực Tế) ⚙️

Hiện tại, thao tác *Test Execution* (Click cái "Play Bug" trên Topbar) được thực hiện mock nội bộ bằng vòng lặp **BFS (Breadth-First Search)** quét duyệt sơ đồ dạng lưới. (File `WorkflowTopbar.tsx`).

Khi ráp với Backend (C# / .NET / Golang):
1. Bạn sẽ lấy toàn bộ graph data: `const { nodes, edges } = useWorkflowStore.getState();`.
2. Chuyển Graph đó sang JSON và gửi `POST` tới API Execute của Backend.
3. Backend sẽ trả về SSE (Server Sent Events), Socket.io hoặc API Polling các ID node đã chạy thành công/thất bại.
4. Đẩy ngược event realtime đó vào Frontend Frontend thông qua function:
   `updateNodeData(nodeId, { status: 'success' })` để UI phát sáng xanh theo thời gian thực!
