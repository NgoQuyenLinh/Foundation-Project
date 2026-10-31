# Tài liệu Kỹ thuật: API Chức năng Yêu thích (Favorites) & Quản lý Đọc

## 1. Tổng quan
Tài liệu mô tả chi tiết các RESTful API endpoints của hệ thống Yêu thích và Quản lý Đọc cá nhân (Giai đoạn 1).

**Quy tắc chung:**
- Tất cả các endpoint đều yêu cầu xác thực người dùng (Bearer JWT).
- Mọi truy vấn và thay đổi dữ liệu đều gắn chặt với `current_user.id` lấy từ token, không nhận `user_id` từ client.
- Tài nguyên không thuộc quyền sở hữu của user sẽ luôn trả về `404 Not Found` (không trả 403 để bảo mật sự tồn tại của tài nguyên).
- Enum trạng thái đọc: `ReadingStatus = "to_read" | "reading" | "completed"`.

---

## 2. Danh sách Endpoints

### 2.1. Lấy danh sách ID tài liệu đã yêu thích (Mới)
- **Method:** `GET`
- **Path:** `/favorites/ids`
- **Mô tả:** Trả về danh sách các `document_id` hợp lệ (chưa bị xóa, không bị orphan/rác) mà `current_user` đã đánh dấu yêu thích. Dùng để nạp nhanh vào global store của frontend.
- **Response mẫu (`200 OK`):**
```json
[10, 25, 42, 58]
```

---

### 2.2. Thống kê tiến độ đọc
- **Method:** `GET`
- **Path:** `/favorites/stats`
- **Mô tả:** Lấy tổng số lượng và số lượng tài liệu theo từng trạng thái đọc của user hiện tại (đã tự động lọc bỏ tài liệu bị xóa/gỡ).
- **Response mẫu (`200 OK`):**
```json
{
  "total": 12,
  "to_read": 5,
  "reading": 4,
  "completed": 3
}
```

---

### 2.3. Danh sách thẻ cá nhân & Gợi ý (Autocomplete)
- **Method:** `GET`
- **Path:** `/favorites/tags`
- **Query Parameters:**
  - `q` (string, tùy chọn): Từ khóa tìm kiếm gợi ý tag khi người dùng gõ (tự động bỏ `#` và trim).
- **Mô tả:** Trả về danh sách thẻ cá nhân kèm số lượng tài liệu yêu thích đang gắn thẻ đó.
- **Response mẫu (`200 OK`):**
```json
[
  {
    "id": 1,
    "name": "Toán Cao Cấp",
    "color": "#2E7D32",
    "document_count": 6
  },
  {
    "id": 2,
    "name": "Đọc Sau",
    "color": "#1976D2",
    "document_count": 2
  }
]
```

---

### 2.4. Lấy danh sách tài liệu yêu thích (Kế thừa DocumentOut)
- **Method:** `GET`
- **Path:** `/favorites/`
- **Query Parameters:**
  - `page` (int, default: 1): Trang hiện tại.
  - `page_size` (int, default: 20, max: 100): Kích thước trang.
  - `reading_status` (string, tùy chọn): `to_read` | `reading` | `completed`.
  - `tag_ids` (list[int], tùy chọn): Danh sách ID thẻ cần lọc.
  - `tag_mode` (string, default: `any`): `any` (chứa ít nhất 1 thẻ) hoặc `all` (chứa tất cả các thẻ).
  - `sort_by` (string, default: `created_at`): `created_at` | `title`.
  - `sort_order` (string, default: `desc`): `asc` | `desc`.
- **Response mẫu (`200 OK`):**
```json
{
  "items": [
    {
      "id": 10,
      "title": "Giáo trình Giải tích 1",
      "description": "Tài liệu cơ bản",
      "file_type": "application/pdf",
      "file_size": 204800,
      "file_path": "/uploads/gt1.pdf",
      "thumbnail_path": null,
      "owner_id": 1,
      "owner": {
        "id": 1,
        "username": "nguyenvana",
        "full_name": "Nguyễn Văn A",
        "avatar": null
      },
      "is_important": false,
      "is_bundle": false,
      "is_deleted": false,
      "is_orphaned": false,
      "checksum": "abc123hash",
      "content": "Nội dung trích xuất...",
      "metadata": {},
      "created_at": "2026-09-20T10:00:00Z",
      "updated_at": "2026-09-20T10:00:00Z",
      "favorited_at": "2026-10-02T14:30:00Z",
      "reading_status": "reading",
      "notes": "Đang đọc chương 3",
      "favorite_tags": [
        {
          "id": 1,
          "name": "Toán Cao Cấp",
          "color": "#2E7D32"
        }
      ],
      "tags": ["toan", "giao-trinh"]
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

---

### 2.5. Thêm tài liệu vào danh sách yêu thích
- **Method:** `POST`
- **Path:** `/favorites/`
- **Request Body:**
```json
{
  "document_id": 10,
  "reading_status": "to_read",
  "notes": "Cần xem trước kỳ thi",
  "tag_ids": [1, 2]
}
```
- **Quy tắc & Hành vi trùng lặp:**
  - Nếu tài liệu không tồn tại, đã xóa mềm hoặc user không có quyền xem: trả về `404 Not Found`.
  - Nếu tài liệu **đã nằm trong danh sách yêu thích**: trả về `409 Conflict` kèm thông báo `"Tài liệu đã có trong danh sách yêu thích"`.
  - Số lượng thẻ tối đa khi gán ban đầu: 10 thẻ.
- **Response mẫu (`201 Created`):**
```json
{
  "user_id": 1,
  "document_id": 10,
  "created_at": "2026-10-02T14:30:00Z",
  "reading_status": "to_read",
  "notes": "Cần xem trước kỳ thi",
  "favorite_tags": [
    { "id": 1, "name": "Toán Cao Cấp", "color": "#2E7D32" }
  ]
}
```

---

### 2.6. Cập nhật yêu thích (Trạng thái đọc, Ghi chú, Thẻ)
- **Method:** `PATCH`
- **Path:** `/favorites/{document_id}`
- **Request Body:**
```json
{
  "reading_status": "completed",
  "notes": "Đã đọc xong toàn bộ",
  "tag_ids": [1]
}
```
- **Quy tắc:**
  - Hỗ trợ cập nhật từng phần (`exclude_unset`).
  - Gửi `notes: null` để xóa ghi chú; không gửi trường `notes` sẽ giữ nguyên ghi chú cũ.
  - Trả về `404 Not Found` nếu tài liệu chưa được yêu thích bởi user.
- **Response mẫu (`200 OK`):** Thông tin Favorite đã cập nhật.

---

### 2.7. Xóa tài liệu khỏi danh sách yêu thích
- **Method:** `DELETE`
- **Path:** `/favorites/{document_id}`
- **Response:** `204 No Content`
- **Quy tắc:** Tự động cascade xóa các liên kết trong bảng `favorite_tags`. Tài liệu gốc và thẻ trong hệ thống không bị ảnh hưởng.

---

### 2.8. Gắn thẻ vào tài liệu yêu thích
- **Method:** `POST`
- **Path:** `/favorites/{document_id}/tags`
- **Request Body (Một trong hai cách):**
```json
// Cách 1: Gắn theo tag_id đã có
{ "tag_id": 1 }

