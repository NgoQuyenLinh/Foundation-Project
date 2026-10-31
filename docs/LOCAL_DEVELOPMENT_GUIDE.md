# HƯỚNG DẪN CHUYỂN ĐỔI VÀ VẬN HÀNH DỰ ÁN Ở CHẾ ĐỘ LOCAL (OFFLINE DEVELOPMENT GUIDE)

> **Mục đích tài liệu:**
> Tài liệu này dành cho thành viên nhóm phát triển, giảng viên chấm đồ án, hoặc bất kỳ ai khi clone repository này về máy tính cá nhân có thể nhanh chóng thiết lập, chuyển đổi toàn bộ hệ thống từ môi trường Cloud (Cloudflare R2, Neon DB) về **Môi trường Cục bộ hoàn toàn (100% Localhost / Offline)** để kiểm thử, phát triển và chấm bài một cách thuận tiện, không phụ thuộc vào kết nối mạng bên ngoài hay tài khoản đám mây.

---

## 1. TỔNG QUAN VỀ HAI NHÁNH PHÁT TRIỂN & CHẾ ĐỘ LƯU TRỮ

Hệ thống Digital Library được quản lý với 2 chiến lược vận hành song song trên Git:

```
+--------------------------------------------------------------------------------------------------+
|                                  SO SÁNH HAI MÔ HÌNH VẬN HÀNH                                    |
|                                                                                                  |
| [ NHÁNH PRODUCTION (branch: produc) ]            [ NHÁNH LOCAL DEVELOPMENT (branch: main) ]     |
|                                                                                                  |
| 1. Lưu trữ File: Cloudflare R2 Object Storage     1. Lưu trữ File: Local Filesystem              |
|    - Dùng giao thức S3 (boto3)                    - Lưu trực tiếp vào thư mục backend/storage/   |
|    - Cần API Key, Secret, Endpoint R2             - Không cần tài khoản cloud hay API key        |
|    - Phân phối file qua CDN R2.dev                - Phục vụ tĩnh qua FastAPI StaticFiles mount   |
|                                                                                                  |
| 2. Cơ sở dữ liệu: Neon PostgreSQL Cloud           2. Cơ sở dữ liệu: Local PostgreSQL Server      |
|    - Kết nối qua Internet (SSL mode)              - Chạy qua Docker hoặc Postgres cài trên máy   |
|                                                                                                  |
| 3. Môi trường Frontend:                          3. Môi trường Frontend:                         |
|    - VITE_API_URL trỏ vào Cloud Backend          - VITE_API_URL = http://localhost:8000         |
|    - VITE_R2_PUBLIC_URL trỏ CDN R2                - Tải file thẳng: http://localhost:8000/storage|
|                                                                                                  |
| 4. Mục đích: Triển khai thực tế cho người dùng    4. Mục đích: Test, debug, bảo vệ đồ án offline|
+--------------------------------------------------------------------------------------------------+
```

| Tiêu chí | Chế độ Cloud Production (`produc`) | Chế độ Local Development (`main`) |
| :--- | :--- | :--- |
| **Nhánh Git khuyến nghị** | `produc` | **`main`** |
| **Nơi lưu trữ file vật lý** | Cloudflare R2 Bucket (`elibrary-bucket`) | Thư mục cục bộ `storage/` trên đĩa cứng |
| **Yêu cầu Internet** | Bắt buộc (gọi S3 API & CDN) | **Không cần** (Hoàn toàn Offline) |
| **Độ trễ tải tài liệu** | 50ms - 200ms (qua mạng) | < 5ms (Đọc trực tiếp từ NVMe/SSD cục bộ) |
| **Cơ sở dữ liệu** | Neon DB / Supabase (Cloud PostgreSQL) | PostgreSQL Local (`localhost:5432`) |
| **Chi phí hạ tầng** | Cần tài khoản Cloudflare, Cloud DB | **0 VNĐ**, chạy độc lập trên mọi máy tính |

---

