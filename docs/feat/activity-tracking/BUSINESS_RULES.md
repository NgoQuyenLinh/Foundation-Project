# Quy Tắc Nghiệp Vụ: Activity Tracking, Deduplication & Scoring

Tài liệu quy định toàn bộ các quy tắc nghiệp vụ (Business Rules) áp dụng cho việc ghi nhận nhật ký hoạt động, chống spam lượt tương tác, thuật toán xếp hạng xu hướng và cơ chế phân quyền bảo mật trong hệ thống Digital Library.

---

## 1. Quy Tắc Ghi Nhận Sự Kiện Tương Tác (Event Logging Rules)

### 1.1. Bảng Quy Chuẩn 12 Mã Hành Động (Action Catalog)

Mọi thao tác tương tác có ý nghĩa của người dùng đối với tài liệu đều phải phát sinh một bản ghi nhật ký trong bảng `download_logs`:

| STT | Mã Hành Động | Tên Hiển Thị (Tiếng Việt) | Điểm Kích Hoạt (Trigger Point) | Dữ Liệu `extra_data` Kèm Theo |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `DOCUMENT_VIEWED` | đã xem tài liệu | `GET /documents/{id}`, `GET /documents/{id}/file` (inline), `GET /groups/{gid}/documents/{id}`, `GET /library/{id}` | `{}` hoặc `{"reader": "in-browser"}` |
| 2 | `DOCUMENT_DOWNLOADED` | đã tải xuống | `GET /documents/{id}/file?download=true`, `GET /documents/{id}/download-zip`, `GET /groups/{gid}/documents/{id}/download`, `GET /library/{id}/download` | `{"format": "original"}` hoặc `{"format": "zip"}` |
| 3 | `DOCUMENT_UPLOADED` | đã tải lên tài liệu | `POST /documents/upload`, `POST /documents/upload-batch`, `POST /groups/{gid}/documents/upload` | `{"file_size": 1024, "file_type": "pdf"}` |
| 4 | `DOCUMENT_SAVED` | đã lưu về cá nhân | `POST /groups/{gid}/documents/{id}/save-to-personal`, `POST /library/{id}/save` | `{"source_workspace_id": 12}` |
| 5 | `DOCUMENT_SHARED` | đã chia sẻ vào nhóm | `POST /groups/{gid}/share/documents` | `{"target_group_id": 5}` |
| 6 | `DOCUMENT_CONTRIBUTED` | đã đóng góp vào kho học liệu | `POST /library/contribute/{id}` | `{"category_id": 3}` |
| 7 | `DOCUMENT_RENAMED` | đã đổi tên | `PATCH /documents/{id}` | `{"old_title": "A", "new_title": "B"}` |
| 8 | `DOCUMENT_DELETED` | đã xóa tài liệu | `DELETE /documents/{id}`, `DELETE /groups/{gid}/documents/{id}` | `{"soft_delete": true}` |
| 9 | `DOCUMENT_RESTORED` | đã khôi phục | `POST /trash/{id}/restore`, `POST /trash/restore-batch` | `{"restored_from": "trash"}` |
| 10 | `TAG_ADDED` | đã gắn nhãn | `PATCH /documents/{id}/tags`, `POST /groups/{gid}/documents/{id}/tags` | `{"tag_ids": [1, 2]}` |
| 11 | `TAG_REMOVED` | đã gỡ nhãn | `DELETE /documents/{id}/tags/{tag_id}`, `DELETE /groups/.../tags/{tag_id}` | `{"removed_tag_id": 1}` |
| 12 | `BUNDLE_CREATED` | đã tạo gói tài liệu | `POST /documents/upload-batch` | `{"children_count": 5}` |

### 1.2. Quy Tắc Xác Định Ngữ Cảnh (`workspace_context`)
1. **`personal` (Kho cá nhân):**
   - Áp dụng khi thao tác diễn ra trên tài liệu thuộc sở hữu cá nhân (`document.workspace_id IS NULL`).
   - Cột `workspace_id` trong `download_logs` được lưu là `NULL`.
2. **`group` (Nhóm học tập):**
   - Áp dụng khi thao tác diễn ra trong phạm vi một workspace nhóm (`document.workspace_id IS NOT NULL` hoặc URL có chứa `/groups/{group_id}/...`).
   - Cột `workspace_id` bắt buộc lưu ID của nhóm tương ứng.
3. **`library` (Kho học liệu chung của trường/khoa):**
   - Áp dụng khi người dùng xem, tải hoặc lưu tài liệu công khai trong Kho học liệu (`/library/...`).
   - Cột `workspace_id` lưu `NULL`.

---

## 2. Quy Tắc Chống Spam Lượt Tương Tác (Deduplication)

