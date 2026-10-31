# Tài liệu Kỹ thuật: Thiết kế Database Chức năng Yêu thích (Favorites)

## 1. Tổng quan
Tài liệu này mô tả chi tiết các thay đổi cấu trúc database phục vụ nâng cấp chức năng Yêu thích (Favorites) thành công cụ quản lý tri thức cá nhân (Giai đoạn 1).

---

## 2. Cấu trúc Bảng và Quan hệ

### 2.1. Bảng `favorites` (Nâng cấp)
Lưu thông tin tài liệu được người dùng đánh dấu yêu thích kèm trạng thái đọc và ghi chú cá nhân.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `user_id` | `INTEGER` | `PRIMARY KEY, NOT NULL, FK users(id) ON DELETE CASCADE` | ID người dùng |
| `document_id` | `INTEGER` | `PRIMARY KEY, NOT NULL, FK documents(id) ON DELETE CASCADE` | ID tài liệu |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL, DEFAULT now()` | Thời điểm đánh dấu yêu thích |
| `reading_status` | `VARCHAR(20)` | `NOT NULL, DEFAULT 'to_read'` | Trạng thái đọc: `to_read`, `reading`, `completed` |
| `notes` | `TEXT` | `NULLABLE` | Ghi chú cá nhân của người dùng cho tài liệu yêu thích |

**Ràng buộc Check Constraint:**
- `chk_favorite_reading_status`: `CHECK (reading_status IN ('to_read', 'reading', 'completed'))`

**Cập nhật Khóa ngoại (CASCADE):**
- Khóa ngoại `favorites_user_id_fkey` và `favorites_document_id_fkey` ban đầu không có `ON DELETE CASCADE`. Trong migration `e4d7b2a9c123`, hai khóa ngoại này đã được cập nhật thành `ON DELETE CASCADE` để khi tài liệu hoặc user bị xóa, các bản ghi yêu thích liên quan sẽ được tự động dọn dẹp sạch sẽ.

**Lưu ý dữ liệu cũ:**
- Khi chạy migration, tất cả bản ghi yêu thích đã tồn tại trước đó sẽ tự động nhận giá trị `reading_status = 'to_read'`.

---

### 2.2. Bảng `favorite_tags` (Tạo mới)
Bảng liên kết Nhiều-Nhiều giữa bản ghi yêu thích của người dùng và Thẻ (`tags`).

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `user_id` | `INTEGER` | `PRIMARY KEY, NOT NULL` | ID người dùng |
| `document_id` | `INTEGER` | `PRIMARY KEY, NOT NULL` | ID tài liệu |
| `tag_id` | `INTEGER` | `PRIMARY KEY, NOT NULL, FK tags(id) ON DELETE CASCADE` | ID thẻ |

**Ràng buộc Khóa ngoại (Foreign Keys):**
- `fk_favorite_tags_favorite`: `FOREIGN KEY (user_id, document_id) REFERENCES favorites(user_id, document_id) ON DELETE CASCADE`
- `fk_favorite_tags_tag_id`: `FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE`
- `pk_favorite_tags`: `PRIMARY KEY (user_id, document_id, tag_id)`

**Chỉ mục (Indexes):**
- `ix_favorite_tags_tag_id`: Chỉ mục B-Tree trên cột `tag_id` giúp tối ưu tốc độ lọc tài liệu yêu thích theo thẻ và thống kê số lượng thẻ.

---

## 3. Hướng dẫn Chạy Migration

File migration: `alembic/versions/e4d7b2a9c123_upgrade_favorites_schema_phase1.py`

### 3.1. Nâng cấp (Upgrade)
```bash
# Từ thư mục gốc dự án
backend\venv\Scripts\alembic upgrade head
```

### 3.2. Hạ cấp (Downgrade)
```bash
# Hạ cấp về revision trước đó
backend\venv\Scripts\alembic downgrade 5cf3f5391595
```
