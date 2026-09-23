# API Endpoints: Document Bundle

## 1. Batch Upload (Tạo Bundle)
`POST /documents/upload-batch`
- **Request**: `multipart/form-data`, nhận danh sách file và danh sách `tag_ids`.
- **Response**: Trả về thông tin Document của Bundle (parent).
- **Logic**: Tạo Bundle cha (lấy tên file đầu tiên hoặc "Untitled Bundle"). Tạo từng Document con cho mỗi file. Gán tags cho Bundle, `db.flush()`, rồi gán cùng tags cho children.

## 2. Lấy danh sách children của một bundle
`GET /documents/{bundle_id}/children`
- **Response**: Array of `DocumentOut`
- **Logic**: Lọc documents có `bundle_parent_id == bundle_id` và `is_deleted == False`.

## 3. Cập nhật Tags (Cascade)
`PATCH /documents/{document_id}/tags`
- **Logic**: Cập nhật tag_ids cho document. Nếu document có `is_bundle == True`, tìm tất cả children thuộc bundle này và cập nhật list tags tương tự để đồng bộ.

## 4. Thêm file mới vào bundle (Upload bổ sung)
`POST /documents/{bundle_id}/add-files`
- **Request**: `multipart/form-data` chứa nhiều `files`.
- **Logic**: 
  - Tạo các Document cho các file.
  - Gán `bundle_parent_id = bundle_id`, đồng thời kế thừa `tags` từ bundle cha.
  - Cộng dồn `file_size` vào bundle cha.

## 5. Gán file cá nhân vào bundle
`POST /documents/{bundle_id}/add-from-personal`
- **Request**: Body JSON chứa `document_ids: list[int]`
- **Logic**: 
  - Đảm bảo các `document_ids` thuộc về current_user và chưa nằm trong bundle nào (`bundle_parent_id is None` và `is_bundle == False`).
  - Cập nhật `bundle_parent_id = bundle_id`, đồng bộ `tags` từ bundle cha sang các child.
  - Cộng dồn `file_size` vào bundle cha.

## 6. Tải về ZIP
`GET /documents/{bundle_id}/download-zip`
- **Response**: `StreamingResponse` (media_type: `application/zip`)
- **Logic**: Dùng `io.BytesIO` và `zipfile` đóng gói tất cả các file (`file_path`) thuộc các children của bundle và trả về client theo thời gian thực (in-memory hoặc streaming data).

## 7. Tách tài liệu khỏi bundle
`POST /documents/{doc_id}/remove-from-bundle`
- **Logic**:
  - Gỡ bỏ `bundle_parent_id` (set về `None`) của child.
  - Trừ `file_size` của child khỏi `file_size` của bundle cha.
  - File vẫn tiếp tục nằm trong kho cá nhân của user.
