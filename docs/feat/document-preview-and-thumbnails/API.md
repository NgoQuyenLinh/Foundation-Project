# Đặc Tả API: Preview & Thumbnail Management

Tài liệu chi tiết các endpoint RESTful API được bổ sung và nâng cấp trong hai commits `6d8c155d5605fff5f38e75c231d3e79575eee67f` và `f0898d8a3efd5a5f4d02d845e9c998bc54ddc4ec`.

---

## 1. Danh Sách Endpoints

| STT | Phương thức | Đường dẫn API | Chức năng | Quyền hạn |
| :---: | :---: | :--- | :--- | :--- |
| 1 | `POST` | `/api/v1/documents/{document_id}/thumbnail` | Cập nhật trang bìa cho tài liệu PDF cá nhân | Chủ sở hữu tài liệu |
| 2 | `POST` | `/api/v1/groups/{group_id}/documents/{document_id}/thumbnail` | Cập nhật trang bìa cho tài liệu PDF trong nhóm | Thành viên có quyền chỉnh sửa nhóm |
| 3 | `GET` | `/api/v1/documents/{document_id}/raw` | Tải nội dung thô (raw text) của tài liệu | Đăng nhập & có quyền xem tài liệu |
| 4 | `POST` | `/api/v1/documents/upload` | Upload tài liệu (hỗ trợ `thumbnail_path` & file code) | Người dùng đã xác thực |
| 5 | `POST` | `/api/v1/groups/{group_id}/documents/upload` | Upload tài liệu nhóm (hỗ trợ `thumbnail_path` & file code) | Thành viên nhóm |
| 6 | `PATCH` | `/api/v1/documents/{document_id}` | Cập nhật siêu dữ liệu tài liệu (hỗ trợ `thumbnail_path`) | Chủ sở hữu tài liệu |
| 7 | `PATCH` | `/api/v1/groups/{group_id}/documents/{document_id}` | Cập nhật siêu dữ liệu tài liệu nhóm (hỗ trợ `thumbnail_path`) | Thành viên có quyền chỉnh sửa |

---

## 2. Chi Tiết Từng Endpoint

### 2.1. Cập nhật Trang Bìa PDF Cá Nhân
- **Endpoint:** `POST /api/v1/documents/{document_id}/thumbnail`
- **Content-Type:** `multipart/form-data`
- **Request Headers:**
  - `Authorization: Bearer <access_token>`
- **Form Parameters:**
  - `page_number` (`integer`, required, default: `1`): Số trang PDF được chọn làm ảnh bìa mới.
- **Quy trình xử lý:**
  1. Kiểm tra tài liệu tồn tại và người dùng hiện tại là chủ sở hữu (`document.owner_id == current_user.id`).
  2. Xác thực định dạng tài liệu có chứa MIME/từ khóa `"pdf"`. Nếu không phải PDF -> trả về `400 Bad Request`.
  3. Gọi hàm `create_thumbnail(file_path, file_type, document_id, page_number)` chạy bất đồng bộ trong executor (`loop.run_in_executor`).
  4. Cập nhật `document.thumbnail_path` thành đường dẫn file tĩnh mới: `storage/thumbnails/{doc_id}.jpg`.
  5. Commit database và trả về thông tin `DocumentOut`.
- **Response Success (`200 OK`):**
  ```json
  {
    "id": 105,
    "title": "Giao_trinh_Cau_truc_du_lieu.pdf",
    "thumbnail_path": "storage/thumbnails/105.jpg",
    "file_type": "application/pdf",
    "file_size": 2048500,
    "created_at": "2026-10-10T14:20:00Z",
    "updated_at": "2026-10-10T14:25:30Z"
  }
  ```
- **Response Errors:**
  - `400 Bad Request`: `{"detail": "Tính năng này chỉ hỗ trợ PDF"}`
  - `404 Not Found`: `{"detail": "Không tìm thấy tài liệu"}`
  - `500 Internal Server Error`: `{"detail": "Không thể tạo ảnh bìa cho trang chỉ định"}`

