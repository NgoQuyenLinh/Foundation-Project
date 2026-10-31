# Kế hoạch Kiểm thử & Kết quả Thực nghiệm — Favourites

Tài liệu ghi nhận toàn bộ quy trình kiểm thử tự động (Unit / Integration Tests) phía Backend và kiểm tra biên dịch / tương thích phía Frontend cho tính năng Yêu thích.

---

## 1. Backend Automation Testing (Pytest)

Toàn bộ 19 kịch bản kiểm thử tự động nằm tại `backend/tests/test_favorites.py`.

### Danh sách 19 Test Cases

| STT | Tên Test Case | Mô tả & Mục tiêu kiểm thử | Trạng thái |
|:---:|---|---|:---:|
| 1 | `test_add_favorite_success` | Thêm tài liệu vào danh sách yêu thích thành công (mặc định `to_read`) | ✅ PASS |
| 2 | `test_add_favorite_conflict` | Báo lỗi 409 khi thêm tài liệu đã có trong danh sách yêu thích | ✅ PASS |
| 3 | `test_add_favorite_with_tags` | Thêm yêu thích kèm danh sách `tag_ids` hợp lệ | ✅ PASS |
| 4 | `test_add_favorite_not_found_document` | Báo lỗi 404 khi thêm tài liệu không tồn tại hoặc của người khác | ✅ PASS |
| 5 | `test_get_favorites_pagination` | Phân trang danh sách yêu thích (`page`, `page_size`, `total_pages`) | ✅ PASS |
| 6 | `test_get_favorites_filter_reading_status` | Lọc danh sách yêu thích theo `reading_status` (`to_read`, `reading`, `completed`) | ✅ PASS |
| 7 | `test_get_favorites_filter_tags_any` | Lọc tài liệu chứa ít nhất một trong các tag đã chọn (`tag_mode="any"`) | ✅ PASS |
| 8 | `test_get_favorites_filter_tags_all` | Lọc tài liệu chứa đồng thời tất cả tag đã chọn (`tag_mode="all"`) | ✅ PASS |
| 9 | `test_get_favorites_sort` | Sắp xếp theo ngày yêu thích (`created_at`) và theo tiêu đề (`title`) | ✅ PASS |
| 10 | `test_update_favorite_status_and_notes` | Cập nhật tiến độ đọc và ghi chú cá nhân thành công | ✅ PASS |
| 11 | `test_update_favorite_notes_clear` | Xóa ghi chú cá nhân khi gửi `notes: null` (hỗ trợ `exclude_unset`) | ✅ PASS |
| 12 | `test_remove_favorite` | Xóa tài liệu khỏi yêu thích và tự động cascade xóa `favorite_tags` | ✅ PASS |
| 13 | `test_add_tag_to_favorite_by_id` | Gắn thẻ có sẵn vào tài liệu yêu thích bằng `tag_id` | ✅ PASS |
| 14 | `test_add_tag_to_favorite_by_name` | Gắn thẻ bằng tên (`name`), tự động tìm hoặc tạo thẻ cá nhân mới | ✅ PASS |
| 15 | `test_remove_tag_from_favorite` | Gỡ thẻ khỏi yêu thích, đảm bảo thẻ gốc trong bảng `tags` không bị xóa | ✅ PASS |
| 16 | `test_get_favorite_stats` | Thống kê chính xác số lượng theo từng trạng thái và tổng số | ✅ PASS |
| 17 | `test_get_favorite_ids_success` | Lấy danh sách ID đã yêu thích còn quyền truy cập của user | ✅ PASS |
| 18 | `test_get_favorite_ids_zero_favorites` | Trả về danh sách rỗng `[]` khi user chưa yêu thích tài liệu nào | ✅ PASS |
| 19 | `test_favorite_document_out_full_fields` | Schema `FavoriteDocumentOut` trả đầy đủ mọi trường như `DocumentOut` | ✅ PASS |

### Cách chạy kiểm thử Backend
```bash
cd backend
venv\Scripts\pytest tests/test_favorites.py -v
```

---

## 2. Frontend Type Checking & Build Test

- **TypeScript compilation check:**
  ```bash
  cmd /c "npm run build" # trong thư mục frontend/digital-library
  ```
  - `tsc -b`: 0 lỗi type mismatch.
  - `vite build`: Biên dịch thành công gói production bundle.

- **Store & State Consistency:**
  - `useFavoriteStore` quản lý `favoriteIds` tập trung, cập nhật lạc quan tức thời.
  - Đồng bộ khi đăng xuất (`clearFavorites`), phục hồi phiên (`loadFavorites`).

---

## 3. Ma trận Quyền hạn & Bảo mật (Security Matrix)

| Kịch bản truy cập | Kết quả mong đợi | Xác thực |
|---|---|:---:|
| User A yêu thích tài liệu cá nhân của User A | 200 / 201 Thành công | ✅ Đạt |
| User A xem/thao tác tài liệu riêng tư của User B | 404 Not Found (Bảo vệ thông tin) | ✅ Đạt |
| User A yêu thích tài liệu do User B chia sẻ trực tiếp | 200 / 201 Thành công | ✅ Đạt |
| User B thu hồi quyền chia sẻ tài liệu | `GET /favorites/ids` tự loại ID này | ✅ Đạt |
| Gắn thẻ trùng tên chữ hoa / chữ thường (`#AI` vs `#ai`) | Gom về cùng 1 thẻ cá nhân (case-insensitive) | ✅ Đạt |
| Gắn quá 10 thẻ cho một tài liệu | 400 Bad Request | ✅ Đạt |
| Nhập ghi chú vượt quá 5000 ký tự | 422 Unprocessable Entity (Pydantic) | ✅ Đạt |
