# Quy Tắc Nghiệp Vụ: Preview & Thumbnail Management

Tài liệu quy định các quy tắc nghiệp vụ (Business Rules) áp dụng cho hệ thống xem trước đa định dạng và quản lý ảnh bìa của Digital Library.

---

## 1. Quy Tắc Xác Thực & Phân Loại Định Dạng (File Type Validation)

### 1.1. Ưu Tiên Phân Loại
Khi người dùng tải lên một tệp tin, việc kiểm tra tính hợp lệ được xác định theo thứ tự ưu tiên sau:
1. **Kiểm tra phần mở rộng (File Extension):** Hệ thống ưu tiên đuôi file (chuyển về chữ thường `.toLowerCase()`). Nếu đuôi file thuộc danh sách mở rộng hợp lệ (`ACCEPTED_MIME`), file được chấp nhận ngay cả khi trình duyệt không xác định được MIME type (`file.type === ""`).
2. **Kiểm tra MIME Type chuẩn:** Nếu phần mở rộng không rõ ràng nhưng `file.type` khớp với danh sách MIME được định nghĩa, tệp tin được chấp nhận.
3. **Từ chối hợp lệ:** Chỉ khi cả MIME Type và File Extension đều không nằm trong danh mục hỗ trợ thì hệ thống mới hiển thị thông báo lỗi: `"Tồn tại định dạng file không được hỗ trợ: <tên file>"`.

### 1.2. Giới Hạn Dung Lượng
- Dung lượng tối đa cho mỗi file đơn lẻ là **50MB** (`MAX_MB = 50`).
- Nếu tải nhiều file cùng lúc ở chế độ tải đơn lẻ (Single Upload), toàn bộ các file bắt buộc phải là định dạng hình ảnh (`image/*`) để hệ thống kích hoạt chức năng gộp ảnh thành một tài liệu PDF.

---

## 2. Quy Tắc Tạo & Cập Nhật Ảnh Bìa (Thumbnail Rules)

### 2.1. Quy Tắc Tự Động Gán Ảnh Bìa Khi Upload

| Định dạng file | Hành vi tạo thumbnail ban đầu |
| :--- | :--- |
| **DOCX** | **Client-side tự động:** Frontend render ẩn trang 1 qua `docx-preview` và chụp bằng `html2canvas` thành chuỗi WebP Base64 gửi kèm lúc upload. |
| **PDF** | **Server-side tự động:** Backend chạy tiến trình nền `_process_document_background` sử dụng `pdf2image` trích xuất trang 1 thành file JPG trên server (`storage/thumbnails/{doc_id}.jpg`). |
| **Image** | **Server-side tự động:** Backend thu nhỏ ảnh giữ nguyên tỉ lệ (tối đa 800x800 px) và lưu file JPG. |
| **PPTX / XLSX / Code** | **Mặc định:** Gán `thumbnail_path = null`. Trên giao diện danh sách, hiển thị icon phân loại đặc trưng của định dạng đó. Người dùng có thể chủ động upload ảnh bìa tùy chỉnh sau. |

### 2.2. Quy Tắc Bảo Toàn Ảnh Bìa Trong Tiến Trình Nền (Background Worker Safety)
- Khi tiến trình nền `_process_document_background` hoàn tất quá trình trích xuất text hoặc sinh Markdown, nó **chỉ được phép ghi đè** `doc.thumbnail_path` nếu hàm `create_thumbnail()` trả về một đường dẫn hợp lệ (`thumbnail_path is not None`).
- Nếu `create_thumbnail()` trả về `None` (như trường hợp DOCX), background task tuyệt đối không được gán `None` đè lên chuỗi Base64 đã được client upload trước đó.

### 2.3. Quy Tắc Đổi Trang Bìa (Cover Page Selection)
1. **Đối với DOCX:**
   - Người dùng có thể chọn bất kỳ trang $1 \le P \le \text{TotalPages}$ trong tài liệu Word.
   - Nhấn "Đặt trang $P$ làm ảnh bìa" sẽ kích hoạt chụp màn hình phần tử section tương ứng và lưu chuỗi Base64.
2. **Đối với PDF:**
   - Người dùng nhập số trang $P \ge 1$.
   - Nhấn "Đặt trang $P$ làm ảnh bìa" sẽ gọi API backend. Backend dùng `pdf2image` render chính xác trang $P$.
   - Nếu $P$ vượt quá tổng số trang của file PDF, `pdf2image` ném ngoại lệ và API trả về mã lỗi `500` kèm thông báo phù hợp.
3. **Đối với PPTX, XLSX, Code:**
   - Cho phép người dùng bấm nút "Tải lên ảnh bìa" để chọn một file ảnh (`image/*`) từ máy tính cá nhân.
   - Trình duyệt tự động chuyển file ảnh thành chuỗi Base64 và cập nhật vào tài liệu.

---

## 3. Quy Tắc Ưu Tiên Chế Độ Xem Trước (Preview Mode Priority)

Trong màn hình chi tiết tài liệu `DocumentDetail`, chế độ xem mặc định (`viewMode`: `original` hoặc `markdown`) tuân theo các quy tắc sau:

1. **Ưu tiên tệp mã nguồn (Code Files):**
   - Với các file thuộc nhóm Code (`.py`, `.js`, `.ts`, `.cpp`, `.sql`, `.html`...), hệ thống **luôn luôn hiển thị ở chế độ gốc (Original - CodeViewer)** bất kể người dùng có cài đặt `defaultPreviewMode = "markdown"` trong Settings hay không.
   - Người dùng vẫn có thể chủ động bấm nút chuyển sang tab "Markdown" nếu muốn đọc bản phân tích định dạng markdown.
2. **Ưu tiên tệp Office (PPTX, XLSX):**
   - Nếu có bản xem trước dạng Markdown sinh bởi Firecrawl, hệ thống ưu tiên mở bản Markdown để tối ưu tốc độ đọc nhanh.
   - Người dùng có thể chuyển sang bản gốc để xem trực tiếp qua Microsoft Office Online.
3. **Ưu tiên tệp Hình ảnh:**
   - Luôn hiển thị bản gốc, ẩn hoàn toàn nút chuyển đổi Markdown.

---

## 4. Quy Tắc Phân Quyền Thao Tác (Permissions)

1. **Tài liệu Cá nhân (`/personal/documents`):**
   - Chỉ người dùng sở hữu tài liệu (`owner_id == current_user.id`) mới có quyền:
     - Đổi trang bìa PDF.
     - Chụp lại trang bìa DOCX.
     - Upload ảnh bìa tùy chỉnh.
     - Đổi tên, gắn thẻ tags, xóa tài liệu.
2. **Tài liệu Nhóm (`/groups/{group_id}/documents`):**
   - Việc cập nhật trang bìa (qua API `POST /groups/{group_id}/documents/{document_id}/thumbnail`) hoặc cập nhật Base64 (qua `PATCH /groups/{group_id}/documents/{document_id}`) bắt buộc người dùng phải có quyền chỉnh sửa tài liệu trong nhóm (`require_full_permission`: là Trưởng nhóm hoặc thành viên được cấp quyền quản trị nội dung).
   - Thành viên chỉ có quyền xem (Read-only) sẽ bị ẩn toàn bộ nút chụp trang bìa và nút upload ảnh bìa.
