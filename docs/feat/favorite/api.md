# API Reference — Favourites

Base URL: `/favorites/`  
Xác thực: `Bearer <token>` (JWT Token trong Header `Authorization`)

> **Lưu ý thứ tự route trong FastAPI:**  
> Các route tĩnh (`/stats`, `/tags`, `/ids`) bắt buộc phải khai báo **trước** route động `/{document_id}` để tránh việc FastAPI hiểu nhầm chuỗi tĩnh là tham số `document_id`.

---

## 1. GET /favorites/stats
Lấy thống kê số lượng tài liệu yêu thích của người dùng hiện tại phân theo trạng thái đọc.

- **Request:** Không body, không query param.
- **Response `200 OK`:**
```json
{
  "total": 12,
  "to_read": 5,
  "reading": 4,
  "completed": 3
}
```

---

## 2. GET /favorites/tags
Lấy danh sách các thẻ cá nhân của người dùng kèm số lượng tài liệu yêu thích đang được gắn từng thẻ đó. Hỗ trợ tìm kiếm gợi ý khi gõ.

- **Query Parameters:**
  - `q` (*string, optional*): Từ khóa tìm kiếm thẻ (không phân biệt hoa/thường).
- **Response `200 OK`:**
```json
[
  {
    "id": 1,
    "name": "khoa-hoc-may-tinh",
    "color": "#3B82F6",
    "document_count": 4
  },
  {
    "id": 2,
    "name": "giao-trinh",
    "color": null,
    "document_count": 2
  }
]
```

---

## 3. GET /favorites/ids
Lấy danh sách mảng ID các tài liệu mà người dùng đã yêu thích **còn hợp lệ** (chưa bị xóa vào thùng rác và người dùng còn quyền truy cập).

> Endpoint này được Frontend sử dụng trong `useFavoriteStore` để khởi tạo trạng thái trái tim tức thì cho toàn bộ các trang khác mà không phải truy vấn danh sách chi tiết.

- **Request:** Không tham số.
- **Response `200 OK`:**
```json
[12, 45, 78, 102]
```

---

## 4. GET /favorites/
Lấy danh sách chi tiết tài liệu yêu thích có hỗ trợ phân trang, lọc theo trạng thái đọc, lọc theo danh sách thẻ và sắp xếp linh hoạt.

- **Query Parameters:**
  - `page` (*int, default 1*): Số trang (≥ 1).
  - `page_size` (*int, default 20*): Số lượng tài liệu mỗi trang (1 – 100).
  - `reading_status` (*Literal['to_read', 'reading', 'completed'], optional*): Lọc theo tiến độ đọc.
  - `tag_ids` (*list[int], optional*): Danh sách ID thẻ (truyền dạng lặp `tag_ids=1&tag_ids=2`).
  - `tag_mode` (*Literal['any', 'all'], default 'any'*): `any` = chứa ít nhất một thẻ; `all` = phải chứa đầy đủ tất cả các thẻ đã chọn.
  - `sort_by` (*Literal['created_at', 'title'], default 'created_at'*): Tiêu chí sắp xếp.
  - `sort_order` (*Literal['asc', 'desc'], default 'desc'*): Thứ tự sắp xếp.

