# Thiết Kế Cơ Sở Dữ Liệu: Preview & Thumbnail Management

Tài liệu chi tiết về các thay đổi trong lược đồ cơ sở dữ liệu (Database Schema), kiểu dữ liệu và cơ chế đánh chỉ mục tìm kiếm toàn văn (Full-Text Search Trigger) được thực hiện trong hai commits `6d8c155d5605fff5f38e75c231d3e79575eee67f` và `f0898d8a3efd5a5f4d02d845e9c998bc54ddc4ec`.

---

## 1. Thay Đổi Cột `thumbnail_path` Trên Bảng `documents`

### 1.1. Bối Cảnh & Vấn Đề
- Ban đầu, cột `thumbnail_path` được định nghĩa là `VARCHAR(1024)` nhằm lưu đường dẫn tương đối tới file ảnh tĩnh được sinh trên ổ cứng máy chủ (ví dụ: `storage/thumbnails/12.jpg`).
- Khi tích hợp tính năng tạo ảnh bìa DOCX từ Client-side bằng `html2canvas` và tính năng người dùng tải lên ảnh bìa tùy chọn (Custom Cover Upload), ảnh thumbnail được mã hóa dưới dạng chuỗi Data URL Base64 (`data:image/webp;base64,...`).
- Chuỗi WebP Base64 có kích thước trung bình từ 25.000 đến 45.000 ký tự (~25KB - 45KB), vượt xa giới hạn 1024 ký tự của `VARCHAR(1024)`. Việc này gây ra lỗi runtime: `value too long for type character varying(1024)`.

### 1.2. Giải Pháp Nâng Cấp Schema
- Kiểu dữ liệu của cột `thumbnail_path` được chuyển sang kiểu **`TEXT`** (không giới hạn độ dài ký tự trong PostgreSQL).
- Trong PostgreSQL, các chuỗi `TEXT` có độ dài lớn tự động được lưu trữ tối ưu theo cơ chế **TOAST** (The Oversized-Attribute Storage Technique). Chỉ những giá trị lớn mới được nén và lưu ngoài trang dữ liệu chính, do đó không làm suy giảm hiệu năng khi thực hiện các truy vấn danh sách `SELECT id, title, file_type FROM documents`.

### 1.3. Ánh Xạ SQLAlchemy ORM (`backend/app/models/document.py`)

```python
class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    
    # NÂNG CẤP TỪ String(1024) -> Text
    thumbnail_path: Mapped[Optional[str]] = mapped_column(Text)
    
    markdown_path: Mapped[Optional[str]] = mapped_column(String(1024))
    file_type: Mapped[Optional[str]] = mapped_column(String(255))
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger)
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text)
    search_vector: Mapped[Optional[str]] = mapped_column(TSVECTOR)
```

---

## 2. Thiết Lập Trigger Full-Text Search (FTS) Cho File Mã Nguồn

### 2.1. Mục Tiêu
Đối với các tài liệu mã nguồn (`.py`, `.sql`, `.html`, `.cpp`, `.ts`...), sinh viên và giảng viên có nhu cầu tìm kiếm tài liệu theo tên hàm, tên lớp, biến số hoặc các đoạn comment giải thích bài tập trong code.

Khi upload file code, backend đọc toàn bộ nội dung mã nguồn và lưu vào cột `documents.content`. Cần một cơ chế cơ sở dữ liệu tự động đồng bộ hóa nội dung này vào chỉ mục tìm kiếm `search_vector` (`tsvector`) mà không cần chạy job thủ công.

### 2.2. Hàm Trigger PL/pgSQL & Trigger Đồng Bộ
Được triển khai trong Alembic Migration `restore_fts_search_vector_trigger.py` và script thực thi trực tiếp `backend/apply_fts.py`:

```sql
-- 1. Tạo hàm cập nhật search_vector với trọng số A (Tiêu đề) và B (Nội dung)
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Xóa trigger cũ nếu tồn tại
DROP TRIGGER IF EXISTS trg_documents_search_vector ON documents;

-- 3. Tạo Trigger kích hoạt trước khi INSERT hoặc UPDATE trên cột title và content
CREATE TRIGGER trg_documents_search_vector
BEFORE INSERT OR UPDATE OF title, content
ON documents
FOR EACH ROW
EXECUTE FUNCTION update_document_search_vector();
```

### 2.3. Cấu Hình Index GIN Tăng Tốc Độ Truy Vấn
Để các câu lệnh tìm kiếm toàn văn bằng toán tử `@@` đạt tốc độ mili-giây, bảng `documents` sử dụng chỉ mục **GIN (Generalized Inverted Index)**:

```sql
CREATE INDEX IF NOT EXISTS idx_documents_search_vector 
ON documents USING GIN(search_vector);
```

### 2.4. So Sánh Hiệu Năng & Trọng Số (Weights)
- Cấu hình ngôn ngữ `'simple'` được chọn thay vì `'english'` hay `'vietnamese'` vì mã nguồn chứa nhiều từ khóa tiếng Anh, ký tự đặc biệt, dấu gạch dưới (`snake_case`) và nối từ (`camelCase`). Cấu hình `'simple'` giữ nguyên dạng từ gốc để tìm kiếm chính xác tên hàm/biến.
- **Trọng số A (Title):** Kết quả khớp trong tiêu đề tài liệu được ưu tiên hiển thị lên đầu danh sách xếp hạng (`ts_rank`).
- **Trọng số B (Content):** Các đoạn mã nguồn tìm thấy bên trong thân file có trọng số bổ trợ, giúp tài liệu xuất hiện khi từ khóa không nằm trong tiêu đề.
