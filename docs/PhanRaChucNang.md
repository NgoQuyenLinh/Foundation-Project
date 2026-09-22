# BÁO CÁO DỰ ÁN
## Hệ thống Quản lý Tài liệu Cá nhân & Nhóm (Personal & Group Document Management)

---

## 1. Thông tin sinh viên

| Mục | Nội dung |
|---|---|
| **Họ và tên** | `[Họ tên sinh viên]` |
| **MSSV** | `[Mã số sinh viên]` |
| **Lớp** | `[Lớp]` |
| **Khoa** | `[Khoa]` |
| **GVHD** | `[Giảng viên hướng dẫn]` |
| **Học kỳ / Năm học** | `[Học kỳ - Năm học]` |
| **Tên đề tài** | Hệ thống Quản lý Tài liệu Cá nhân & Nhóm |
| **Công nghệ chính** | FastAPI + PostgreSQL + React + Vite + TypeScript + TailwindCSS |

---

## 2. Tổng quan kiến trúc
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (React + Vite) │
│ Pages / Components / Services / Stores / Types / Utils │
└──────────────────────────┬──────────────────────────────────┘
│ REST API (JSON + JWT)
┌──────────────────────────▼──────────────────────────────────┐
│ BACKEND (FastAPI + SQLAlchemy) │
│ Routers / Services / Models / Schemas / Background Jobs │
└──────────────────────────┬──────────────────────────────────┘
│ SQL (psycopg2 / asyncpg)
┌──────────────────────────▼──────────────────────────────────┐
│ PostgreSQL (unaccent, pg_trgm, tsvector) │
│ Triggers / GIN Index / JSONB / Soft Delete / M2M │
└─────────────────────────────────────────────────────────────┘

text

---

## 3. Danh sách chức năng đã xây dựng

### 3.1. Backend (FastAPI + PostgreSQL)

#### 3.1.1. Hệ thống xác thực & người dùng
- Đăng ký tài khoản (tự động tạo 4 folder mặc định khi đăng ký)
- Đăng nhập bằng MSSV / email / username + JWT token
- Lấy thông tin user hiện tại (`/auth/me`)
- Cập nhật thông tin cá nhân, đổi mật khẩu
- **Refresh token & auto logout khi hết hạn**
- **Middleware kiểm tra quyền admin cho route quản trị**
- **Validate mật khẩu mạnh (độ dài, ký tự đặc biệt)**
- **Ghi log đăng nhập (thời gian, IP, user-agent)**

#### 3.1.2. Tài liệu cá nhân
- Upload tài liệu (nhiều định dạng: PDF, DOCX, PPTX, ZIP, XLSX, TXT, ảnh…)
- Tính SHA-256 checksum chống upload trùng lặp
- Xem danh sách tài liệu có phân trang và sắp xếp (theo tên, ngày, kích thước)
- Xem chi tiết tài liệu
- Cập nhật metadata (tiêu đề, mô tả, danh mục, JSONB tác giả/số trang/năm)
- Xóa mềm (soft delete) — đưa vào thùng rác
- Khôi phục tài liệu từ thùng rác
- Tự động xóa vĩnh viễn sau 30 ngày
- Full-text search tiếng Việt (PostgreSQL `tsvector` + `unaccent` + `pg_trgm`)
- Trigger tự động cập nhật `search_vector` khi thêm/sửa tài liệu
- GIN index tối ưu tốc độ tìm kiếm
- Quản lý phiên bản tài liệu (`document_versions`)
- Ghi chú cá nhân gắn vào tài liệu (`notes`)
- Đánh dấu yêu thích (`favorites`)
- Nhật ký tải xuống/xem (`download_logs`)
- Xử lý nền (OCR, thumbnail) qua `processing_jobs`
- **Tải xuống tài liệu (stream file, kiểm tra quyền)**
- **Xem trước PDF/ảnh trực tiếp trên trình duyệt**
- **Chia sẻ tài liệu qua link tạm thời (public link có thời hạn)**
- **Thống kê dung lượng đã dùng / hạn mức**

