# Điều hướng Bundle (Bundle Navigation & Return Mechanism)

Tài liệu mô tả cơ chế điều hướng vào và thoát khỏi trang chi tiết Gói tài liệu (`BundleDetailPage`), đảm bảo người dùng luôn quay về đúng trang xuất phát ban đầu kèm đầy đủ bộ lọc và trạng thái phân trang.

---

## 1. Vấn đề giải quyết

Trước đây, nút **"Quay lại"** trong `BundleDetailPage` chỉ điều hướng cứng về `/personal/documents` (hoặc `/groups/:id?tab=documents`). Khi người dùng đi vào gói tài liệu từ các màn hình khác (như **Yêu thích**, **Đã chia sẻ với tôi**, **Kết quả tìm kiếm**, hay một danh sách tài liệu đang áp dụng bộ lọc), việc bấm quay lại sẽ làm mất ngữ cảnh làm việc trước đó.

---

## 2. Giải pháp & Kiến trúc

Sử dụng tiện ích dùng chung [`src/utils/bundleNavigation.ts`](file:///c:/Users/Admin/Downloads/Foundation-Project/frontend/digital-library/src/utils/bundleNavigation.ts):

### A. Helper `navigateToBundle(navigate, location, targetUrl, options)`
- Lấy đường dẫn đầy đủ của trang hiện tại: `${pathname}${search}${hash}`.
- Lưu trữ đường dẫn này vào:
  1. **Router State (`location.state.from`)**: Phục vụ chuyển trang nhanh trong Single Page App (SPA).
  2. **`sessionStorage` (`bundle_from_<bundleId>`)**: Phục vụ phục hồi đường dẫn khi người dùng bấm **F5 (Reload trang)** trong khi đang ở trang Bundle.
- Thực hiện `navigate(targetUrl, { state: { from: currentFullPath } })`.

### B. Helper `getBundleOriginPath(location, bundleId, fallbackUrl)`
- Được gọi khi người dùng bấm nút **"Quay lại"** hoặc khi Bundle bị xóa trong `BundleDetailPage`.
- Thứ tự ưu tiên xác định URL quay về:
  1. `location.state?.from` (nếu vừa chuyển trang nội bộ SPA).
  2. `sessionStorage.getItem('bundle_from_<bundleId>')` (nếu đã F5).
  3. `fallbackUrl` (mặc định `/personal/documents` hoặc tab documents của nhóm nếu mở link trực tiếp ở tab mới).

---

## 3. Quy tắc điều hướng & Thoát Bundle

| Trường hợp | Hành vi điều hướng |
|---|---|
| **Vào từ Yêu thích (`/personal/favorites?page=2`)** | Thoát bundle $\rightarrow$ Quay lại đúng `/personal/favorites?page=2` (giữ nguyên tab & filter). |
| **Vào từ Tìm kiếm (`/search?q=toan`)** | Thoát bundle $\rightarrow$ Quay lại `/search?q=toan`. |
| **Vào từ Nhóm (`/groups/12?tab=documents`)** | Thoát bundle $\rightarrow$ Quay lại `/groups/12?tab=documents`. |
| **Vào từ Tài liệu cá nhân (`/personal/documents`)** | Thoát bundle $\rightarrow$ Quay lại `/personal/documents`. |
| **Bấm F5 trong Bundle rồi thoát** | Đọc từ `sessionStorage` $\rightarrow$ Quay lại đúng trang xuất phát ban đầu. |
| **Mở link trực tiếp ở Tab mới** | Không có lịch sử $\rightarrow$ Quay về `fallbackUrl` an toàn (`/personal/documents` hoặc `/groups/:id?tab=documents`). |
| **Xem tài liệu con trong Bundle** | Bấm xem file con $\rightarrow$ Vào trang chi tiết file con $\rightarrow$ Bấm quay lại thì vẫn quay về đúng Bundle cha. |

---

## 4. Các điểm vào Bundle đã được tích hợp

1. **`BundleDocumentCard.tsx`**:
   - Bấm vào khung preview bundle.
   - Bấm vào tiêu đề bundle.
   - Bấm menu ngữ cảnh $\rightarrow$ "Mở trong thẻ mới / Xem".
2. **`DocumentListView.tsx`**:
   - Bấm vào hàng bundle trong danh sách.
3. **`BundleExpandedFrame.tsx`**:
   - Nút "Mở trang chi tiết" ở chế độ mở rộng.
4. **`FavoritesPage.tsx`**:
   - `handlePreview`: Kiểm tra nếu `doc.is_bundle === true` thì gọi `navigateToBundle`.
5. **`LocalGroupDocumentCard.tsx` & `GroupDocumentCard.tsx`**:
   - Nhận diện `document.is_bundle` và chuyển vào bundle của nhóm kèm thông tin trang xuất phát.
6. **`SearchPage.tsx`**:
   - Khi bấm vào kết quả tìm kiếm có đường dẫn dạng `/bundle/`.
7. **`DocumentDetail.tsx`**:
   - Tự động chuyển tiếp `Navigate` nếu tài liệu là Bundle, bảo lưu `state.from`.
