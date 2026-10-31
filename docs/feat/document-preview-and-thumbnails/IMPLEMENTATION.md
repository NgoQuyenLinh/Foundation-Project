# Hướng Dẫn Triển Khai & Kiểm Thử: Preview & Thumbnail Management

Tài liệu hướng dẫn kỹ thuật viên từng bước triển khai, thiết lập môi trường và quy trình kiểm thử toàn diện tính năng Xem trước đa định dạng và Quản lý ảnh bìa.

---

## 1. Cài Đặt Môi Trường & Thư Viện Phụ Thuộc

### 1.1. Cài Đặt Phía Backend
Đảm bảo môi trường Python đã cài đặt các gói cần thiết:
```bash
cd backend
pip install pdf2image pygments python-docx python-pptx pdfplumber pytesseract
```

> [!IMPORTANT]
> Để `pdf2image` hoạt động, hệ điều hành máy chủ bắt buộc phải có gói công cụ **`poppler`**:
> - Trên **macOS**: `brew install poppler`
> - Trên **Ubuntu/Debian**: `sudo apt-get install -y poppler-utils`
> - Trên **Docker (Dockerfile)**: Bổ sung lệnh `RUN apt-get update && apt-get install -y poppler-utils`

### 1.2. Kích Hoạt Trigger Tìm Kiếm Toàn Văn (PostgreSQL FTS)
Thực thi script khởi tạo Trigger cập nhật `search_vector`:
```bash
cd backend
python apply_fts.py
```
*Kết quả hiển thị mong đợi:* `Applied FTS trigger`

Hoặc chạy lệnh migration Alembic:
```bash
alembic upgrade head
```

### 1.3. Cài Đặt Phía Frontend
Di chuyển vào thư mục frontend và cài đặt các thư viện mới:
```bash
cd frontend/digital-library
npm install html2canvas @cyntler/react-doc-viewer shiki
```

Kiểm tra biên dịch TypeScript để đảm bảo không có lỗi type:
```bash
npm run build
```

---

## 2. Quy Trình Kiểm Thử Chức Năng (Test Cases & Verification)

### Kịch Bản 1: Tự Động Tạo Ảnh Bìa DOCX Khi Upload
1. Truy cập trang **Tài liệu cá nhân** (`/personal/documents`) hoặc **Tài liệu nhóm** (`/groups/:id`).
2. Mở modal tải lên tài liệu (`UploadModal`).
3. Chọn một tệp `.docx` bất kỳ từ máy tính.
4. Mở cửa sổ Developer Tools (F12) -> Tab **Network**:
   - Kiểm tra request gửi đi đến endpoint `/documents/upload`.
   - Trong payload `multipart/form-data`, trường `thumbnail_path` xuất hiện với giá trị bắt đầu bằng `data:image/webp;base64,...`.
5. Đợi upload hoàn tất: Thẻ tài liệu `FileDocumentCard` hiển thị ngay ảnh bìa trang 1 của file Word thay vì icon xám.

---

### Kịch Bản 2: Đổi Trang Bìa DOCX Trong `DocumentDetail`
1. Nhấn vào một tài liệu DOCX để chuyển tới màn hình chi tiết `DocumentDetail`.
2. Kiểm tra giao diện hiển thị tài liệu qua `DocxViewer`.
3. Nhập số trang khác vào ô "Chọn trang bìa" (ví dụ: Trang 2 hoặc Trang 3).
4. Nhấn nút **"Đặt trang X làm ảnh bìa"**:
   - Trạng thái nút chuyển sang spinner `"Đang lưu..."`.
   - Một thông báo toast thành công xuất hiện.
5. Quay lại danh sách tài liệu bên ngoài: Kiểm tra ảnh bìa trên Card đã được cập nhật sang trang vừa chọn.

---

