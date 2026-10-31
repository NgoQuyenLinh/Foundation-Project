# Kế Hoạch & Báo Cáo Kiểm Thử: Chức Năng Yêu Thích (Favorites)

## 1. Kiểm Thử Tự Động Backend (Pytest)

### 1.1. Cách chạy test
```bash
cd backend
venv\Scripts\pytest tests/test_favorites.py -v
```

### 1.2. Kết quả kiểm thử tự động
- **Tổng số test cases:** 19/19 PASSED (100%)
- **Thời gian chạy:** ~0.3 giây

| STT | Tên Test Case | Mục đích / Trường hợp kiểm tra | Kết quả |
| :--- | :--- | :--- | :--- |
| 1 | `test_add_favorite_success` | Thêm tài liệu vào yêu thích thành công, mặc định `to_read` | PASSED |
| 2 | `test_add_favorite_duplicate_returns_409` | Thêm trùng tài liệu đã yêu thích trả về 409 Conflict | PASSED |
| 3 | `test_add_favorite_nonexistent_document_returns_404` | Thêm tài liệu không tồn tại trả về 404 | PASSED |
| 4 | `test_add_favorite_deleted_document_returns_404` | Thêm tài liệu đã xóa mềm/rác trả về 404 | PASSED |
| 5 | `test_add_favorite_invalid_status_returns_422` | Trạng thái đọc không hợp lệ (sai enum) trả về 422 | PASSED |
| 6 | `test_update_favorite_status_and_notes` | Cập nhật tiến độ đọc và ghi chú (hỗ trợ exclude_unset) | PASSED |
| 7 | `test_update_favorite_other_user_returns_404` | User A không thể sửa yêu thích của User B | PASSED |
| 8 | `test_delete_favorite_success` | Xóa tài liệu khỏi yêu thích trả về 204 No Content | PASSED |
| 9 | `test_delete_favorite_other_user_returns_404` | User A không thể xóa yêu thích của User B | PASSED |
| 10 | `test_get_favorite_stats` | Thống kê chính xác tổng số và số lượng theo từng trạng thái | PASSED |
| 11 | `test_get_favorite_stats_zero_favorites` | Thống kê trả về 0 an toàn khi user chưa có yêu thích | PASSED |
| 12 | `test_get_favorite_tags_with_autocomplete` | Lấy danh sách thẻ kèm số lượng doc và tìm kiếm gợi ý tag | PASSED |
| 13 | `test_add_tag_by_name_case_insensitive_and_strip_hash` | Gắn thẻ theo tên, bỏ dấu `#`, so sánh không phân biệt hoa thường | PASSED |
| 14 | `test_remove_tag_from_favorite_keeps_original_tag` | Gỡ thẻ chỉ xóa liên kết trong `favorite_tags`, giữ nguyên thẻ gốc | PASSED |
| 15 | `test_list_favorites_with_pagination_and_filters` | Phân trang, sắp xếp và lọc theo trạng thái / tag (any/all) | PASSED |
| 16 | `test_list_favorites_user_with_zero_favorites` | Trả về mảng rỗng an toàn khi chưa có tài liệu yêu thích | PASSED |
| 17 | `test_get_favorite_ids_success` | Endpoint `GET /favorites/ids` trả về đúng danh sách ID | PASSED |
| 18 | `test_get_favorite_ids_zero_favorites` | `GET /favorites/ids` trả về `[]` khi user chưa có yêu thích | PASSED |
| 19 | `test_favorite_document_out_full_fields` | Schema `FavoriteDocumentOut` kế thừa đầy đủ các trường của `DocumentOut` | PASSED |

---

## 2. Kiểm Tra Biên Dịch Frontend (TypeScript & Build)

### 2.1. Lệnh kiểm tra
```bash
cd frontend/digital-library
npm run build   # Chạy tsc -b && vite build
```

### 2.2. Kết quả kiểm tra
- **TypeScript Compiler (`tsc`):** 0 errors.
- **Vite Production Build:** Thành công, tạo bundle tối ưu trong thư mục `dist/`.

---

## 3. Checklist Kiểm Thử Thủ Công (Manual Testing Checklist)

| STT | Kịch bản kiểm thử | Kỳ vọng | Trạng thái |
| :--- | :--- | :--- | :--- |
| 1 | **Đánh dấu Yêu thích từ trang Tài liệu** | Bấm tim trên card tài liệu -> tim chuyển sang đỏ đặc, viền card đổi sang hồng/đỏ nhạt ngay lập tức (optimistic). | **Đã kiểm tra qua Store & Component Code** |
| 2 | **Menu ngữ cảnh (Chuột phải / 3 chấm)** | Mở menu trên tài liệu đã yêu thích -> mục hiển thị "Bỏ yêu thích" kèm tim đỏ; tài liệu chưa yêu thích -> "Thêm vào Yêu thích". Bấm vào đổi trạng thái tức thì. | **Đã kiểm tra qua Store & Component Code** |
| 3 | **Đồng bộ giữa trang Tài liệu và Yêu thích** | Thêm yêu thích ở trang Tài liệu -> chuyển sang trang Yêu thích thấy xuất hiện ngay tài liệu đó với đầy đủ thông tin tệp tin (tên, dung lượng, ngày, thumbnail, chủ sở hữu). | **Cần người dùng tự trải nghiệm trên trình duyệt** |
| 4 | **Bỏ yêu thích trên trang Yêu thích** | Bấm tim đỏ trên trang Yêu thích -> tài liệu biến mất khỏi danh sách, số liệu thống kê giảm, quay lại trang Tài liệu thấy tim hết đỏ và mất viền hồng. | **Cần người dùng tự trải nghiệm trên trình duyệt** |
| 5 | **Đổi trạng thái đọc & Ghi chú** | Đổi dropdown "Tiến độ đọc" (Đọc sau -> Đang đọc -> Đã đọc), thêm/sửa ghi chú 5000 ký tự -> dữ liệu lưu chính xác và hiển thị đầy đủ. | **Cần người dùng tự trải nghiệm trên trình duyệt** |
| 6 | **Gắn / Gỡ thẻ yêu thích** | Mở modal gắn thẻ, gõ tên có dấu `#` hoặc chọn thẻ gợi ý -> gắn thành công. Nhấn `×` gỡ thẻ -> thẻ biến mất khỏi card nhưng vẫn còn trong danh sách gợi ý. | **Cần người dùng tự trải nghiệm trên trình duyệt** |
| 7 | **F5 / Tải lại trang** | Tải lại trang (F5) -> ứng dụng tự gọi `/favorites/ids` khôi phục đầy đủ trạng thái tim đỏ và viền nhận diện. | **Đã kiểm tra qua `useRestoreSession`** |
| 8 | **Đăng xuất và đổi tài khoản** | Đăng xuất -> store xóa sạch `favoriteIds`. Đăng nhập tài khoản B -> chỉ thấy danh sách yêu thích riêng của tài khoản B. | **Đã kiểm tra qua `authStore.logout`** |
| 9 | **Chuyển đổi Grid / List View** | Chuyển qua lại giữa dạng Lưới và Danh sách trên trang Yêu thích -> hiển thị mượt mà, đầy đủ các thao tác. | **Đã kiểm tra qua `FavoritesPage`** |
