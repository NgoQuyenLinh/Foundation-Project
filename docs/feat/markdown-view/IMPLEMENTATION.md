# Implementation Details

## Backend
1. **`backend/requirements.txt`**: Bổ sung gói thư viện `firecrawl-anydoc`.
2. **`backend/app/schemas/document.py`**: Thêm trường `markdown_path: Optional[str] = None` vào schema `DocumentOut`.
3. **`backend/app/models/document.py`**: Cập nhật ORM model ánh xạ cột `markdown_path`.
4. **`backend/app/services/file_processor.py`**: 
   - Tích hợp hàm `generate_markdown()` gọi `anydoc.to_markdown(file_path)` trong tiến trình nền (Background Tasks).
   - Xử lý bắt lỗi ngoại lệ linh hoạt (`try-except`) để đảm bảo nếu file phức tạp không chuyển đổi được thì hệ thống vẫn lưu file gốc bình thường mà không bị crash.

## Frontend
1. **`frontend/digital-library/package.json`**: Cài đặt các gói `react-markdown`, `remark-gfm`, `@tailwindcss/typography`.
2. **`frontend/digital-library/tailwind.config.ts`**: Tích hợp plugin typography (`require('@tailwindcss/typography')`).
3. **`frontend/digital-library/src/stores/settingsStore.ts`**: Tạo Zustand store quản lý state `defaultPreviewMode` với cơ chế `persist`.
4. **`frontend/digital-library/src/pages/settings/SettingsPage.tsx`**: Bổ sung tuỳ chọn cài đặt chế độ xem mặc định trong tab Preferences.
5. **`frontend/digital-library/src/components/shared/DocumentDetail.tsx`**: 
   - Xây dựng sub-component `MarkdownViewer` sử dụng `ReactMarkdown` kết hợp `remarkGfm` và class `prose`.
   - Bổ sung giao diện Toggle chuyển đổi tab xem (Bản gốc / Markdown) tại `TabDetail`.
   - Nâng cấp nút Tải xuống thành menu lựa chọn tải bản gốc hoặc file `.md`.
6. **`frontend/digital-library/src/components/shared/DocumentContextMenu.tsx`**: Bổ sung mục "Tải xuống Markdown (.md)" trực tiếp vào menu chuột phải của danh sách tài liệu.