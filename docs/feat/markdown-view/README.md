# Tính năng: Markdown View & Export

## 1. Ý tưởng & Động lực (Idea & Motivation)
- **Vấn đề:** Các định dạng tài liệu lưu trữ phổ biến như PDF, DOCX thường nặng, khó đọc trên thiết bị di động (không responsive) và gặp lỗi xuống dòng hoặc dính định dạng khi người dùng muốn sao chép (copy/paste) nội dung, đoạn mã nguồn (code snippet) hoặc công thức.
- **Giải pháp:** Tích hợp công cụ chuyển đổi tài liệu cục bộ (`firecrawl-anydoc`) để tự động sinh ra file văn bản Markdown cấu trúc sạch sẽ ngay khi tải lên, cho phép người dùng linh hoạt chuyển đổi qua lại giữa giao diện xem bản gốc và giao diện xem dạng Markdown. Hỗ trợ tùy chọn tải về file định dạng `.md`.