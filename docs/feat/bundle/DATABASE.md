# Database Design: Document Bundle

## Schema Updates
Cấu trúc cho Bundle được thêm trực tiếp vào bảng `documents` hiện có (tái sử dụng schema).

### Bảng `documents`
Thêm 2 cột mới:
- `is_bundle` (Boolean, default `False`): Đánh dấu document này là một thư mục gói tài liệu.
- `bundle_parent_id` (Integer, Nullable, ForeignKey(`documents.id`)): Trỏ đến ID của bundle cha (nếu tài liệu này thuộc một gói).

### Relationships (ORM)
- **bundle_parent**: `relationship("Document", remote_side=[id], back_populates="bundle_children")`
- **bundle_children**: `relationship("Document", back_populates="bundle_parent", lazy="select", cascade="all, delete-orphan")`

*Lưu ý: Vì `lazy="select"`, khi cần lấy children cùng với dữ liệu phụ (như `tags`), cần query `selectinload` một cách cẩn thận để tránh lỗi `greenlet_spawn` trong SQLAlchemy Async.*

## Computed Properties
Trong schema Pydantic `DocumentOut` (sử dụng ở Backend), bổ sung một computed field:
- `bundle_children_count`: Tổng số lượng tài liệu con bên trong gói (được tính toán khi serialize response).

## Cascade Behaviors
- Khi bundle bị xóa (Soft Delete / Hard Delete), tất cả `bundle_children` không tự động bị xóa trong DB nếu không thiết lập rule, do đó nghiệp vụ Soft Delete phải tự tìm các children và mark `is_deleted = True`.
- Dung lượng `file_size` của bundle là tổng `file_size` của tất cả các tài liệu con bên trong.
