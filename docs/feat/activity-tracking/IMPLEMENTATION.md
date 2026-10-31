# Hướng Dẫn Triển Khai & Kiểm Thử: Activity Tracking & Analytics

Tài liệu hướng dẫn kỹ thuật viên từng bước thiết lập môi trường, chạy migration cơ sở dữ liệu, cấu hình tiến trình nền và thực hiện quy trình kiểm thử toàn diện cho hệ thống Activity Tracking.

---

## 1. Cài Đặt Môi Trường & Chạy Migration Cơ Sở Dữ Liệu

### 1.1. Yêu Cầu Phía Backend
Đảm bảo môi trường Python 3.11+ đã cài đặt đầy đủ các gói phụ thuộc:
```bash
# Kích hoạt virtualenv của dự án
source .venv/bin/activate

# Cài đặt các thư viện liên quan (nếu chưa có)
pip install apscheduler asyncpg sqlalchemy alembic httpx
```

### 1.2. Thực Thi Alembic Migration
Áp dụng bản migration mới nhất `d76927b437fe_add_activity_tracking.py` lên cơ sở dữ liệu:
```bash
alembic upgrade head
```

*Kiểm tra kết quả migration trực tiếp trên PostgreSQL:*
```sql
-- 1. Kiểm tra phiên bản hiện tại
SELECT version_num FROM alembic_version;
-- Kết quả hiển thị: d76927b437fe

-- 2. Kiểm tra cấu trúc các cột mới trên download_logs
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'download_logs';

-- 3. Kiểm tra bảng document_stats đã được tạo
SELECT COUNT(*) FROM document_stats;
```

---

## 2. Cấu Hình & Vận Hành APScheduler Job

### 2.1. Đăng Ký Job Định Kỳ (`app/jobs/scheduler.py`)
Tiến trình nền `refresh_document_stats` được đăng ký chạy mỗi 1 giờ (`cron, hour="*"`):

```python
# backend/app/jobs/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

def register_jobs():
    from app.services.document_service import refresh_all_document_stats
    
    # Chạy mỗi 1 giờ để làm mới bảng document_stats và tính toán trending_score
    scheduler.add_job(
        refresh_all_document_stats,
        trigger="cron",
        hour="*",
        minute=0,
        id="refresh_document_stats",
        replace_existing=True,
    )
```

### 2.2. Vòng Đời Ứng Dụng Trong `main.py`
Khởi động scheduler khi ứng dụng FastAPI startup và đóng an toàn khi shutdown:
```python
# backend/app/main.py
@app.on_event("startup")
async def startup():
    if not scheduler.running:
        register_jobs()
        scheduler.start()

@app.on_event("shutdown")
async def shutdown():
    if scheduler.running:
        scheduler.shutdown()
```

### 2.3. Chạy Thủ Công Tác Vụ Làm Mới Thống Kê (Manual Trigger Script)
Trong trường hợp cần tính toán lại toàn bộ `document_stats` ngay lập tức mà không cần chờ 1 giờ:
```bash
python -c "
import sys, asyncio
sys.path.insert(0, 'backend')
from app.services.document_service import refresh_all_document_stats

asyncio.run(refresh_all_document_stats())
print('Đã làm mới toàn bộ document_stats thành công!')
"
```

---

## 3. Triển Khai Phía Frontend & Sửa Lỗi Bypass Tải File

### 3.1. Cài Đặt Thư Viện Biểu Đồ
Đảm bảo `recharts` đã được cài đặt trong thư mục frontend:
```bash
cd frontend/digital-library
npm install recharts lucide-react @tanstack/react-query
```

### 3.2. Chuẩn Hóa Phương Thức Tải File An Toàn (`activityService.ts`)
Phương thức `downloadDocumentFile` gọi trực tiếp vào API backend có xác thực và ghi nhận log:
```typescript
// frontend/digital-library/src/services/activityService.ts
downloadDocumentFile: async (documentId: number, fileName: string) => {
  const response = await api.get(`/documents/${documentId}/file`, {
    params: { download: true },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
```