### 2.1. Cửa Sổ Thời Gian 30 Phút Cho Hành Động `VIEWED`
Nhằm loại bỏ các trường hợp người dùng F5 tải lại trang, đổi tab qua lại, hoặc click xem nhiều lần trong cùng một phiên đọc:
- **Quy tắc:** Nếu cùng một người dùng (`user_id`) thực hiện hành động `DOCUMENT_VIEWED` trên cùng một tài liệu (`document_id`) mà bản ghi xem gần nhất xảy ra cách thời điểm hiện tại **dưới 30 phút** (`created_at > now() - INTERVAL '30 minutes'`), hệ thống **bỏ qua việc ghi log mới**.
- **Hiệu quả:**
  - Bảo vệ dung lượng lưu trữ bảng `download_logs` không bị phình to vô ích.
  - Phản ánh đúng số lượng phiên đọc thực tế của tài liệu.

### 2.2. Quy Tắc Không Áp Dụng Deduplication Cho Các Hành Động Khác
Đối với các hành vi mang tính chủ đích cao của người dùng:
- `DOCUMENT_DOWNLOADED`: Mỗi lần bấm tải file đều được ghi nhận (kể cả tải liên tiếp). Mỗi lần tải tệp tiêu tốn băng thông máy chủ và phản ánh nhu cầu lưu trữ ngoại tuyến của người dùng.
- `DOCUMENT_UPLOADED`, `DOCUMENT_SAVED`, `DOCUMENT_SHARED`, `DOCUMENT_DELETED`: Ghi nhận tức thời, không qua bộ lọc thời gian (`dedup_minutes = 0`).

---

## 3. Thuật Toán Tính Điểm Xu Hướng (Trending Score Algorithm)

### 3.1. Ý Nghĩa & Mục Tiêu
Điểm số `trending_score` đo lường mức độ quan tâm và sự lan tỏa thực tế của một tài liệu trong cộng đồng sinh viên/giảng viên. Hệ thống không sử dụng công thức đếm thuần túy (vốn làm tài liệu cũ từ các năm trước luôn giữ vị trí độc tôn), mà áp dụng mô hình suy giảm trọng lực theo thời gian (Gravity / Recency Decay).

### 3.2. Công Thức Tính Toán

$$\text{Raw Score} = 1.0 \times \text{views} + 3.0 \times \text{downloads} + 5.0 \times \text{saves} + 4.0 \times \text{shares}$$

$$\text{Trending Score} = \frac{\text{Raw Score}}{( \text{age\_in\_hours} + 2.0 )^{1.2}}$$

Trong đó:
- $\text{views}$: Tổng số lượt xem hợp lệ (`DOCUMENT_VIEWED`).
- $\text{downloads}$: Tổng số lượt tải về (`DOCUMENT_DOWNLOADED`).
- $\text{saves}$: Tổng số lượt lưu về kho cá nhân (`DOCUMENT_SAVED`).
- $\text{shares}$: Tổng số lượt chia sẻ vào nhóm hoặc đóng góp thư viện (`DOCUMENT_SHARED` + `DOCUMENT_CONTRIBUTED`).
- $\text{age\_in\_hours} = \frac{\text{now}() - \text{document.created\_at}}{3600}$: Độ tuổi của tài liệu tính bằng giờ.
- Hằng số cân bằng $+2.0$: Tránh hiện tượng chia cho 0 hoặc điểm số phóng đại bất thường trong 2 giờ đầu tiên tải lên.
- Hệ số lũy thừa $1.2$: Mức độ suy giảm độ "nóng" theo thời gian. Sau mỗi 24-48 giờ, nếu tài liệu không có thêm tương tác mới, điểm số sẽ giảm theo hàm mũ, nhường chỗ cho các bài giảng/đề tài mới nổi bật.

### 3.3. Tần Suất Cập Nhật
- Được thực thi tự động bởi Background Cron Job `refresh_document_stats` trong `APScheduler` với chu kỳ **60 phút một lần** (`hour="*"`).
- Kết quả được ghi đè vào bảng `document_stats`, giúp các API sắp xếp danh mục tài liệu HOT/Trending chỉ cần chạy lệnh `ORDER BY trending_score DESC` cực nhanh.

---

## 4. Quy Tắc Phân Quyền Truy Cập Lịch Sử (Authorization Rules)

### 4.1. Quyền Xem Nhật Ký Hoạt Động (`GET /documents/{id}/activities`)
Nhật ký tương tác tài liệu là dữ liệu nhạy cảm liên quan đến danh tính người đọc (`actor_name`). Do đó, hệ thống quy định nghiêm ngặt:
1. **Chủ sở hữu tài liệu (Document Owner):**
   - Được phép xem toàn bộ lịch sử nếu `document.owner_id == current_user.id`.