#### 3.1.3. Folder & Tag
- CRUD folder cá nhân (tạo, đổi tên, màu, xóa)
- Folder chứa nhiều tag, tag có thể thuộc nhiều folder (many-to-many qua `folder_tags`)
- Tự động tạo 4 folder mặc định khi đăng ký: Giáo trình, Bài tập, Tài liệu tham khảo, Đồ án tốt nghiệp
- CRUD tag cá nhân (tên, màu, phân cấp `parent_id`)
- Gán/gỡ tag cho tài liệu
- Gán/gỡ tag cho folder
- Hiển thị tài liệu theo folder (lọc qua quan hệ folder → tag → document)
- Thêm thư mục mới với chọn tag có sẵn hoặc tạo tag mới
- **Sắp xếp folder theo tên / ngày tạo / số lượng tài liệu**
- **Di chuyển tài liệu giữa các folder**
- **Kéo thả tài liệu vào folder (frontend + API move)**

#### 3.1.4. Nhóm (Workspace)
- Tạo nhóm, đặt tên, mô tả, chọn quyền mặc định (view/full)
- Danh sách nhóm đang tham gia (kèm role, số thành viên, thời gian cập nhật)
- Xem chi tiết nhóm
- Cập nhật thông tin nhóm (owner)
- Giải tán nhóm với thông báo trước 24h
- Mời thành viên theo MSSV/email/username
- Chấp nhận/từ chối lời mời
- Quản lý danh sách thành viên (xem, đổi quyền, xóa)
- Chuyển quyền owner cho thành viên khác
- Rời nhóm
- Upload tài liệu trực tiếp vào nhóm (yêu cầu quyền full)
- Danh sách tài liệu trong nhóm (có phân trang, lọc theo folder)
- Xóa tài liệu trong nhóm (soft delete, thùng rác riêng của nhóm)
- Khôi phục tài liệu từ thùng rác nhóm
- Chia sẻ tài liệu cá nhân vào nhóm (nhân bản file vật lý)
- Chia sẻ cả folder cá nhân vào nhóm (snapshot tại thời điểm đó)
- Lưu tài liệu nhóm về kho cá nhân (nhân bản, tự tạo tag thiếu)
- Folder trong nhóm (dùng chung bảng `folders` với `workspace_id`)
- Thùng rác riêng của từng nhóm (chỉ owner thấy)
- Phân quyền tầng DB (kiểm tra `workspace_members` mọi endpoint)
- Background job giải tán nhóm sau 24h (APScheduler)
- Background job xóa orphaned documents sau 10 ngày
- Background job xóa thùng rác sau 30 ngày
- **Gửi lời mời hàng loạt (nhiều MSSV cùng lúc)**
- **Hủy lời mời đã gửi (trước khi được chấp nhận)**
- **Xem lịch sử hoạt động nhóm (audit log)**
- **Thông báo real-time khi có thành viên mới / tài liệu mới (polling hoặc SSE)**

#### 3.1.5. Thông báo
- Tạo thông báo khi: được mời vào nhóm, có người chấp nhận lời mời, nhóm sắp giải tán
- **Đánh dấu đã đọc / chưa đọc**
- **Đếm số thông báo chưa đọc (badge trên Header)**
- **Xóa thông báo**
- **Lọc thông báo theo loại (invite / accept / dissolve / system)**

#### 3.1.6. PostgreSQL nâng cao (trọng tâm đề tài)
- Extension `unaccent` + `pg_trgm` cho full-text search tiếng Việt
- `tsvector` / `tsquery` cho tìm kiếm văn bản
- GIN index trên `search_vector`
- Trigger PL/pgSQL tự động cập nhật `search_vector`
- `JSONB` lưu metadata linh hoạt (tác giả, số trang, năm…)
- Soft delete pattern (`is_deleted`, `deleted_at`)
- Self-reference trong `categories`, `tags` (phân cấp cây)
- Many-to-many qua bảng trung gian (`document_tags`, `folder_tags`)
- Phân trang chuẩn (`LIMIT`/`OFFSET`)
- Window function (`COUNT OVER PARTITION BY`) trong list groups
- `selectinload` tối ưu N+1 query
- **Index composite cho truy vấn thường dùng (`user_id + is_deleted`, `workspace_id + is_deleted`)**
- **Partial index cho tài liệu chưa xóa**
- **Materialized view thống kê (tùy chọn)**
- **Row-level security (RLS) ở mức cơ bản cho workspace**

---

### 3.2. Frontend (React + Vite + TypeScript + TailwindCSS)