### 3.3. Thay Thế Trên Các Giao Diện Tải File
1. **`DocumentActionCard.tsx`:** Thay thế thẻ `<a href="...">` tải URL tĩnh bằng việc gọi `handleDownloadOriginal()` kích hoạt `activityService.downloadDocumentFile()`.
2. **`BundleDetailPage.tsx`:** Thay thế `window.open(staticUrl)` trong switch-case `"download"` bằng `activityService.downloadDocumentFile(child.id, child.title)`.
3. **`usePersonalDocuments.ts`:** Thay thế `fileDownloadUrl` tĩnh trong action `"download"` bằng `activityService.downloadDocumentFile(targetDoc.id, targetDoc.title)`.

---

## 4. Kịch Bản Kiểm Thử & Nghiệm Thu (Verification Scenarios)

### Kịch Bản 1: Kiểm Thử Ghi Log Bất Đồng Bộ Khi Xem & Tải File
- **Mục tiêu:** Đảm bảo API phản hồi nhanh chóng và nhật ký được ghi ngầm vào bảng `download_logs`.
- **Thực hiện:**
  1. Người dùng A truy cập tài liệu ID 7: `GET /documents/7`.
  2. Kiểm tra DB: Xuất hiện bản ghi `action = 'DOCUMENT_VIEWED'`, `document_id = 7`, `user_id = A`.
  3. Người dùng A bấm nút "Tải xuống tài liệu": Gọi `GET /documents/7/file?download=true`.
  4. Kiểm tra DB: Xuất hiện bản ghi `action = 'DOCUMENT_DOWNLOADED'`, `document_id = 7`, `user_id = A`.

### Kịch Bản 2: Kiểm Thử Chống Spam Xem Tài Liệu (Deduplication)
- **Mục tiêu:** Ngăn chặn việc nhân bản vô hạn log xem khi reload trang liên tục.
- **Thực hiện:**
  1. Người dùng A liên tục F5 trang chi tiết tài liệu 5 lần trong vòng 2 phút.
  2. Kiểm tra DB: Bảng `download_logs` chỉ ghi nhận đúng **1 bản ghi** `DOCUMENT_VIEWED` duy nhất. 4 lần gọi sau bị bỏ qua do nằm trong cửa sổ thời gian 30 phút.

### Kịch Bản 3: Kiểm Thử Phân Quyền Xem Lịch Sử (`GET /documents/{id}/activities`)
- **Mục tiêu:** Đảm bảo tính bảo mật và chỉ chủ sở hữu tài liệu/nhóm mới xem được nhật ký.
- **Thực hiện:**
  1. Đăng nhập với tài khoản User 6 (Chủ sở hữu của tài liệu 7).
  2. Gửi request: `GET /documents/7/activities`.
  3. Kết quả: Nhận HTTP `200 OK`, danh sách trả về đầy đủ kèm `actor_name` ("Nguyễn Văn An").
  4. Đăng nhập với tài khoản User 4 (Người dùng không sở hữu tài liệu 7).
  5. Gửi request: `GET /documents/7/activities`.
  6. Kết quả: Nhận HTTP `403 Forbidden` (`{"detail": "Bạn không có quyền xem lịch sử tài liệu này"}`).

### Kịch Bản 4: Kiểm Thử API Thống Kê Cá Nhân (`GET /stats/me`)
- **Mục tiêu:** Kiểm tra tính chính xác của 3 số counter, 20 hoạt động gần nhất và biểu đồ 30 ngày.
- **Thực hiện:**
  1. Gọi API: `GET /stats/me?scope=me`.
  2. Kiểm tra payload:
     - `total_uploads`: Khớp với số lượng tài liệu đang hoạt động do user sở hữu.
     - `activity_by_day`: Mảng có độ dài chính xác bằng 30 phần tử, ngày không có log có `count: 0`.
     - `recent_activities`: Chứa các sự kiện mới nhất kèm tiêu đề tài liệu (`document_title`).
  3. Gọi API: `GET /stats/me?scope=my_documents`.
  4. Kiểm tra payload: `total_views` và `total_downloads` phản ánh lượt tương tác của độc giả trên tài liệu của người dùng.

### Kịch Bản 5: Kiểm Thử Biên Dịch Mã Nguồn (Build Verification)
- **Kiểm tra TypeScript phía Frontend:**
  ```bash
  cd frontend/digital-library
  npx tsc --noEmit
  ```
  *Kết quả:* Mã thoát `0` (không có lỗi type).
- **Kiểm tra đóng gói sản phẩm Vite:**
  ```bash
  npm run build
  ```
  *Kết quả:* Tạo thành công bundle production trong thư mục `dist/`.
