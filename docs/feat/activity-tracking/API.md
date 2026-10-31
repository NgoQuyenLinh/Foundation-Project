# Đặc Tả API: Activity Tracking & Analytics

Tài liệu chi tiết các endpoint RESTful API được xây dựng mới và nâng cấp để phục vụ tính năng Theo dõi hoạt động, Thống kê cá nhân và Tải tài liệu an toàn.

---

## 1. Danh Sách Endpoints

| STT | Phương Thức | Đường Dẫn API | Chức Năng | Quyền Hạn |
| :---: | :---: | :--- | :--- | :--- |
| 1 | `GET` | `/documents/{document_id}/activities` | Lấy danh sách lịch sử tương tác của một tài liệu (phân trang, lọc action) | Chủ sở hữu tài liệu hoặc Chủ sở hữu nhóm |
| 2 | `GET` | `/documents/{document_id}/stats` | Lấy số liệu counter tổng hợp và điểm xu hướng của tài liệu | Người dùng có quyền xem tài liệu |
| 3 | `GET` | `/stats/me` | Lấy số liệu thống kê tổng quan cá nhân, biểu đồ 30 ngày và 20 hoạt động gần nhất | Người dùng đã đăng nhập |
| 4 | `GET` | `/documents/{document_id}/file` | Tải xuống hoặc xem tệp tin (ghi nhận log bất đồng bộ) | Người dùng có quyền truy cập tài liệu |

---

## 2. Chi Tiết Từng Endpoint

### 2.1. Lấy Lịch Sử Hoạt Động Tài Liệu
- **Endpoint:** `GET /documents/{document_id}/activities`
- **Chức năng:** Trả về danh sách nhật ký hành động trên tài liệu kèm tên người thực hiện (`actor_name`), phục vụ hiển thị Tab *Hoạt động* trong màn hình chi tiết tài liệu.
- **Request Headers:**
  - `Authorization: Bearer <access_token>` (bắt buộc)
- **Query Parameters:**
  - `page` (`integer`, optional, default: `1`, tối thiểu: `1`): Số trang cần lấy.
  - `page_size` (`integer`, optional, default: `20`, giới hạn: `1 - 100`): Số bản ghi trên mỗi trang.
  - `action` (`string`, optional): Bộ lọc theo mã hành động cụ thể (ví dụ: `DOCUMENT_DOWNLOADED`, `DOCUMENT_VIEWED`...).
- **Quy trình xử lý phía Backend:**
  1. Kiểm tra tài liệu tồn tại trong cơ sở dữ liệu. Nếu không tìm thấy -> trả về `404 Not Found`.
  2. Xác thực phân quyền:
     - Nếu `document.owner_id == current_user.id` -> Được phép xem.
     - Nếu tài liệu thuộc nhóm (`document.workspace_id`): Kiểm tra người dùng có phải là chủ sở hữu nhóm (`Workspace.owner_id == current_user.id`).
     - Nếu không thỏa mãn một trong các điều kiện trên -> Ném ngoại lệ `403 Forbidden`.
  3. Xây dựng câu truy vấn `DownloadLog` liên kết ngoài (`outerjoin`) với bảng `users` để trích xuất `full_name` và `username`.
  4. Đếm tổng số bản ghi thỏa mãn điều kiện (`count_query`).
  5. Sắp xếp giảm dần theo thời gian tạo (`created_at DESC`), áp dụng `LIMIT` và `OFFSET`.
  6. Tính toán tổng số trang: $\text{total\_pages} = \lceil \text{total} / \text{page\_size} \rceil$.
- **Response Success (`200 OK`):**
  ```json
  {
    "items": [
      {
        "id": 102,
        "document_id": 7,
        "user_id": 6,
        "action": "DOCUMENT_DOWNLOADED",
        "workspace_context": "personal",
        "workspace_id": null,
        "extra_data": {
          "format": "original"
        },
        "created_at": "2026-10-24T09:16:54.485058Z",
        "actor_name": "Nguyễn Văn An",
        "document_title": "DeCuong_DACS_30"
      },
      {
        "id": 85,
        "document_id": 7,
        "user_id": 6,
        "action": "DOCUMENT_VIEWED",
        "workspace_context": "personal",
        "workspace_id": null,
        "extra_data": {},
        "created_at": "2026-10-24T08:30:12.112000Z",
        "actor_name": "Nguyễn Văn An",
        "document_title": "DeCuong_DACS_30"
      }
    ],
    "total": 2,
    "page": 1,
    "total_pages": 1
  }
  ```
- **Response Errors:**
  - `401 Unauthorized`: Chưa truyền token hoặc token hết hạn.
  - `403 Forbidden`: `{"detail": "Bạn không có quyền xem lịch sử tài liệu này"}`.
  - `404 Not Found`: `{"detail": "Không tìm thấy tài liệu"}`.

---

### 2.2. Lấy Thông Tin Thống Kê & Điểm Xu Hướng Tài Liệu
- **Endpoint:** `GET /documents/{document_id}/stats`
- **Chức năng:** Trả về các chỉ số counter tổng hợp và điểm số `trending_score` của một tài liệu từ bảng cache `document_stats`.
- **Request Headers:**
  - `Authorization: Bearer <access_token>` (bắt buộc)
