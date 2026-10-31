# Database Schema — Favourites

Tài liệu thiết kế chi tiết cấu trúc bảng dữ liệu, quan hệ khóa ngoại (Foreign Keys), ràng buộc (Constraints), chỉ mục (Indexes) và cơ chế di chuyển lược đồ (Migrations) cho tính năng Yêu thích.

---

## 1. Lược đồ bảng `favorites`

Bảng lưu trữ mối quan hệ người dùng yêu thích tài liệu cùng các trường thông tin cá nhân hóa (tiến độ đọc, ghi chú).

```sql
CREATE TABLE favorites (
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id     INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    reading_status  VARCHAR NOT NULL DEFAULT 'to_read'
                    CHECK (reading_status IN ('to_read', 'reading', 'completed')),
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, document_id)
);
```

### Chi tiết các trường

| Tên trường | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa & Mô tả |
|---|---|---|---|
| `user_id` | `INTEGER` | PK, FK $\rightarrow$ `users(id)` ON DELETE CASCADE | ID người dùng đánh dấu yêu thích |
| `document_id` | `INTEGER` | PK, FK $\rightarrow$ `documents(id)` ON DELETE CASCADE | ID tài liệu được yêu thích |
| `reading_status` | `VARCHAR` | NOT NULL, DEFAULT `'to_read'`, CHECK in (`to_read`, `reading`, `completed`) | Tiến độ đọc cá nhân của người dùng |
| `notes` | `TEXT` | NULLABLE | Ghi chú cá nhân (tối đa 5000 ký tự ở tầng schema) |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Thời gian đánh dấu yêu thích |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Thời gian cập nhật trạng thái/ghi chú gần nhất |

---

## 2. Lược đồ bảng `favorite_tags`

Bảng liên kết nhiều-nhiều giữa bản ghi yêu thích (`favorites`) và danh mục thẻ cá nhân (`tags`).

```sql
CREATE TABLE favorite_tags (
    user_id     INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, document_id, tag_id),
    CONSTRAINT fk_favorite_tags_favorite 
        FOREIGN KEY (user_id, document_id) 
        REFERENCES favorites(user_id, document_id) 
        ON DELETE CASCADE
);

CREATE INDEX ix_favorite_tags_tag_id ON favorite_tags (tag_id);
```

### Ràng buộc & Tối ưu hóa
- **Khóa chính kết hợp (Composite PK):** `(user_id, document_id, tag_id)` đảm bảo không bị trùng lặp việc gắn cùng một thẻ vào một tài liệu yêu thích.
- **Khóa ngoại kép với Cascade:** `(user_id, document_id)` tham chiếu trực tiếp đến `favorites(user_id, document_id)` với hành vi `ON DELETE CASCADE`. Khi xóa mục yêu thích, toàn bộ thẻ gắn trên mục đó tự động được dọn dẹp.
- **Chỉ mục phụ (Index):** `ix_favorite_tags_tag_id` tối ưu tốc độ cho các truy vấn lọc tài liệu theo thẻ và đếm số lượng tài liệu theo từng thẻ (`GET /favorites/tags`).

---

## 3. Tích hợp bảng `tags`

Tính năng yêu thích tận dụng bảng `tags` dùng chung trong hệ thống với cơ chế phân chia quyền sở hữu qua `owner_id` và `workspace_id`.

```sql
-- Cấu trúc các cột trọng yếu của bảng tags:
CREATE TABLE tags (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(128) NOT NULL,
    color        VARCHAR(32),
    owner_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Cơ chế phân biệt thẻ cá nhân
- Thẻ cá nhân dùng cho mục Yêu thích được định nghĩa bởi điều kiện:  
  $$\text{workspace\_id IS NULL} \quad \text{AND} \quad (\text{owner\_id} = \text{current\_user.id} \ \text{OR} \ \text{owner\_id IS NULL})$$
- Không tạo ràng buộc Unique toàn cục trên `tags.name` nhằm cho phép nhiều người dùng tạo thẻ có cùng tên theo nhu cầu cá nhân.
- Xử lý trùng lặp tên thẻ được quản lý ở tầng logic ứng dụng (so sánh không phân biệt hoa thường, tái sử dụng `id` nhỏ nhất trước khi tạo mới).

---

## 4. Quản lý Migration (Alembic)

| Mã Migration | Nội dung di chuyển |
|---|---|
| `5cf3f5391595_*.py` | Khởi tạo bảng `favorites`, `favorite_tags`, cấu hình khóa ngoại Cascade và Index `ix_favorite_tags_tag_id`. |
| `e4d7b2a9c123_*.py` | Bổ sung cột `owner_id` cho bảng `tags` để hỗ trợ phân quyền thẻ cá nhân. |
