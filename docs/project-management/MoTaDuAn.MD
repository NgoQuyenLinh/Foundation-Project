# 📚 Hệ thống Thư viện số - Quản lý Tài liệu Học tập

## 📋 Mô tả tổng quan

Hệ thống thư viện số quản lý tài liệu học tập trên nền tảng **PostgreSQL**, phục vụ 3 nhóm người dùng chính: **Sinh viên**, **Giảng viên**, và **Tài khoản quản trị Khoa/Trường**.

Hệ thống tổ chức tài liệu theo **5 không gian**:

| Không gian | Mô tả |
|------------|-------|
| 👤 **Cá nhân** | Kho lưu trữ riêng tư tuyệt đối |
| 👥 **Nhóm** | Không gian hợp tác linh hoạt |
| 🏫 **Lớp** | Gắn với danh sách lớp thực tế |
| 🏛️ **Khoa** | Tài liệu chung của khoa |
| 🎓 **Trường** | Tài liệu chung toàn trường |

### ✨ Nguyên tắc cốt lõi

> **Tài liệu khi được chia sẻ/lưu về sẽ được nhân bản** — người nhận sở hữu bản sao độc lập, chỉnh sửa không ảnh hưởng bản gốc.

---

## 👥 Vai trò người dùng

| Vai trò | Mô tả |
|---------|-------|
| **Sinh viên** | Tài khoản gắn với MSSV, tự động xác định Lớp/Khoa/Trường qua mã số |
| **Giảng viên** | Tài khoản do trường cấp, có thể phụ trách nhiều Lớp/Nhóm |
| **Chủ nhiệm lớp** | Quyền được admin bổ nhiệm, gắn với 1 Lớp cụ thể |
| **Quản trị Khoa/Trường** | Tài khoản đại diện đơn vị để phát tài liệu |
| **Admin hệ thống** | Quản lý user, bổ nhiệm chủ nhiệm lớp, cấp tài khoản |

---

## 🗂️ Chi tiết các không gian

### 1. Cá nhân (Personal)

- ✅ Kho riêng tư tuyệt đối - chỉ chủ sở hữu truy cập
- ✅ Upload, phân loại theo categories/tags
- ✅ Ghi chú cá nhân trên từng tài liệu
- ✅ Đánh dấu tài liệu quan trọng (favorites)
- ✅ Quản lý phiên bản (document_versions)
- ✅ Tìm kiếm sâu: theo tên, loại file, full-text search
- ✅ Nhận tài liệu từ người khác (tự động nhân bản)
- ✅ Gửi tài liệu cho người khác theo tên/MSSV

### 2. Nhóm (Group)

**Hai mục đích sử dụng chính:**

**a) Lưu trữ thông minh**
- Tạo nhóm để gom tài liệu theo chủ đề/công việc
- Mời người liên quan vào cùng đóng góp

**b) Không gian lớp học nhẹ (LMS-lite)**
- *(Tính năng nộp bài để dành cho giai đoạn sau)*
- Giảng viên tạo mục nộp bài với tiêu đề, mô tả, hạn nộp
- Sinh viên upload bài làm - tự động gắn tên và thời điểm nộp

**Cơ chế phân quyền:**
- Owner chọn quyền mặc định khi tạo nhóm: **"chỉ xem"** hoặc **"toàn quyền"**
- Có thể chỉnh tay quyền riêng cho từng thành viên sau
- Chỉ owner mời thêm/xóa thành viên

### 3. Lớp (Class)

- ✅ Thành viên tự động xác định qua MSSV
- ✅ Chủ nhiệm lớp (do admin bổ nhiệm) toàn quyền
- ✅ Sinh viên xem/tải/lưu bản sao về cá nhân
- ✅ Tự động cập nhật khi có sinh viên mới

### 4. Khoa (Faculty)

- ✅ Tài khoản quản trị Khoa đăng tài liệu chung
- ✅ Thành viên tự động theo mã khoa
- ✅ Sinh viên/giảng viên chỉ xem/tải/lưu về cá nhân
- *(Tạm thời chưa lọc theo ngành/lớp cụ thể)*

### 5. Trường (School)

- ✅ Tài khoản quản trị Trường quản lý
- ✅ Phát tài liệu, thông báo chung toàn trường
- ✅ Mọi người dùng tự động là thành viên (chỉ xem)
- *(Tạm thời chưa lọc theo ngành/lớp cụ thể)*

---

## 🗑️ Cơ chế Thùng rác

- **Soft delete:** đánh dấu `is_deleted = true` + `deleted_at = now()`
- **Tự động xóa vĩnh viễn** sau 30 ngày
- **Khôi phục:** gỡ cờ đánh dấu, tài liệu hiển thị lại nguyên vẹn

### Xóa theo lô kiểu Folder

Khi giải tán Nhóm, toàn bộ tài liệu được gom thành **1 gói xóa**:
- 📦 Nhấn khôi phục trên gói → khôi phục toàn bộ
- 📂 Mở gói → chọn khôi phục từng tài liệu lẻ

---

