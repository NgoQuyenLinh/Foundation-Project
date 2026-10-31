# Business Rules: Markdown View

1. **Điều kiện hiển thị nút Markdown:**
   - Chỉ hiển thị nút chuyển đổi sang chế độ Markdown nếu tài liệu đã được xử lý thành công và có tồn tại `markdown_path` trong cơ sở dữ liệu.
   - Đối với định dạng hình ảnh thuần túy (`image/*`), hệ thống tự động ẩn nút Markdown và ép buộc hiển thị ở dạng bản gốc.
2. **Cài đặt cá nhân:**
   - Người dùng có quyền cấu hình chế độ xem mặc định (`defaultPreviewMode`: `original` hoặc `markdown`) thông qua trang Cài đặt hệ thống (Settings). Tuỳ chọn này được lưu trữ bền vững qua `localStorage` (thông qua Zustand store).
3. **Quyền tải xuống:**
   - Hệ thống cung cấp hai tùy chọn tải xuống độc lập: Tải tệp bản gốc hoặc Tải tệp văn bản `.md`.