2. **Chủ sở hữu Nhóm (Workspace Owner):**
   - Nếu tài liệu được chia sẻ hoặc tạo trong một Workspace nhóm, chỉ **Trưởng nhóm / Chủ sở hữu Workspace** mới có quyền xem nhật ký hoạt động của các thành viên khác trong nhóm trên tài liệu đó.
3. **Từ chối hợp lệ (Forbidden):**
   - Thành viên bình thường trong nhóm (Member) hoặc người dùng bên ngoài không có quyền xem lịch sử hoạt động -> Hệ thống ngay lập tức ngắt luồng và trả về mã HTTP `403 Forbidden` kèm thông báo: `"Bạn không có quyền xem lịch sử tài liệu này"`.

### 4.2. Quyền Xem Thống Kê Cá Nhân (`GET /stats/me`)
- Bắt buộc đăng nhập (`get_current_user`).
- Mỗi người dùng chỉ được xem số liệu thống kê thuộc phạm vi tài khoản của chính mình.
- Hệ thống hỗ trợ 2 chế độ (`scope`):
  - **`scope="me"` (Mặc định):** Phản ánh "Hành trình học tập của tôi" — Số tài liệu tôi đã tải lên, số lượt tôi đã xem, số lượt tôi đã tải tệp từ hệ thống. Thích hợp cho toàn bộ sinh viên.
  - **`scope="my_documents"`:** Phản ánh "Mức độ lan tỏa của tài liệu của tôi" — Số tài liệu tôi đã tải lên, số lượt người khác đã xem tài liệu của tôi, số lượt người khác đã tải tài liệu của tôi. Thích hợp cho giảng viên hoặc sinh viên chia sẻ tài liệu học tập.

---

## 5. Quy Tắc Hiển Thị & Trực Quan Hóa (UI Presentation Rules)

### 5.1. Bảng Màu Chỉ Báo Hành Động (Color Tokens)

Mỗi loại hành vi trong dòng thời gian được gắn một chấm tròn (dot color) đặc trưng chuẩn Tailwind CSS:

| Mã Hành Động | Tailwind Color Class | Màu Đại Diện |
| :--- | :--- | :--- |
| `DOCUMENT_VIEWED` / `view` | `bg-blue-500` | Xanh dương (Blue) |
| `DOCUMENT_DOWNLOADED` / `download` | `bg-purple-500` | Tím (Purple) |
| `DOCUMENT_UPLOADED` | `bg-green-500` | Xanh lá (Green) |
| `DOCUMENT_SAVED` | `bg-teal-500` | Xanh mòng két (Teal) |
| `DOCUMENT_SHARED` | `bg-orange-500` | Cam (Orange) |
| `DOCUMENT_CONTRIBUTED` | `bg-amber-500` | Vàng hổ phách (Amber) |
| `DOCUMENT_DELETED` | `bg-red-400` | Đỏ nhạt (Red) |
| `DOCUMENT_RESTORED` | `bg-emerald-400` | Xanh ngọc (Emerald) |
| `TAG_ADDED` / `TAG_REMOVED` | `bg-gray-400` / `bg-gray-300` | Xám (Gray) |
| `BUNDLE_CREATED` | `bg-purple-300` | Tím nhạt |

### 5.2. Quy Tắc Phân Nhóm Dòng Thời Gian (Activity Grouping)
Trong danh sách 20 sự kiện gần nhất trên trang Thống kê, các bản ghi được phân nhóm theo khoảng thời gian thực tế:
- **`Hôm nay`:** Các sự kiện có `created_at` từ 00:00:00 của ngày hiện tại.
- **`Hôm qua`:** Các sự kiện có `created_at` trong 24 giờ của ngày hôm trước.
- **`7 ngày qua` / `<N> ngày trước`:** Các sự kiện xảy ra trong vòng 7 ngày gần nhất.
- **`Cũ hơn`:** Các sự kiện ngoài khoảng 7 ngày.

### 5.3. Quy Tắc Làm Mượt Biểu Đồ 30 Ngày (Zero-fill Daily Chart)
- Trục X của biểu đồ cột `BarChart` luôn hiển thị **đủ 30 cột mốc ngày liên tục** kể từ ngày hiện tại lùi về 29 ngày trước.
- Những ngày không phát sinh bất kỳ sự kiện nào bắt buộc phải có giá trị `{ "date": "YYYY-MM-DD", "count": 0 }`. Tuyệt đối không bỏ trống ngày để tránh làm đứt gãy hoặc co rúm tỷ lệ hiển thị của biểu đồ Recharts.