## ⚙️ Chức năng chung

| Chức năng | Mô tả |
|-----------|-------|
| 🔍 **Tìm kiếm nhanh** | Tìm trên toàn bộ không gian, hỗ trợ tiếng Việt có dấu/không dấu |
| 🔎 **Tìm kiếm nâng cao** | Lọc theo tiêu đề, nội dung, ngày, loại file, tag |
| 📢 **Thông báo** | Nhận thông báo khi có lời mời, tài liệu mới, có người gửi tài liệu |
| 🏷️ **Quản lý Tag** | Tự tạo và gắn tag cho tài liệu trong kho cá nhân |
| 📊 **Thống kê** | Dashboard: tổng số tài liệu, dung lượng, tag, tỷ lệ xử lý |
| ⚙️ **Cài đặt** | Thông tin cá nhân, đổi mật khẩu, tùy chỉnh giao diện |

---

## 📋 Bảng quyền tổng hợp

| Không gian | Toàn quyền (Thêm/Sửa/Xóa) | Chỉ xem/Tải/Lưu |
|------------|---------------------------|-----------------|
| **Cá nhân** | Chính chủ tài khoản | Không ai khác |
| **Nhóm** | Owner + thành viên được cấp "toàn quyền" | Thành viên ở mức "chỉ xem" |
| **Lớp** | Chủ nhiệm lớp | Toàn bộ sinh viên trong lớp |
| **Khoa** | Tài khoản quản trị Khoa | Thành viên có mã khoa khớp |
| **Trường** | Tài khoản quản trị Trường | Toàn bộ người dùng hệ thống |

---

## 🚀 Lộ trình phát triển

### Phase 1 (Hiện tại)
- ✅ Xây dựng mô tả chi tiết hệ thống
- ✅ Thiết kế danh sách bảng CSDL
- ✅ Hoàn thiện kiến trúc cơ bản

### Phase 2 (3 tháng)
- 🏗️ Xây dựng các chức năng cốt lõi của 5 không gian
- 🏗️ Cơ chế nhân bản tài liệu
- 🏗️ Thùng rác và khôi phục
- 🏗️ Tìm kiếm cơ bản và nâng cao
- 🏗️ Hệ thống thông báo
- 📌 *Tính năng nộp bài được chuyển sang giai đoạn sau*

### Phase 3 (Mở rộng)
- 📌 Tính năng nộp bài trong Nhóm (LMS-lite)
- 📌 Gợi ý quyền thông minh theo vai trò
- 📌 Mở rộng lọc theo ngành/lớp cụ thể trong Khoa/Trường

---

## 🛠️ Công nghệ sử dụng

- **Cơ sở dữ liệu:** PostgreSQL
- **Full-text search:** Hỗ trợ tiếng Việt
- **Kiến trúc:** Workspace-based với mô hình dữ liệu thống nhất

---

## 📝 Ghi chú phát triển

- Toàn bộ dữ liệu tài liệu lưu tại DB (không lưu local riêng)
- Xóa = soft delete, có thể khôi phục trong 30 ngày
- Xóa nhóm = gom tài liệu thành gói trong thùng rác
- Mọi quyền có thể điều chỉnh linh hoạt bởi owner/admin

---

## 📧 Liên hệ

Mọi ý kiến đóng góp và thắc mắc xin vui lòng liên hệ qua email hoặc tạo issue trên GitHub.

---

**📌 Lưu ý:** Đây là tài liệu mô tả chi tiết ứng dụng (bản hoàn chỉnh), đã sẵn sàng để chuyển sang bước thiết kế danh sách bảng CSDL chi tiết.




Mô tả chi tiết ứng dụng (Word Online): Có link mẫu https://1drv.ms/w/c/d80506e30d5701be/IQAsNXQjR4guS66kil3T9_m1AY3f42VsDtOaTZg-ci0NzOw?e=fnOh3T - bạn thay bằng link thực tế

Thiết kế Cơ sở dữ liệu: Link tới docs/DB_Elibrary (nhấn vào sẽ truy cập)
Mô tả CSDL  https://1drv.ms/w/c/d80506e30d5701be/IQDa2nuSIXpZTYc5X88FdNBWAVcvKOzbCqEVtWNbUt6iReA?e=3FOChA
sơ đồ
https://dbdocs.io/embed/ca044cf2bda6849beeacae8bf799ccc6/df263e98ce604935aabc3859c46c7bd2

## SỬ DỤNG TÍNH NĂNG TÌM KIẾM MẠNH CỦA POSTGRESQL
-- 1. Bật tính năng Trigram của PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Đánh GIN Index cho các cột thường xuyên tìm kiếm
CREATE INDEX idx_users_username_trgm ON users USING GIN (username gin_trgm_ops);
CREATE INDEX idx_users_email_trgm ON users USING GIN (email gin_trgm_ops);
CREATE INDEX idx_users_student_code_trgm ON users USING GIN (student_code gin_trgm_ops);
CREATE INDEX idx_users_full_name_trgm ON users USING GIN (full_name gin_trgm_ops);