## 2. YÊU CẦU TIÊN QUYẾT (PREREQUISITES)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt:
1. **Python**: Phiên bản **3.11** trở lên (`python3 --version`).
2. **Node.js**: Phiên bản **18** hoặc **20 LTS** (`node --version`) kèm `npm`.
3. **PostgreSQL**: Phiên bản 14, 15 hoặc 16 (Khuyến nghị dùng **Docker** để không cần cài đặt rườm rà).
4. **Git**: Đã cài đặt trên máy.

*(Tùy chọn cho tính năng trích xuất)*:
- **Tesseract OCR**: Để nhận diện chữ tiếng Việt (`brew install tesseract tesseract-lang` trên macOS hoặc `apt install tesseract-ocr tesseract-ocr-vie` trên Ubuntu).
- **Poppler**: Để sinh ảnh bìa PDF trang đầu (`brew install poppler` trên macOS hoặc `apt install poppler-utils` trên Ubuntu).

---

## 3. HƯỚNG DẪN 6 BƯỚC THIẾT LẬP LOCAL HOÀN TOÀN

### BƯỚC 1: Clone dự án và chuyển sang nhánh `main`

Mở Terminal và thực thi:
```bash
# Clone repository (nếu chưa clone)
git clone <URL_REPO_CUA_BAN> Foundation-Project
cd Foundation-Project

# Chuyển sang nhánh main (nhánh đã tối ưu sẵn cho Local Filesystem)
git checkout main
```

---

### BƯỚC 2: Khởi tạo Cơ sở dữ liệu PostgreSQL Local

Bạn có thể lựa chọn 1 trong 2 cách sau:

#### Cách A: Dùng Docker (Nhanh nhất - Khuyến nghị)
Chạy một container PostgreSQL trong 5 giây:
```bash
docker run --name pg-digital-library \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=digital_library \
  -p 5432:5432 \
  -d postgres:15
```

#### Cách B: Dùng PostgreSQL cài sẵn trên máy (Postgres.app / Homebrew)
Mở PostgreSQL CLI (`psql`) và tạo database mới:
```sql
CREATE DATABASE digital_library;
```

#### Nạp Cấu trúc Bảng (Schema):
Chạy Alembic migration để tự động sinh toàn bộ bảng:
```bash
# Đứng tại thư mục gốc của project
.venv/bin/alembic upgrade head
```
*(Hoặc có thể import file SQL mẫu có sẵn tại `docs/references/sql/schemaForUserOffline.sql` nếu không dùng Alembic)*.

---

### BƯỚC 3: Cấu hình Biến Môi trường Backend (`.env` tại thư mục gốc)

Tạo hoặc chỉnh sửa file `.env` tại thư mục gốc `/Foundation-Project/.env`:

```env
# ========================================================
# CẤU HÌNH CƠ SỞ DỮ LIỆU CỤC BỘ (POSTGRESQL LOCAL)
# ========================================================
# Cú pháp: postgresql+asyncpg://<username>:<password>@localhost:5432/<database_name>
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/digital_library

# ========================================================
# BẢO MẬT JWT AUTH
# ========================================================
SECRET_KEY=digital_library_super_secret_local_key_2026

# ========================================================
# LƯU Ý QUAN TRỌNG KHI CHẠY LOCAL:
# BỎ QUA HOẶC XÓA TẤT CẢ CÁC DÒNG CẤU HÌNH R2/S3 DƯỚI ĐÂY:
# MINIO_ENDPOINT=...
# MINIO_ACCESS_KEY=...
# MINIO_SECRET_KEY=...
# MINIO_PUBLIC_URL=...
# BUCKET_NAME=...
# ========================================================
```

> [!NOTE]
> Khi chạy trên nhánh `main`, hệ thống tự động nhận biết chế độ lưu trữ cục bộ (Local Filesystem), tự tạo file trong thư mục `storage/` mà không đòi hỏi bất kỳ thông số kết nối Cloudflare R2 nào.

---

### BƯỚC 4: Cài đặt Dependencies và Khởi chạy Backend FastAPI

1. **Tạo môi trường ảo Python (Virtual Environment)**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Cài đặt các gói thư viện**:
   ```bash
   pip install --upgrade pip
   pip install -r backend/requirements.txt
   ```

