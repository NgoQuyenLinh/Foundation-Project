# 📚 Tài Liệu Hướng Dẫn Cấu Trúc Dự Án (Project Documentation Guide)

Tài liệu điều hướng nhanh đến các tài liệu kỹ thuật, quản lý và kiến trúc dự án.

---
## 🗂 Cây Thư Mục Tổng Quan

```text
docs/
├── feat/                           # Tài liệu kỹ thuật chi tiết của từng tính năng
│   ├── bundle/                     # Đặc tả kỹ thuật mô-đun Bundle
│   ├── community-library/          # Đặc tả kỹ thuật thư viện cộng đồng
│   ├── document-preview-and-thumbnails/ # Xem trước đa định dạng & Quản lý ảnh bìa
│   └── markdown-view/              # Chế độ xem & xuất văn bản Markdown
├── project-management/             # Quản lý tiến độ, kế hoạch & định hướng dự án
│   ├── Task Assignment/            # Phân rã và phân công công việc
│   ├── backlog.md                  # Ý tưởng mới & tính năng cần cải thiện
│   ├── known-issues.md             # Lỗi đã biết & nợ kỹ thuật (technical debt)
│   ├── roadmap.md                  # Định hướng phát triển & lộ trình giai đoạn tiếp theo
│   ├── MoTaDuAn.MD                 # Mô tả tổng quan về dự án
│   ├── PROJECT_STATUS_REPORT.md    # Báo cáo tình trạng/tiến độ dự án hiện tại
│   └── mau-slide-thuyet-trinh.md   # Khung dàn ý/nội dung slide thuyết trình
├── references/                     # Tài nguyên & dữ liệu tham khảo
│   ├── image/                      # Hình ảnh giao diện mẫu, sơ đồ minh họa
│   └── sql/                        # Script cơ sở dữ liệu mẫu, schema tham khảo
└── system-architecture/            # Kiến trúc hệ thống
    ├── architecture/               # Sơ đồ và tài liệu kiến trúc tổng thể
    └── flow/                       # Lưu đồ nghiệp vụ, sequence diagram, luồng dữ liệu
```
## 🗂 Cây Thư Mục & Liên Kết Nhanh

### 1. 🚀 Đặc Tả Tính Năng (`feat/`)
- **Document Preview & Thumbnails:**
  - [`README.md`](./feat/document-preview-and-thumbnails/README.md) — Tổng quan tính năng xem trước đa định dạng & quản lý ảnh bìa
  - [`API.md`](./feat/document-preview-and-thumbnails/API.md) — Đặc tả API cập nhật trang bìa, raw text và upload
  - [`DATABASE.md`](./feat/document-preview-and-thumbnails/DATABASE.md) — Thiết kế Database, kiểu TEXT và Trigger FTS
  - [`BUSINESS_RULES.md`](./feat/document-preview-and-thumbnails/BUSINESS_RULES.md) — Quy tắc nghiệp vụ, MIME validation & phân quyền
  - [`IMPLEMENTATION.md`](./feat/document-preview-and-thumbnails/IMPLEMENTATION.md) — Hướng dẫn triển khai & các kịch bản kiểm thử
- **Bundle:**
  - [`API.md`](./feat/bundle/API.md) — Đặc tả API
  - [`BUSINESS_RULES.md`](./feat/bundle/BUSINESS_RULES.md) — Quy tắc nghiệp vụ
  - [`DATABASE.md`](./feat/bundle/DATABASE.md) — Lược đồ cơ sở dữ liệu
  - [`FRONTEND.md`](./feat/bundle/FRONTEND.md) — Yêu cầu & luồng xử lý giao diện
  - [`README.md`](./feat/bundle/README.md) — Tổng quan mô-đun Bundle
- **Markdown View & Export:**
  - [`README.md`](./feat/markdown-view/README.md) — Tổng quan tính năng Markdown View
  - [`IMPLEMENTATION.md`](./feat/markdown-view/IMPLEMENTATION.md) — Chi tiết triển khai
  - [`BUSINESS_RULES.md`](./feat/markdown-view/BUSINESS_RULES.md) — Quy tắc nghiệp vụ
  - [`DATABASE.md`](./feat/markdown-view/DATABASE.md) — Lược đồ cơ sở dữ liệu
- **Community Library:**
  - [`spec.md`](./feat/community-library/spec.md) — Đặc tả yêu cầu
  - [`implementation.md`](./feat/community-library/implementation.md) — Hướng dẫn triển khai
  - [`management-extension.md`](./feat/community-library/management-extension.md) — Mở rộng quản lý

---

### 2. 📋 Quản Lý Dự Án (`project-management/`)

#### Phân công & Kế hoạch
- **[Task Assignment/](./project-management/Task%20Assignment/)**
  - [`PhanRaChucNang.md`](./project-management/Task%20Assignment/PhanRaChucNang.md) — Bảng phân rã chức năng
  - [`BoSung-PhanRaChucNang.md`](./project-management/Task%20Assignment/BoSung-PhanRaChucNang.md) — Bổ sung phân rã chức năng
  - [`PhanRaCongViec_ChiTiet.xlsx`](./project-management/Task%20Assignment/PhanRaCongViec_ChiTiet.xlsx) — File phân việc chi tiết
  - [`PhanRaCongViec_TongQuat.xlsx`](./project-management/Task%20Assignment/PhanRaCongViec_TongQuat.xlsx) — File phân việc tổng quát

#### Định hướng, Báo cáo & Theo dõi
- [`roadmap.md`](./project-management/roadmap.md) — Lộ trình phát triển sản phẩm & milestones
- [`backlog.md`](./project-management/backlog.md) — Danh sách ý tưởng & tính năng chờ triển khai
- [`known-issues.md`](./project-management/known-issues.md) — Lỗi đã biết & nợ kỹ thuật (technical debt)
- [`MoTaDuAn.MD`](./project-management/MoTaDuAn.MD) — Tổng quan mục tiêu và phạm vi dự án
- [`PROJECT_STATUS_REPORT.md`](./project-management/PROJECT_STATUS_REPORT.md) — Báo cáo tiến độ dự án
- [`mau-slide-thuyet-trinh.md`](./project-management/mau-slide-thuyet-trinh.md) — Mẫu cấu trúc slide báo cáo / demo

---

### 3. 🎨 Tài Nguyên Tham Khảo (`references/`)
- [`image/`](./references/image/) — Hình ảnh giao diện mẫu, mockup, sơ đồ
- [`sql/`](./references/sql/) — File script SQL, dữ liệu mẫu, schema

---

### 4. 🏛 Kiến Trúc Hệ Thống (`system-architecture/`)
- [`architecture/`](./system-architecture/architecture/) — Sơ đồ & tài liệu kiến trúc tổng thể
- [`flow/`](./system-architecture/flow/) — Lưu đồ luồng dữ liệu, sequence diagram