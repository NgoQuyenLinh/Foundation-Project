# Tài liệu Kỹ thuật Chức năng: Activity Tracking (Theo dõi Hoạt động)

> Tài liệu hướng dẫn và đặc tả kỹ thuật hệ thống Activity Tracking & Thống kê cho nền tảng Thư Viện Số.
> 
> 📚 **Bộ tài liệu kỹ thuật chi tiết theo từng chuyên đề được lưu trữ tại [docs/feat/activity-tracking](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/docs/feat/activity-tracking/README.md):**
> - [Tổng quan, Bối cảnh & Luồng Sequence Diagrams (README.md)](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/docs/feat/activity-tracking/README.md)
> - [Thiết kế Cơ sở Dữ liệu, ERD & Indexes (DATABASE.md)](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/docs/feat/activity-tracking/DATABASE.md)
> - [Quy tắc Nghiệp vụ, Deduplication & Trending Score (BUSINESS_RULES.md)](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/docs/feat/activity-tracking/BUSINESS_RULES.md)
> - [Đặc tả RESTful API & Error Responses (API.md)](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/docs/feat/activity-tracking/API.md)
> - [Hướng dẫn Triển khai, Vận hành Job & Test Cases (IMPLEMENTATION.md)](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/docs/feat/activity-tracking/IMPLEMENTATION.md)

---

## 1. Tổng quan chức năng

Hệ thống **Activity Tracking** ghi nhận và tổng hợp toàn bộ các hành vi tương tác của người dùng đối với tài liệu (xem, tải về, tải lên, lưu, chia sẻ, đóng góp, xóa, khôi phục, gắn nhãn).

Mục tiêu & phạm vi:
- **Audit & Bảo mật**: Giám sát lịch sử truy cập tài liệu cá nhân, nhóm và kho học liệu chung.
- **Thống kê & Đo lường**: Tính toán các chỉ số tương tác (views, downloads, shares, bookmarks) và điểm số xu hướng (**trending_score**).
- **Trải nghiệm người dùng**: Cung cấp tab *Hoạt động* trong chi tiết tài liệu và trang *Thống kê* cá nhân trực quan (summary cards, biểu đồ recharts 30 ngày, dòng thời gian phân nhóm theo ngày).

---

## 2. Database Schema

### 2.1. Bảng `download_logs` (Mở rộng từ bảng cũ)

Lưu trữ event log thô (append-only) của mọi hành vi tương tác:

| Cột | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | `INTEGER` | PRIMARY KEY | Khóa chính tự tăng |
| `document_id` | `INTEGER` | FK (`documents.id`) | ID tài liệu được tương tác |
| `user_id` | `INTEGER` | FK (`users.id`) | ID người dùng thực hiện hành vi |
| `action` | `VARCHAR(30)` | NOT NULL | Mã định danh hành động (xem mục 3) |
| `workspace_context` | `VARCHAR(20)` | DEFAULT `'personal'` | Ngữ cảnh thực hiện: `'personal'`, `'group'`, `'library'` |
| `workspace_id` | `INTEGER` | FK (`workspaces.id`) | ID nhóm làm việc (nếu trong nhóm, nullable) |
| `extra_data` | `JSONB` | DEFAULT `'{}'` | Dữ liệu ngữ cảnh mở rộng (tag_id, duration,...) |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | DEFAULT `now()` | Thời điểm xảy ra sự kiện |

**Indexes bổ sung tối ưu truy vấn**:
- `ix_download_logs_document_id_created_at` ON `(document_id, created_at DESC)`
- `ix_download_logs_user_id_created_at` ON `(user_id, created_at DESC)`
- `ix_download_logs_action_created_at` ON `(action, created_at DESC)`

---

### 2.2. Bảng `document_stats` (Tạo mới)

Lưu trữ số liệu counter tổng hợp và điểm xếp hạng theo từng tài liệu:

| Cột | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `document_id` | `INTEGER` | PRIMARY KEY, FK (`documents.id` ON DELETE CASCADE) | ID tài liệu |
| `view_count` | `INTEGER` | DEFAULT `0` | Tổng lượt xem |
| `download_count` | `INTEGER` | DEFAULT `0` | Tổng lượt tải xuống |
| `save_count` | `INTEGER` | DEFAULT `0` | Tổng lượt lưu về kho cá nhân |
| `share_count` | `INTEGER` | DEFAULT `0` | Tổng lượt chia sẻ vào nhóm/kho học liệu |
| `unique_viewers` | `INTEGER` | DEFAULT `0` | Số lượng người dùng duy nhất đã xem |
| `trending_score` | `FLOAT` | DEFAULT `0.0` | Điểm số xu hướng tương tác |
| `last_activity_at` | `TIMESTAMP WITH TIME ZONE` | NULLABLE | Thời điểm có tương tác gần nhất |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | DEFAULT `now()` | Lần cuối cron job cập nhật dòng này |