#### 3.2.1. Hệ thống & Layout
- Cấu trúc thư mục chuẩn (`pages/`, `components/`, `services/`, `types/`, `stores/`, `utils/`)
- Path alias `@/` cho toàn bộ import
- `MainLayout` (Sidebar + Header + Outlet) dùng chung mọi trang
- `AuthLayout` riêng cho trang đăng nhập
- Protected Routes (chặn route khi chưa đăng nhập)
- Role-based route (admin-only routes)
- Khôi phục session khi F5 (gọi `/auth/me` kiểm tra token)
- Spinner "Đang khởi động..." khi đang restore session
- **Dark mode (tùy chọn)**
- **Responsive layout (mobile / tablet / desktop)**
- **Error boundary cho toàn app**
- **404 page & 403 page**

#### 3.2.2. Component dùng chung
- `Button` (variant: primary/outline/ghost/danger, size, icon)
- `Input` (có icon trái, validate, hiển thị lỗi)
- `Badge` (variant: primary/success/default/danger)
- `Avatar` (fallback chữ cái đầu tên)
- `Card` (khung chuẩn)
- `Dropdown` / Context menu (item có icon, hỗ trợ `danger`)
- `Tag` (pill có nút xóa)
- `ProgressBar`
- `EmptyState` (icon + tiêu đề + mô tả + nút CTA)
- `Toast` (success/error/info, tự đóng 3s, zustand store)
- `Sidebar` (NavLink active theo route, badge số thông báo)
- `Header` (search bar, badge phạm vi, chuông thông báo, avatar)
- `FileIcon` (map mime type → icon + màu theo loại file)
- `DocumentRow` (dòng danh sách)
- `DocumentCard` (card lưới)
- `FolderCard`
- `DocumentContextMenu`
- `StatCard`
- `TagDistribution`
- `ProcessingDonut` (recharts)
- `PermissionBadge`
- `ProtectedRoute`
- **`Modal` / `Dialog` dùng chung**
- **`ConfirmDialog` cho hành động nguy hiểm**
- **`Skeleton` loading placeholder**
- **`Pagination` component**
- **`SearchBar` với debounce**
- **`FileUploader` (drag & drop, progress)**
- **`Tooltip`**
- **`Tabs` component**

#### 3.2.3. Trang đã xây dựng
- `LoginPage` (form đăng nhập, validate, toggle mật khẩu, redirect theo role)
- `PersonalDashboard` (4 stat card, tài liệu gần đây, donut chart, phân bổ tag)
- `PersonalDocuments` (folder grid, document grid, filter bar, tabs loại file, phân trang)
- `DocumentDetail` (tabs Chi tiết/Mô tả/Ghi chú/Hoạt động, sidebar thông tin, các action)
- `TrashPage` (phân loại theo nguồn gốc: cá nhân vs từ nhóm giải tán, đếm ngược 30 ngày)
- `SettingsPage` (thông tin cá nhân, đổi mật khẩu)
- `GroupList` (danh sách nhóm, badge role, modal tạo nhóm)
- `GroupSpace` (5 tab: Tài liệu/Thành viên/Yêu cầu/Cài đặt/Thùng rác, phân quyền hiển thị theo role)
- **`RegisterPage` (đăng ký tài khoản)**
- **`SearchPage` (tìm kiếm toàn cục, filter nâng cao)**
- **`FavoritesPage` (tài liệu yêu thích)**
- **`SharedWithMePage` (tài liệu được chia sẻ)**
- **`NotificationsPage` (danh sách thông báo đầy đủ)**
- **`ProfilePage` (xem/sửa thông tin cá nhân)**
- **`AdminDashboard` (nếu có role admin)**
- **`NotFoundPage` (404)**

#### 3.2.4. State & Services
- `authStore` (zustand + persist localStorage: token, user, isAuthenticated)
- `notificationStore` (zustand: danh sách toast)
- `api.ts` (axios instance, interceptor gắn token, auto logout khi 401)
- `authService` (login, getMe, logout)
- `documentService` (getAll, getById, upload, update, delete, phân trang)
- `folderService` (CRUD folder, gán/gỡ tag)
- `tagService` (getAll, create)
- `groupService` (đầy đủ 20+ method cho mọi tính năng nhóm)
- `notificationService`
- **`uploadService` (upload nhiều file, progress, retry)**
- **`searchService` (full-text search, gợi ý)**
- **`favoriteService`**
- **`noteService`**
- **`versionService`**
- **`trashService` (khôi phục, xóa vĩnh viễn)**
- **Custom hooks: `useDebounce`, `usePagination`, `useAuth`, `useToast`**