3. **Khởi tạo các thư mục lưu trữ cục bộ**:
   Đảm bảo cấu trúc cây thư mục `storage` tồn tại:
   ```bash
   mkdir -p storage/thumbnails storage/personal storage/groups storage/orphaned storage/community storage/markdowns
   ```

4. **Khởi chạy Backend Server**:
   ```bash
   PYTHONPATH=backend .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

   Khi màn hình hiển thị:
   ```text
   INFO:     Application startup complete.
   INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
   ```
   $\rightarrow$ Backend đã sẵn sàng phục vụ! Kiểm tra Swagger UI tại: `http://localhost:8000/docs`.

---

### BƯỚC 5: Cấu hình Biến Môi trường Frontend (`.env` tại frontend)

Mở file `frontend/digital-library/.env` và cấu hình như sau:

```env
# ========================================================
# URL KẾT NỐI TỚI BACKEND LOCALHOST
# ========================================================
VITE_API_URL=http://localhost:8000

# ========================================================
# LƯU Ý KHI CHẠY LOCAL:
# COMMENT LẠI HOẶC XÓA BỎ DÒNG R2 CDN PUBLIC URL
# (Để Frontend tải trực tiếp ảnh/file từ Backend Local)
# ========================================================
# VITE_R2_PUBLIC_URL=https://pub-54fbde7f3e0e4376aeebd41d1c0f3d1a.r2.dev
```

> [!TIP]
> Khi `VITE_R2_PUBLIC_URL` bị comment lại, Frontend sẽ tự động sử dụng `${VITE_API_URL}/${document.file_path}` (ví dụ: `http://localhost:8000/storage/14/uuid.pdf`). FastAPI StaticFiles sẽ đọc trực tiếp từ thư mục `storage/` và trả về cho trình duyệt với độ trễ gần như bằng 0.

---

### BƯỚC 6: Cài đặt và Khởi chạy Frontend React (Vite)

Mở một cửa sổ Terminal mới:
```bash
cd frontend/digital-library

# Cài đặt thư viện Javascript
npm install

# Khởi chạy Vite Dev Server
npm run dev
```

Mở trình duyệt và truy cập: **`http://localhost:5173`**.

Bạn đã có thể đăng ký tài khoản, đăng nhập, tải tài liệu cá nhân, tạo nhóm, chia sẻ tài liệu và đọc văn bản hoàn toàn trên máy tính cá nhân mà không cần kết nối Internet!

---

## 4. CƠ CHẾ HOẠT ĐỘNG CỦA HỆ THỐNG Ở CHẾ ĐỘ LOCAL

Để tự tin giải thích với giảng viên hoặc người chấm đồ án, bạn cần nắm rõ luồng dữ liệu khi chạy Local:

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng (Browser)
    participant FE as React Frontend (Port 5173)
    participant BE as FastAPI Backend (Port 8000)
    participant FS as Local Filesystem (storage/)
    participant DB as PostgreSQL (Port 5432)

    User->>FE: Bấm chọn file và nhấn "Tải lên"
    FE->>BE: POST /documents/upload (Multipart Form)
    Note over BE: Đọc file vào RAM<br/>Tính Checksum SHA-256
    BE->>DB: SELECT kiểm tra trùng lặp (Active & Trash)
    DB-->>BE: Chưa tồn tại file
    BE->>FS: Ghi file vật lý: storage/{owner_id}/{uuid}.ext
    BE->>DB: INSERT INTO documents (file_path="storage/...", checksum=...)
    BE-->>FE: HTTP 201 Created (document object)
    FE->>User: Hiển thị Document Card trên giao diện

    User->>FE: Bấm "Xem tài liệu" hoặc "Xem ảnh bìa"
    FE->>BE: GET http://localhost:8000/storage/{owner_id}/{uuid}.ext
    Note over BE: FastAPI StaticFiles Mount đọc file từ đĩa cứng
    BE->>FS: open("storage/{owner_id}/{uuid}.ext")
    FS-->>BE: Binary Stream
    BE-->>FE: HTTP 200 OK (Content-Type: application/pdf)
    FE->>User: Render trực tiếp trên trình duyệt