---

## 3. Danh sách Action Types

Định nghĩa tại `backend/app/constants/activity_actions.py`:

| Action Code | Giá trị chuỗi | Ý nghĩa | Router & Endpoint Trigger |
|---|---|---|---|
| `VIEWED` | `DOCUMENT_VIEWED` | Xem chi tiết / đọc file | `GET /documents/{id}`, `GET /documents/{id}/file` (inline), `GET /groups/{gid}/documents/{id}`, `GET /library/{id}` |
| `DOWNLOADED` | `DOCUMENT_DOWNLOADED` | Tải file về máy | `GET /documents/{id}/file?download=true`, `GET /documents/{id}/download-zip`, `GET /groups/{gid}/documents/{id}/download`, `GET /library/{id}/download` |
| `UPLOADED` | `DOCUMENT_UPLOADED` | Tải tài liệu mới lên | `POST /documents/upload`, `POST /documents/upload-batch`, `POST /groups/{gid}/documents/upload` |
| `SAVED` | `DOCUMENT_SAVED` | Lưu tài liệu vào kho cá nhân | `POST /groups/{gid}/documents/{id}/save-to-personal`, `POST /library/{id}/save` |
| `SHARED` | `DOCUMENT_SHARED` | Chia sẻ tài liệu vào nhóm | `POST /groups/{gid}/share/documents` |
| `CONTRIBUTED` | `DOCUMENT_CONTRIBUTED` | Đóng góp vào kho học liệu | `POST /library/contribute/{id}` |
| `RENAMED` | `DOCUMENT_RENAMED` | Đổi tên tài liệu | `PATCH /documents/{id}` |
| `DELETED` | `DOCUMENT_DELETED` | Chuyển tài liệu vào thùng rác | `DELETE /documents/{id}`, `DELETE /groups/{gid}/documents/{id}` |
| `RESTORED` | `DOCUMENT_RESTORED` | Khôi phục tài liệu từ thùng rác | `POST /trash/{id}/restore`, `POST /trash/restore-batch` |
| `TAG_ADDED` | `TAG_ADDED` | Gắn nhãn dán cho tài liệu | `PATCH /documents/{id}/tags`, `POST /groups/{gid}/documents/{id}/tags` |
| `TAG_REMOVED` | `TAG_REMOVED` | Gỡ nhãn dán khỏi tài liệu | `DELETE /documents/{id}/tags/{tag_id}`, `DELETE /groups/{gid}/documents/{id}/tags/{tag_id}` |
| `BUNDLE_CREATED` | `BUNDLE_CREATED` | Tạo gói tài liệu nhiều tệp | `POST /documents/upload-batch` |

---

## 4. Điểm số Xu hướng (Trending Score)

Điểm `trending_score` được tính toán định kỳ theo công thức trọng số kết hợp độ tươi mới (Recency decay):

$$\text{Raw Score} = 1.0 \times \text{views} + 3.0 \times \text{downloads} + 5.0 \times \text{saves} + 4.0 \times \text{shares}$$

$$\text{Trending Score} = \frac{\text{Raw Score}}{( \text{age\_in\_hours} + 2.0 )^{1.2}}$$

Ý nghĩa:
- **Downloads, Saves & Shares** có giá trị hành vi cao hơn nhiều so với **Views**, nên trọng số lần lượt là `3.0`, `5.0`, và `4.0`.
- **Hệ số suy giảm** $(\text{age} + 2.0)^{1.2}$ làm tài liệu mới có nhiều tương tác đạt thứ hạng cao nhất, sau đó giảm dần giá trị theo thời gian nhằm đưa tài liệu mới/nổi bật lên đầu.

---

## 5. APScheduler Background Job

- **Job Name**: `refresh_document_stats`
- **File**: `backend/app/jobs/scheduler.py`
- **Tần suất**: Chạy định kỳ mỗi **1 giờ** (`cron, hour="*"`).
- **Cơ chế**:
  1. Mở một `AsyncSessionLocal()` độc lập.
  2. Tổng hợp tất cả event logs từ `download_logs` theo `document_id`.
  3. Tính toán lại `view_count`, `download_count`, `save_count`, `share_count`, `unique_viewers`, `last_activity_at`.
  4. Tính `trending_score` và thực hiện `UPSERT` vào bảng `document_stats`.

---

## 6. API Endpoints

### 6.1. `GET /documents/{document_id}/activities`
- **Auth**: Bearer Token (bắt buộc).
- **Phân quyền**:
  - Chủ sở hữu tài liệu (`document.owner_id == current_user.id`).
  - Hoặc chủ sở hữu Workspace nếu tài liệu thuộc nhóm.
  - Người dùng không có quyền xem sẽ nhận `403 Forbidden`.