- **Quy trình xử lý:**
  1. Kiểm tra tài liệu tồn tại trong cơ sở dữ liệu (`404 Not Found` nếu không có).
  2. Truy vấn bản ghi từ bảng `document_stats` với `document_id`.
  3. Nếu tài liệu chưa có dòng nào trong `document_stats` (ví dụ tài liệu mới upload chưa qua chu kỳ cron job), tự động trả về giá trị mặc định toàn 0.
- **Response Success (`200 OK`):**
  ```json
  {
    "document_id": 7,
    "view_count": 48,
    "download_count": 15,
    "save_count": 6,
    "share_count": 4,
    "unique_viewers": 32,
    "trending_score": 12.84,
    "last_activity_at": "2026-10-24T09:16:54.485058Z"
  }
  ```
- **Response Errors:**
  - `401 Unauthorized`: Không có quyền xác thực.
  - `404 Not Found`: `{"detail": "Không tìm thấy tài liệu"}`.

---

### 2.3. Lấy Thống Kê Tổng Quan Của Người Dùng
- **Endpoint:** `GET /stats/me`
- **Chức năng:** Cung cấp toàn bộ dữ liệu hiển thị cho trang *Thống kê* (`StatsPage`), bao gồm 3 số tổng hợp, danh sách tương tác 30 ngày liên tục và 20 sự kiện gần nhất.
- **Request Headers:**
  - `Authorization: Bearer <access_token>` (bắt buộc)
- **Query Parameters:**
  - `scope` (`string`, optional, default: `"me"`): Phạm vi thống kê:
    - `"me"`: Thống kê các tương tác do chính người dùng hiện tại thực hiện (nhật ký học tập cá nhân).
    - `"my_documents"`: Thống kê lượt tương tác của người khác trên các tài liệu do người dùng hiện tại đã tải lên.
- **Quy trình xử lý:**
  1. Xác định `current_user` từ token xác thực.
  2. Đếm số lượng tài liệu đang hoạt động (`is_deleted == False`) thuộc sở hữu của người dùng:
     `SELECT count(id) FROM documents WHERE owner_id = :user_id AND is_deleted = false`.
  3. Tính tổng `total_views` và `total_downloads`:
     - Nếu `scope="me"`: Đếm theo `user_id = current_user.id`.
     - Nếu `scope="my_documents"`: Join với `documents` và đếm theo `Document.owner_id = current_user.id`.
  4. Lấy 20 sự kiện gần nhất (`ORDER BY created_at DESC LIMIT 20`), join bảng `users` (lấy tên người tương tác) và bảng `documents` (lấy tiêu đề tài liệu).
  5. Lấy mốc thời gian 29 ngày trước tính từ ngày hiện tại (`start_date = today - 29 days`). Truy vấn đếm số lượng sự kiện theo từng ngày (`GROUP BY DATE(created_at)`).
  6. Xây dựng mảng đủ 30 phần tử tương ứng với 30 ngày, tự động gán `count = 0` cho các ngày không có tương tác nào.
- **Response Success (`200 OK`):**
  ```json
  {
    "total_uploads": 16,
    "total_views": 128,
    "total_downloads": 42,
    "recent_activities": [
      {
        "id": 204,
        "document_id": 12,
        "user_id": 6,
        "action": "DOCUMENT_VIEWED",
        "workspace_context": "personal",
        "workspace_id": null,
        "extra_data": {},
        "created_at": "2026-10-24T10:15:00Z",
        "actor_name": "Nguyễn Văn An",
        "document_title": "Bai 3 - Tinh ke thua v2"
      }
    ],
    "activity_by_day": [
      { "date": "2026-09-25", "count": 0 },
      { "date": "2026-09-26", "count": 3 },
      { "date": "2026-10-24", "count": 12 }
    ]
  }
  ```
- **Response Errors:**
  - `401 Unauthorized`: Chưa đăng nhập hoặc token không hợp lệ.

---

### 2.4. Tải Xuống Hoặc Đọc Tệp Tin (Kèm Ghi Log Nền)
- **Endpoint:** `GET /documents/{document_id}/file`
- **Chức năng:** Cung cấp nội dung tệp tin an toàn (từ Local Storage hoặc Cloudflare R2), hỗ trợ xem trực tuyến (`inline`) hoặc tải về máy tính (`attachment`), đồng thời kích hoạt tác vụ ghi nhật ký ngầm.
- **Request Headers:**
  - `Authorization: Bearer <access_token>` (hoặc truyền qua query param `token`)
- **Query Parameters:**
  - `download` (`boolean`, optional, default: `false`):
    - `false`: Mở xem trực tiếp trong trình duyệt (header `Content-Disposition: inline`). Kích hoạt ghi log `DOCUMENT_VIEWED` (có deduplicate 30 phút).
    - `true`: Tải tệp về máy tính (header `Content-Disposition: attachment; filename=...`). Kích hoạt ghi log `DOCUMENT_DOWNLOADED` (ghi nhận ngay, dedup = 0).
  - `token` (`string`, optional): Token xác thực thay thế cho trường hợp mở tệp trên tab mới của trình duyệt.
- **Response Success (`200 OK`):**
  - Trả về nhị phân (Binary Stream) với MIME Type tương ứng của file (`application/pdf`, `image/png`...).
- **Response Errors:**
  - `403 Forbidden`: Người dùng không có quyền truy cập tệp tin này.
  - `404 Not Found`: Không tìm thấy tệp tin trên hệ thống lưu trữ.