---

### 2.2. Cập nhật Trang Bìa PDF Trong Nhóm
- **Endpoint:** `POST /api/v1/groups/{group_id}/documents/{document_id}/thumbnail`
- **Content-Type:** `multipart/form-data`
- **Request Headers:**
  - `Authorization: Bearer <access_token>`
- **Form Parameters:**
  - `page_number` (`integer`, required, default: `1`): Số trang được chọn làm ảnh bìa.
- **Quy trình xử lý:**
  1. Kiểm tra quyền hạn nhóm thông qua hàm phụ trợ `await require_full_permission(db, group_id, current_user.id)`.
  2. Tìm kiếm tài liệu thuộc nhóm: `workspace_id == group_id` và `id == document_id`.
  3. Kiểm tra điều kiện định dạng PDF.
  4. Gọi executor thực thi `create_thumbnail(...)`.
  5. Cập nhật `document.thumbnail_path` và trả về kết quả `DocumentOut`.

---

### 2.3. Lấy Nội Dung Thô Của File (Get Raw File Content)
- **Endpoint:** `GET /api/v1/documents/{document_id}/raw`
- **Chức năng:** Trả về nguyên bản nội dung chuỗi văn bản (Plain text / Source code) phục vụ việc render cú pháp trên `CodeViewer`.
- **Request Headers:**
  - `Authorization: Bearer <access_token>`
- **Response Success (`200 OK`):**
  - `Content-Type: text/plain; charset=utf-8`
  - Body: Toàn bộ nội dung chuỗi mã nguồn. Ví dụ:
    ```python
    import os
    import sys

    def main():
        print("Hello from Digital Library!")

    if __name__ == "__main__":
        main()
    ```
- **Response Errors:**
  - `404 Not Found`: Không tìm thấy tài liệu hoặc file vật lý không tồn tại trên ổ cứng.

---

### 2.4. Tải Lên Tài Liệu Mở Rộng (Upload Document)
- **Endpoint:** `POST /api/v1/documents/upload`
- **Content-Type:** `multipart/form-data`
- **Form Parameters:**
  - `file`: File nhị phân cần upload (File, bắt buộc).
  - `title`: Tiêu đề hiển thị (String, bắt buộc).
  - `description`: Mô tả (String, tùy chọn).
  - `category_id`: ID danh mục (Integer, tùy chọn).
  - `tag_ids`: Danh sách ID thẻ (List[int], tùy chọn).
  - `thumbnail_path`: Chuỗi Base64 Data URI của trang bìa (String, tùy chọn). Ví dụ: `data:image/webp;base64,UklGRt4AAABXRUJQVlA4...`.
- **Hành vi xử lý đặc biệt:**
  - Nếu file thuộc nhóm `text` (phần mở rộng `.py`, `.sql`, `.html`, `.cpp`, `.json`...):
    - Backend tự động đọc: `content = file.read().decode('utf-8', errors='replace')`.
    - Con trỏ file được reset: `await file.seek(0)`.
    - Lưu trực tiếp vào cột `documents.content` để Trigger FTS đánh chỉ mục tìm kiếm tức thì.
  - Nếu có truyền `thumbnail_path` (được sinh sẵn từ `UploadModal` bằng `docxThumbnail.ts`):
    - Gán thẳng vào `document.thumbnail_path`.
    - Tiến trình nền `_process_document_background` sẽ không ghi đè `None` lên trường này.

---

### 2.5. Cập Nhật Thumbnail Thủ Công Qua API Update
- **Endpoint:** `PATCH /api/v1/documents/{document_id}`
- **Content-Type:** `application/json`
- **Request Body (`DocumentUpdate`):**
  ```json
  {
    "thumbnail_path": "data:image/webp;base64,UklGRvYAAABXRUJQVlA4WAoAAAAQAAAA..."
  }
  ```
- **Sử dụng:** Dùng cho tính năng chọn trang bìa DOCX hoặc người dùng tải lên ảnh bìa tùy chỉnh từ máy tính cho các file PPTX/XLSX/Code.
