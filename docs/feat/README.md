# Tài liệu Kỹ thuật: Mục lục Chức năng Nâng cao (Features Index)

Thư mục `docs/feat/` chứa toàn bộ tài liệu kỹ thuật, kiến trúc, đặc tả API, thiết kế cơ sở dữ liệu, hướng dẫn sử dụng và kiểm thử cho các tính năng nâng cao của Thư viện số.

---

## 1. Giai đoạn 1: Quản lý Tài liệu Yêu thích & Tri thức Cá nhân (Favorites PKM)

Chức năng nâng cấp hệ thống Yêu thích thành công cụ quản lý tri thức cá nhân với tiến độ đọc, ghi chú và thẻ phân loại linh hoạt.

| Tài liệu | Mô tả | Liên kết |
| :--- | :--- | :--- |
| **Tổng quan kiến trúc** | Mục tiêu, phạm vi, sơ đồ Mermaid luồng đồng bộ dữ liệu & optimistic update, quy tắc nghiệp vụ | [yeu-thich-tong-quan.md](./yeu-thich-tong-quan.md) |
| **Đặc tả API** | Chi tiết 9 RESTful endpoints (`/favorites/*`, bao gồm `GET /favorites/ids`), request/response mẫu, mã lỗi | [yeu-thich-api.md](./yeu-thich-api.md) |
| **Thiết kế Database** | Schema bảng `favorites`, `favorite_tags`, indexes, CASCADE constraints, migration Alembic | [yeu-thich-database.md](./yeu-thich-database.md) |
| **Hướng dẫn sử dụng** | Hướng dẫn người dùng từng bước: bấm tim, nhận diện tim đỏ/viền hồng, ghi chú, đổi tiến độ, gắn thẻ | [yeu-thich-huong-dan-su-dung.md](./yeu-thich-huong-dan-su-dung.md) |
| **Kế hoạch & Kết quả Kiểm thử** | 19 backend test cases (pytest 100% pass), kiểm tra build TypeScript, checklist kiểm thử thủ công | [yeu-thich-kiem-thu.md](./yeu-thich-kiem-thu.md) |

---

## 2. Các Giai đoạn Tiếp theo (Lộ trình phát triển)

- **Giai đoạn 2 (Collections / Bộ sưu tập):** Sắp xếp tài liệu vào các bộ sưu tập cá nhân và chia sẻ linh hoạt *(Sắp triển khai)*.
- **Giai đoạn 3 (Recommendations / Gợi ý thông minh):** Phương án B - Gợi ý tài liệu tương tự dựa trên Hybrid Metadata + Full-Text Search Rank *(Sắp triển khai)*.