- **Query params**: `page=1`, `page_size=20`, `action=...` (tùy chọn).
- **Response**: `ActivityListResponse`
  ```json
  {
    "items": [
      {
        "id": 12,
        "document_id": 7,
        "user_id": 6,
        "action": "DOCUMENT_DOWNLOADED",
        "workspace_context": "personal",
        "workspace_id": null,
        "extra_data": {},
        "created_at": "2026-10-24T09:16:54.485058Z",
        "actor_name": "Nguyễn Văn An",
        "document_title": "DeCuong_DACS_30"
      }
    ],
    "total": 1,
    "page": 1,
    "total_pages": 1
  }
  ```

### 6.2. `GET /documents/{document_id}/stats`
- **Auth**: Bearer Token.
- **Response**: `DocumentStatsResponse` (trả về các chỉ số counter và `trending_score`).

### 6.3. `GET /stats/me`
- **Auth**: Bearer Token (bắt buộc).
- **Query params**: `scope="me"` (mặc định) hoặc `scope="my_documents"`.
  - `me`: Thống kê hành vi của chính user (tài liệu đã xem, tải, nhật ký học tập).
  - `my_documents`: Thống kê tương tác của người khác trên tài liệu do user tải lên.
- **Response**: `MyStatsResponse`
  ```json
  {
    "total_uploads": 16,
    "total_views": 45,
    "total_downloads": 12,
    "recent_activities": [...],
    "activity_by_day": [
      { "date": "2026-09-25", "count": 0 },
      ...
      { "date": "2026-10-24", "count": 5 }
    ]
  }
  ```

---

## 7. Frontend Kiến trúc & Giao diện

1. **`types/activity.ts`**: Khai báo interface `ActivityLog`, `ActivityListResponse`, `DocumentStats`, `MyStats`.
2. **`services/activityService.ts`**: Cung cấp `getDocumentActivities`, `getDocumentStats`, `getMyStats`, và `downloadDocumentFile`.
3. **Sửa lỗi download bypass backend**:
   - `DocumentActionCard.tsx`, `BundleDetailPage.tsx`, `usePersonalDocuments.ts`: Thay thế việc mở link tĩnh `${VITE_API_URL}/${file_path}` bằng gọi API `downloadDocumentFile(docId, title)`.
   - Kết quả: Khi user download từ bất kỳ đâu trên UI, backend nhận request kèm Authorization header và ghi nhận log `DOCUMENT_DOWNLOADED`.
4. **Tab Hoạt động (`TabPanels.tsx`)**:
   - Nhận prop `documentId`.
   - Sử dụng `useQuery(['document-activities', documentId])`.
   - Hiển thị timeline kèm dot màu Tailwind theo loại action, tên người thao tác, nhãn hành động tiếng Việt, và relative time. Có loading skeleton và `EmptyState`.
5. **Trang Thống kê (`StatsPage.tsx`)**:
   - **Section 1**: 3 `StatCard` hiển thị tổng Uploads, Views, Downloads.
   - **Section 2**: Biểu đồ Recharts `BarChart` thể hiện lượng tương tác 30 ngày qua (fill 0 ngày không có log).
   - **Section 3**: Activity feed nhóm theo ngày ("Hôm nay", "Hôm qua", "7 ngày qua", "Trước đó"), có link nhấp vào để mở tài liệu.
   - Hỗ trợ nút chuyển đổi nhanh giữa *Hoạt động của tôi* và *Tài liệu của tôi*.

---

## 8. Gotchas & Architectural Decisions

1. **Giữ nguyên tên bảng `download_logs` thay vì đổi sang `activity_logs`**:
   - Tránh làm vỡ các migration cũ hoặc seed scripts đang phụ thuộc tên bảng. Bổ sung các cột mới `workspace_context`, `workspace_id`, `extra_data` có default value tương thích 100% với dữ liệu sẵn có.
2. **FastAPI BackgroundTasks & Independent Session**:
   - Việc ghi log không được làm chậm hoặc chặn response trả về cho client.
   - Session `db` của FastAPI request sẽ bị đóng ngay khi HTTP response hoàn thành. Do đó, helper `_log_activity` trong `document_service.py` luôn tạo `async with AsyncSessionLocal()` riêng biệt để không gặp lỗi connection closed.
3. **Deduplication 30 phút cho hành động `VIEWED`**:
   - User F5 nhiều lần hoặc lướt qua lại cùng 1 tài liệu trong 30 phút sẽ không bị ghi đè hay spam views liên tục (`dedup_minutes=30`).
   - Riêng `DOWNLOADED`, `UPLOADED`, `DELETED`,... luôn được ghi nhận chính xác mỗi lần xảy ra (`dedup_minutes=0`).
4. **Download qua API Blob**:
   - Cho phép backend xác thực quyền truy cập trước khi stream file, đồng thời bảo vệ storage đường dẫn thực không bị lộ trực tiếp ra public internet mà không qua logging.