---

## 4. Danh sách ảnh screenshot (đặt trong `docs/screenshots/`)

| STT | Tên file | Mô tả màn hình |
|---|---|---|
| 1 | `login.png` | Trang đăng nhập |
| 2 | `register.png` | Trang đăng ký tài khoản |
| 3 | `personal-dashboard.png` | Dashboard cá nhân (4 stat card, chart) |
| 4 | `personal-documents.png` | Danh sách tài liệu cá nhân (folder + document grid) |
| 5 | `document-detail.png` | Chi tiết tài liệu (tabs Chi tiết/Mô tả/Ghi chú/Hoạt động) |
| 6 | `document-upload.png` | Modal upload tài liệu (drag & drop, progress) |
| 7 | `folder-create.png` | Modal tạo folder mới (chọn/tạo tag) |
| 8 | `tag-manage.png` | Quản lý tag (CRUD, phân cấp) |
| 9 | `search-result.png` | Kết quả tìm kiếm full-text tiếng Việt |
| 10 | `trash-personal.png` | Thùng rác cá nhân (đếm ngược 30 ngày) |
| 11 | `favorites.png` | Trang tài liệu yêu thích |
| 12 | `group-list.png` | Danh sách nhóm |
| 13 | `group-create.png` | Modal tạo nhóm |
| 14 | `group-space-documents.png` | Không gian nhóm — tab Tài liệu |
| 15 | `group-space-members.png` | Không gian nhóm — tab Thành viên |
| 16 | `group-space-invites.png` | Không gian nhóm — tab Yêu cầu/Lời mời |
| 17 | `group-space-settings.png` | Không gian nhóm — tab Cài đặt |
| 18 | `group-space-trash.png` | Không gian nhóm — tab Thùng rác |
| 19 | `group-invite-modal.png` | Modal mời thành viên (MSSV/email/username) |
| 20 | `group-dissolve-warning.png` | Cảnh báo giải tán nhóm trước 24h |
| 21 | `notifications.png` | Trang/dropdown thông báo |
| 22 | `settings-profile.png` | Cài đặt — thông tin cá nhân |
| 23 | `settings-password.png` | Cài đặt — đổi mật khẩu |
| 24 | `responsive-mobile.png` | Giao diện mobile (responsive) |
| 25 | `database-schema.png` | Sơ đồ ERD / schema PostgreSQL |
| 26 | `postgres-trigger.png` | Trigger + GIN index trong PostgreSQL |
| 27 | `api-docs.png` | Swagger UI / FastAPI docs |
| 28 | `background-jobs.png` | Log background job (APScheduler) |
| 29 | `404-page.png` | Trang 404 |
| 30 | `dark-mode.png` | Giao diện dark mode (nếu có) |

> **Ghi chú:** Đặt tất cả ảnh trong `docs/screenshots/` và tham chiếu trong báo cáo bằng cú pháp:
> ```markdown
> ![Mô tả](./screenshots/login.png)
> ```

---

## 5. Cấu trúc thư mục tài liệu đề xuất
docs/
├── README.md # File này
├── bao-cao.md # Báo cáo chi tiết
├── huong-dan-cai-dat.md # Hướng dẫn cài đặt & chạy
├── api-reference.md # Danh sách API endpoints
├── database-schema.md # Mô tả schema PostgreSQL
├── screenshots/ # Ảnh chụp màn hình
│ ├── login.png
│ ├── personal-dashboard.png
│ └── ...
└── diagrams/ # Sơ đồ ERD, kiến trúc
├── erd.png
└── architecture.png

text

---

## 6. Ghi chú bổ sung

- Các mục **in đậm** là những tính năng mình đề xuất bổ sung — bạn có thể giữ hoặc bỏ tùy theo thực tế dự án.
- Nếu dự án của bạn **chưa có** một số tính năng như `AdminDashboard`, `dark mode`, `public link share`… hãy xóa khỏi danh sách trước khi nộp.
- Phần **thông tin sinh viên** và **danh sách ảnh** cần bạn điền/chụp thực tế.