// Cách 2: Gắn theo tên thẻ (tự động chuẩn hóa, bỏ #, tìm thẻ đã có không phân biệt hoa thường hoặc tạo mới)
{ "name": "#Toán Đại Số" }
```
- **Quy tắc:**
  - Chuẩn hóa tên thẻ: trim khoảng trắng thừa, loại bỏ ký tự `#` ở đầu.
  - So sánh tên thẻ không phân biệt hoa/thường: nếu đã có thẻ cá nhân trùng tên, sử dụng thẻ có `id` nhỏ nhất.
  - Giới hạn tối đa 10 thẻ cho một tài liệu yêu thích (vượt quá trả `400 Bad Request`).
  - Nếu thẻ đã được gắn trước đó: xử lý idempotent (trả về `200 OK`).

---

### 2.9. Gỡ thẻ khỏi tài liệu yêu thích
- **Method:** `DELETE`
- **Path:** `/favorites/{document_id}/tags/{tag_id}`
- **Response:** `204 No Content`
- **Quy tắc:** Chỉ xóa dòng liên kết trong `favorite_tags`, **KHÔNG xóa thẻ** khỏi bảng `tags`.

---

## 3. Hướng dẫn Chạy Kiểm Thử (Testing)

### Lệnh chạy test:
```bash
cd backend
venv\Scripts\pytest tests/test_favorites.py -v
```

### Danh sách các trường hợp kiểm thử (19 tests):
1. `test_add_favorite_success`: Thêm yêu thích thành công (201).
2. `test_add_favorite_duplicate_returns_409`: Báo lỗi 409 khi thêm trùng.
3. `test_add_favorite_nonexistent_document_returns_404`: Báo lỗi 404 khi doc không tồn tại.
4. `test_add_favorite_deleted_document_returns_404`: Báo lỗi 404 khi doc đã xóa mềm.
5. `test_add_favorite_invalid_status_returns_422`: Báo lỗi 422 khi truyền status sai enum.
6. `test_update_favorite_status_and_notes`: Cập nhật trạng thái và ghi chú (200).
7. `test_update_favorite_other_user_returns_404`: User A không sửa được yêu thích của User B (404).
8. `test_delete_favorite_success`: Xóa yêu thích thành công (204).
9. `test_delete_favorite_other_user_returns_404`: User A không xóa được yêu thích của User B (404).
10. `test_get_favorite_stats`: Thống kê đúng số lượng theo từng trạng thái (200).
11. `test_get_favorite_stats_zero_favorites`: Trả về 0 khi user chưa có yêu thích nào (200).
12. `test_get_favorite_tags_with_autocomplete`: Gợi ý thẻ cá nhân theo từ khóa và trả về số lượng tài liệu (200).
13. `test_add_tag_by_name_case_insensitive_and_strip_hash`: Gắn thẻ bằng tên, bỏ ký tự #, không phân biệt hoa thường (200).
14. `test_remove_tag_from_favorite_keeps_original_tag`: Gỡ thẻ khỏi favorite chỉ xóa liên kết, giữ nguyên thẻ gốc (204).
15. `test_list_favorites_with_pagination_and_filters`: Phân trang, lọc theo trạng thái đọc và lọc thẻ (200).
16. `test_list_favorites_user_with_zero_favorites`: Trả về danh sách rỗng an toàn khi chưa có yêu thích (200).
17. `test_get_favorite_ids_success`: Lấy mảng ID tài liệu đã yêu thích (200).
18. `test_get_favorite_ids_zero_favorites`: Lấy mảng ID rỗng khi user chưa yêu thích tài liệu nào (200).
19. `test_favorite_document_out_full_fields`: Đảm bảo FavoriteDocumentOut trả về đầy đủ các trường của DocumentOut (200).