### Kịch Bản 3: Đổi Trang Bìa PDF (Cá Nhân & Nhóm)
1. Mở một tài liệu PDF nhiều trang (ví dụ giáo trình có từ 5 trang trở lên).
2. Tại thanh công cụ của `PdfViewer`, nhập số trang (ví dụ: Trang 4).
3. Nhấn nút **"Đặt trang 4 làm ảnh bìa"**.
4. Kiểm tra tab Network:
   - Endpoint gọi đi: `POST /api/v1/documents/:id/thumbnail` (hoặc `POST /api/v1/groups/:id/documents/:id/thumbnail`).
   - Form Data gửi: `page_number: 4`.
   - Phản hồi HTTP `200 OK` với đường dẫn file `storage/thumbnails/:id.jpg`.
5. Ảnh bìa trên card và trong chi tiết tài liệu tự động cập nhật mượt mà.

---

### Kịch Bản 4: Upload & Xem File Mã Nguồn (Code Preview)
1. Chuẩn bị một file script mã nguồn (ví dụ: `test_script.py` hoặc `index.html`).
2. Tải file lên hệ thống qua `UploadModal`.
3. Kiểm tra danh sách:
   - Tab bộ lọc **"Code mẫu"** hiển thị file vừa upload.
   - Thẻ card hiển thị badge và icon Code màu sắc trực quan.
4. Bấm vào xem chi tiết:
   - Giao diện **mặc định mở tab Bản gốc với `CodeViewer`**.
   - Cú pháp code được highlight chính xác theo ngôn ngữ với theme `github-light`.
   - Thử nghiệm với file `.html` có 1 dòng siêu dài (>500 ký tự): Khung hiển thị không bị tràn vỡ giao diện; thanh cuộn ngang độc lập xuất hiện giúp người dùng cuộn mượt mà.

---

### Kịch Bản 5: Kiểm Tra Tìm Kiếm Toàn Văn Theo Nội Dung Code
1. Trong file code `test_script.py`, khai báo một hàm đặc biệt, ví dụ: `def calculate_fibonacci_matrix():`.
2. Upload file lên hệ thống.
3. Ra thanh tìm kiếm toàn cục của thư viện, gõ từ khóa `fibonacci_matrix`.
4. Tài liệu `test_script.py` xuất hiện trong kết quả tìm kiếm nhờ Trigger PostgreSQL FTS đã tự động chỉ mục nội dung `content`.

---

### Kịch Bản 6: Upload File `.xlsx` & Xem Trước Office Online
1. Chọn một file bảng tính `.xlsx` và tải lên hệ thống.
2. Hệ thống chấp nhận file thành công mà không báo lỗi định dạng không hỗ trợ.
3. Mở xem chi tiết: Màn hình kích hoạt `<DocViewer>` qua Microsoft Office Web Viewer.
4. Bấm nút **"Tải lên ảnh bìa"** -> Chọn một file ảnh chụp bảng tính -> Hệ thống cập nhật ảnh bìa Base64 thành công.

---

## 3. Khắc Phục Sự Cố Thường Gặp (Troubleshooting)

| Hiện tượng | Nguyên nhân khả dĩ | Hướng xử lý |
| :--- | :--- | :--- |
| PDF báo lỗi `500` khi đổi trang bìa | Máy chủ chưa cài đặt `poppler-utils` | Cài đặt `poppler-utils` trên server bằng lệnh `apt-get` hoặc `brew`. |
| DOCX không hiện ảnh bìa sau khi upload | Trình duyệt chặn render offscreen canvas | Kiểm tra console log; đảm bảo trình duyệt hỗ trợ HTML5 Canvas và canvas không dính lỗi CORS font cục bộ. |
| Code viewer báo lỗi không tải được nội dung | Endpoint `/documents/:id/raw` trả về `404` | Kiểm tra file vật lý trên server tại đường dẫn `storage/...`; đảm bảo thư mục storage có quyền đọc (`chmod -R 755 storage`). |
| Microsoft Office Viewer báo màn hình xám | Ứng dụng đang chạy trên `localhost` | Microsoft Office Online yêu cầu URL công khai trên Internet để tải file về render. Khi triển khai lên server có domain public, tính năng này sẽ hoạt động bình thường. Có thể bấm chuyển sang tab **Markdown** để xem trước nội dung ngay lập tức. |