```

---

## 5. BẢNG TRA CỨU SỰ CỐ THƯỜNG GẶP KHI CHẠY LOCAL (TROUBLESHOOTING)

| Triệu chứng lỗi | Nguyên nhân gốc rễ | Cách khắc phục triệt để |
| :--- | :--- | :--- |
| **Lỗi 1: `Connection refused` tới Database** | Container Docker Postgres chưa chạy, hoặc cổng 5432 bị chiếm dụng. | Kiểm tra `docker ps`. Nếu chưa có container, chạy lại lệnh Docker ở Bước 2. Kiểm tra xem port 5432 có bị đụng độ với service Postgres local khác không. |
| **Lỗi 2: `FileNotFoundError: storage/...`** | Thư mục `storage` hoặc các thư mục con chưa được tạo sẵn. | Chạy lệnh: `mkdir -p storage/thumbnails storage/personal storage/groups storage/orphaned storage/community storage/markdowns`. |
| **Lỗi 3: Frontend báo lỗi CORS** | Domain của Frontend không nằm trong danh sách `allow_origins` của Backend. | Kiểm tra file `backend/app/main.py` tại `CORSMiddleware`. Đảm bảo đã có `'http://localhost:5173'` và `'http://127.0.0.1:5173'`. |
| **Lỗi 4: Xem chi tiết báo 404 cho file ảnh/PDF** | Frontend đang trỏ `VITE_API_URL` sai cổng hoặc chưa có file trên đĩa. | 1. Kiểm tra `frontend/digital-library/.env` xem `VITE_API_URL` có đúng là `http://localhost:8000` không.<br>2. Kiểm tra xem file có thực sự nằm trong `backend/storage/...` không. |
| **Lỗi 5: Đọc file Markdown/OCR báo lỗi** | Chưa cài đặt Tesseract OCR hoặc AnyDoc trên máy. | Đây là tính năng nâng cao không bắt buộc. Nếu chưa cài thư viện OCR, hệ thống vẫn lưu trữ file PDF/Word và phục vụ tải xuống bình thường. |

---

## 6. HƯỚNG DẪN KHI MUỐN CHUYỂN SANG CLOUDFLARE R2 PRODUCTION

Khi bạn hoàn thành việc kiểm thử trên Local và muốn chuyển sang môi trường Production trên Cloud:

1. **Chuyển sang nhánh `produc`**:
   ```bash
   git checkout produc
   ```
2. **Cập nhật `.env` ở Backend**:
   Điền đầy đủ thông tin Bucket Cloudflare R2:
   ```env
   DATABASE_URL=postgresql+asyncpg://... (Neon DB)
   MINIO_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
   MINIO_ACCESS_KEY=<your_r2_access_key>
   MINIO_SECRET_KEY=<your_r2_secret_key>
   MINIO_PUBLIC_URL=https://pub-xxxxxx.r2.dev
   BUCKET_NAME=elibrary-bucket
   ```
3. **Cập nhật `.env` ở Frontend**:
   ```env
   VITE_API_URL=https://your-production-backend.com
   VITE_R2_PUBLIC_URL=https://pub-xxxxxx.r2.dev
   ```
4. **Cấu hình CORS trên Cloudflare R2**:
   Đảm bảo Bucket R2 đã được cấu hình CORS cho phép domain production truy cập tài nguyên (Xem hướng dẫn chi tiết tại `docs/deployment/STORAGE_R2.md` trên nhánh `produc`).

---

## 7. TỔNG KẾT

- **Để Test & Chấm bài**: Dùng nhánh **`main`**, làm theo **6 bước ở Mục 3**, toàn bộ hệ thống hoạt động 100% Cục bộ trên máy tính.
- **Để Triển khai Thực tế**: Dùng nhánh **`produc`**, kích hoạt Cloudflare R2 để tận dụng băng thông miễn phí và CDN toàn cầu.