- **Response `200 OK` (`FavoriteListOut`):**
```json
{
  "items": [
    {
      "id": 45,
      "title": "Giao-trinh-Cau-truc-du-lieu.pdf",
      "description": "Tài liệu môn CTDL & GT",
      "file_type": "application/pdf",
      "file_size": 1048576,
      "file_path": "uploads/documents/45.pdf",
      "thumbnail_path": "uploads/thumbnails/45.png",
      "owner_id": 1,
      "owner": {
        "id": 1,
        "username": "admin",
        "full_name": "Quản trị viên",
        "avatar": null
      },
      "is_important": false,
      "is_bundle": false,
      "bundle_children_count": null,
      "is_deleted": false,
      "is_orphaned": false,
      "created_at": "2026-09-10T10:00:00Z",
      "updated_at": "2026-09-12T14:30:00Z",
      "favorited_at": "2026-10-01T08:00:00Z",
      "reading_status": "reading",
      "notes": "Cần đọc kỹ chương 4 về Cây nhị phân",
      "favorite_tags": [
        { "id": 1, "name": "khoa-hoc-may-tinh", "color": "#3B82F6" }
      ],
      "tags": []
    },
    {
      "id": 200,
      "title": "Bao_cao_tien_do_Digital_Library (Gói)",
      "description": null,
      "file_type": null,
      "file_size": null,
      "file_path": "uploads/bundles/200",
      "thumbnail_path": null,
      "owner_id": 1,
      "owner": {
        "id": 1,
        "username": "admin",
        "full_name": "Quản trị viên",
        "avatar": null
      },
      "is_important": false,
      "is_bundle": true,
      "bundle_children_count": 2,
      "is_deleted": false,
      "is_orphaned": false,
      "created_at": "2026-09-15T09:00:00Z",
      "updated_at": null,
      "favorited_at": "2026-10-02T10:00:00Z",
      "reading_status": "to_read",
      "notes": null,
      "favorite_tags": [],
      "tags": []
    }
  ],
  "total": 2,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

> **Trường `bundle_children_count`:**
> - Với tài liệu thường (`is_bundle: false`): luôn là `null`.
> - Với tài liệu dạng gói (`is_bundle: true`): số lượng tài liệu con **hợp lệ** (chưa xóa, chưa vào thùng rác). Cùng quy tắc tính với trang Tài liệu cá nhân.

---

## 5. POST /favorites/
Thêm một tài liệu vào danh sách yêu thích của người dùng.

- **Request Body (`FavoriteCreate`):**
```json
{
  "document_id": 45,
  "reading_status": "to_read",
  "notes": "Tài liệu ôn thi cuối kỳ",
  "tag_ids": [1, 2]
}
```
- **Response `201 Created` (`FavoriteOut`):**
```json
{
  "user_id": 1,
  "document_id": 45,
  "created_at": "2026-10-03T22:45:00Z",
  "reading_status": "to_read",
  "notes": "Tài liệu ôn thi cuối kỳ",
  "tags": [
    { "id": 1, "name": "khoa-hoc-may-tinh", "color": "#3B82F6" },
    { "id": 2, "name": "giao-trinh", "color": null }
  ]
}
```
- **Mã lỗi thường gặp:**
  - `404 Not Found`: Tài liệu không tồn tại hoặc người dùng không có quyền truy cập.
  - `409 Conflict`: Tài liệu đã tồn tại trong danh sách yêu thích.
  - `400 Bad Request`: Gắn vượt quá 10 thẻ.

---

## 6. PATCH /favorites/{document_id}
Cập nhật trạng thái đọc, ghi chú cá nhân hoặc cập nhật lại danh sách thẻ của tài liệu yêu thích.

- **Path Parameter:** `document_id` (*int*) - ID của tài liệu.
- **Request Body (`FavoriteUpdate`):**
```json
{
  "reading_status": "completed",
  "notes": null,
  "tag_ids": [1]
}
```
> **Cơ chế `exclude_unset`:**
> - Nếu trường không xuất hiện trong JSON $\rightarrow$ Giữ nguyên dữ liệu cũ.
> - Nếu gửi `"notes": null` $\rightarrow$ Xóa nội dung ghi chú trong CSDL.

- **Response `200 OK` (`FavoriteOut`):** Dữ liệu bản ghi yêu thích sau khi cập nhật.

---

## 7. DELETE /favorites/{document_id}
Xóa tài liệu khỏi danh sách yêu thích của người dùng.

- **Path Parameter:** `document_id` (*int*).
- **Response `204 No Content`:** Xóa thành công.
- **Cơ chế:** Tự động xóa liên kết trong `favorite_tags` qua `ON DELETE CASCADE`.

---

## 8. POST /favorites/{document_id}/tags
Gắn thêm thẻ vào tài liệu yêu thích. Hỗ trợ gắn bằng `tag_id` có sẵn hoặc truyền `name` để hệ thống tự tìm kiếm/tạo mới thẻ cá nhân.

- **Request Body (`FavoriteTagAdd`):**
```json
{
  "name": "LapTrinhWeb"
}
```
*hoặc:*
```json
{
  "tag_id": 5
}
```
- **Response `200 OK` (`FavoriteOut`):** Bản ghi yêu thích sau khi gắn thẻ kèm danh sách thẻ đầy đủ.

---

## 9. DELETE /favorites/{document_id}/tags/{tag_id}
Gỡ một thẻ khỏi tài liệu yêu thích.

- **Path Parameters:**
  - `document_id` (*int*): ID tài liệu.
  - `tag_id` (*int*): ID thẻ cần gỡ.
- **Response `204 No Content`:** Gỡ thành công.
- **Lưu ý nghiệp vụ:** Chỉ xóa dòng liên kết giữa tài liệu và thẻ trong bảng `favorite_tags`, tuyệt đối không xóa bản ghi thẻ trong bảng `tags`.
