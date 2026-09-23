# Frontend Components & Services: Document Bundle

## Cấu trúc Components

### 1. `DocumentListView.tsx`
- Hỗ trợ View List, bổ sung logic nhận biết Bundle (`is_bundle === true`).
- Hiển thị UI đặc biệt cho Bundle: Icon Package, Badge "BUNDLE", màu nền `bg-purple-50/70`, border `border-purple-200`, màu chữ tím.
- Quản lý trạng thái Tree Expand/Collapse qua state (`expandedBundles`, `loadingBundles`, `bundleChildren`) và prop `onToggleBundle` để fetch data con từ API.
- Render đệ quy mảng `childrenList` nếu bundle đang ở trạng thái expanded.

### 2. `DocumentCard.tsx`
- View dạng lưới (Grid), bổ sung badge Bundle.
- Nhận diện `is_bundle` để đổi màu card, sử dụng Package Icon.

### 3. `UploadModal.tsx`
- Chia thành hai Tab: File đơn lẻ (Upload) và Gói tài liệu (Batch).
- Giao diện nhiều bước (Multi-step) để nhập Tên gói, Tags, và kéo thả file. 

### 4. `BundleDetailPage.tsx`
- Một trang quản trị chi tiết dành riêng cho Bundle (hoạt động cho cả Personal space và Group space).
- Bao gồm Header banner hiển thị thông tin metadata tổng quan (Số lượng file, Tổng dung lượng, Ngày tạo, Tags).
- Danh sách file con, sử dụng `ViewToggle` để chuyển đổi Grid / List.
- Dropdown "Thêm tài liệu" để gọi `add-files` (upload mới) hoặc `add-from-personal` (lấy file có sẵn).
- Nút "Sửa tags" mở `EditTagsModal`.
- Context menu riêng cho child: Bổ sung hành động "Tách khỏi gói".

### 5. Modals bổ trợ
- `EditTagsModal.tsx`: Cho phép Bundle thay đổi danh sách Tag, gọi Mutation tự động áp dụng cascade cho tất cả con bên trong.
- `AddToBundleModal.tsx`: Load danh sách tài liệu cá nhân tự do (chưa thuộc bundle) để user chọn đẩy vào Bundle.

## API Services (`documentService.ts`)
Bổ sung các hàm:
- `uploadBatch`: Upload formData mảng files
- `getBundleChildren`: Fetch tài liệu con
- `addFilesToBundle`: Bổ sung file upload vào bundle
- `addFromPersonal`: Bổ sung file có sẵn
- `downloadZip`: Mở thẻ mới với link download endpoint trả về ZIP
- `removeFromBundle`: Detach tài liệu con ra kho cá nhân
