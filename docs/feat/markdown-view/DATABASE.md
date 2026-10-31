# Database Schema: Markdown Integration

- **Bảng ảnh hưởng:** `documents`
- **Cột bổ sung:**
  - `markdown_path` (`VARCHAR(1024)`, Nullable): Lưu đường dẫn tương đối tới file `.md` vật lý được lưu trữ trên server (ví dụ: `storage/markdowns/{id}.md`).
- **Migration:** Sử dụng Alembic hoặc script thực thi bổ sung trực tiếp cột vào bảng `documents` trong PostgreSQL.