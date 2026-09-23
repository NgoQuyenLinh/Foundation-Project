# MÔ TẢ CHỨC NĂNG — KHO HỌC LIỆU CỘNG ĐỒNG

## 1. Tổng quan

**Kho học liệu cộng đồng (Community Library)** là một không gian lưu trữ tài liệu học tập công khai trong hệ thống thư viện số.

Khác với kho tài liệu cá nhân và không gian nhóm, Kho học liệu cộng đồng cho phép **người dùng chưa đăng nhập truy cập và sử dụng tài liệu mà không cần tài khoản**.

Tài liệu trong kho cộng đồng không được công khai ngay khi người dùng đóng góp. Tài liệu phải trải qua quá trình kiểm duyệt bởi **Faculty Admin của khoa tương ứng** hoặc **System Admin** trước khi xuất hiện công khai.

Mục tiêu của chức năng là xây dựng một kho học liệu có tổ chức, trong đó tài liệu được phân cấp theo:

```text
Khoa
 └── Môn học
      └── Tài liệu
```

Ví dụ:

```text
Khoa Công nghệ thông tin
 ├── Cơ sở dữ liệu
 │    ├── Giáo trình CSDL 2024
 │    ├── Đề thi CSDL cuối kỳ
 │    └── Slide bài giảng CSDL
 │
 └── Lập trình hướng đối tượng
      ├── Giáo trình OOP
      ├── Bài tập OOP
      └── Đề thi OOP
```

Việc tổ chức này giúp người dùng dễ dàng tìm kiếm tài liệu dựa trên **khoa, môn học, loại tài liệu và năm học**.

---

# 2. Mục tiêu của chức năng

Kho học liệu cộng đồng được xây dựng nhằm giải quyết các nhu cầu:

* Cung cấp nguồn tài liệu học tập công khai.
* Cho phép sinh viên và giảng viên đóng góp tài liệu.
* Kiểm duyệt tài liệu trước khi công khai.
* Phân loại tài liệu theo khoa và môn học.
* Cho phép người dùng tìm kiếm tài liệu.
* Cho phép xem trước và tải tài liệu.
* Cho phép người dùng lưu tài liệu cộng đồng về kho cá nhân.
* Cho phép đánh giá và bình luận tài liệu.
* Theo dõi lượt tải tài liệu.
* Thống kê mức độ sử dụng tài liệu.
* Phân quyền quản lý tài liệu theo khoa.

---

# 3. Đối tượng sử dụng

Chức năng phục vụ bốn nhóm người dùng chính:

| Đối tượng              | Quyền chính                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| Khách chưa đăng nhập   | Xem, tìm kiếm, xem trước, tải tài liệu                            |
| Sinh viên / Giảng viên | Các quyền công khai + lưu tài liệu, đánh giá, bình luận, đóng góp |
| Faculty Admin          | Các quyền trên + duyệt tài liệu thuộc khoa mình                   |
| System Admin           | Các quyền trên + duyệt tài liệu của tất cả các khoa               |

---

# 4. Phân quyền

## 4.1. Người chưa đăng nhập

Người dùng không cần đăng nhập để truy cập kho học liệu.

Có thể:

* Xem danh sách khoa.
* Xem môn học.
* Xem danh sách tài liệu.
* Tìm kiếm tài liệu.
* Xem chi tiết tài liệu.
* Xem trước tài liệu.
* Tải tài liệu.

Không thể:

* Lưu tài liệu về kho cá nhân.
* Đánh giá tài liệu.
* Bình luận.
* Đóng góp tài liệu.

Khi người dùng chọn:

> Lưu về cá nhân

hệ thống chuyển tới trang đăng nhập.

Sau khi đăng nhập thành công, hệ thống đưa người dùng trở lại trang tài liệu trước đó và tiếp tục thao tác lưu.

---

# 5. Phân quyền người dùng đã đăng nhập

Sinh viên và giảng viên có thể:

* Xem tài liệu.
* Tìm kiếm tài liệu.
* Xem trước.
* Tải xuống.
* Lưu tài liệu về kho cá nhân.
* Đánh giá tài liệu từ 1 đến 5 sao.
* Viết bình luận.
* Chỉnh sửa đánh giá của mình.
* Xóa đánh giá của mình.
* Đóng góp tài liệu từ kho cá nhân hoặc nhóm.

---

# 6. Quyền của Faculty Admin

Faculty Admin có toàn bộ quyền của người dùng thông thường và có thêm quyền kiểm duyệt.

Faculty Admin chỉ được xử lý các tài liệu thuộc **khoa mà mình quản lý**.

Có thể:

* Xem danh sách tài liệu đang chờ duyệt.
* Xem thông tin tài liệu.
* Xem người đóng góp.
* Xem môn học.
* Duyệt tài liệu.
* Từ chối tài liệu.
* Nhập lý do từ chối.

Khi duyệt tài liệu:

```text
pending → approved
```

Khi từ chối:

```text
pending → rejected
```

---

# 7. Quyền của System Admin

System Admin có quyền quản lý toàn bộ kho học liệu.

Có thể:

* Xem tất cả yêu cầu đóng góp.
* Lọc yêu cầu theo khoa.
* Lọc theo môn học.
* Duyệt tài liệu.
* Từ chối tài liệu.
* Quản lý tài liệu thuộc tất cả các khoa.

---

# 8. Cấu trúc phân cấp

Kho học liệu sử dụng cấu trúc:

```text
Faculty
   ↓
Subject
   ↓
Community Document
```

Trong đó:

### Faculty

Đại diện cho khoa trong trường.

Ví dụ:

```text
Khoa Công nghệ thông tin
Khoa Kinh tế
Khoa Ngoại ngữ
```

### Subject

Môn học thuộc một khoa.

Ví dụ:

```text
CSDL — Cơ sở dữ liệu
OOP  — Lập trình hướng đối tượng
CTDL — Cấu trúc dữ liệu và giải thuật
```

Mỗi môn học thuộc duy nhất một khoa.

### Document

Tài liệu được công khai trong kho cộng đồng.

Một tài liệu có thể chứa:

* Tên tài liệu.
* Mô tả.
* Loại file.
* Kích thước.
* Môn học.
* Khoa.
* Loại tài liệu.
* Năm học.
* Người đóng góp.
* Điểm đánh giá.
* Số lượt đánh giá.
* Số lượt tải.

---

# 9. Đóng góp tài liệu

Người dùng có thể đóng góp tài liệu từ:

* Kho cá nhân.
* Không gian nhóm.

Quy trình:

```text
Chọn tài liệu
      ↓
Đóng góp vào kho học liệu
      ↓
Chọn Khoa
      ↓
Chọn Môn học
      ↓
Chọn Loại tài liệu
      ↓
Nhập Năm học
      ↓
Nhập Ghi chú
      ↓
Gửi yêu cầu
      ↓
Pending
      ↓
Faculty Admin kiểm duyệt
```

Người dùng không thể trực tiếp biến tài liệu thành tài liệu công khai.

---

# 10. Thông tin khi đóng góp

Khi gửi tài liệu, người dùng có thể cung cấp:

### Khoa

Khoa mà tài liệu thuộc về.

### Môn học

Môn học cụ thể.

### Loại tài liệu

Các loại:

* Giáo trình.
* Đề thi.
* Slide bài giảng.
* Bài tập.
* Khác.

### Năm học

Ví dụ:

```text
2023-2024
2024-2025
2025-2026
```

### Ghi chú

Thông tin bổ sung gửi cho admin khi kiểm duyệt.

---

# 11. Trạng thái tài liệu đóng góp

Mỗi yêu cầu đóng góp có ba trạng thái:

```text
pending
approved
rejected
```

### Pending

Tài liệu đang chờ Faculty Admin hoặc System Admin xử lý.

Tài liệu chưa xuất hiện công khai.

### Approved

Tài liệu đã được duyệt.

Hệ thống tạo bản tài liệu trong kho cộng đồng và tài liệu bắt đầu xuất hiện công khai.

### Rejected

Tài liệu bị từ chối.

Admin phải cung cấp lý do từ chối.

Người đóng góp nhận được thông báo về kết quả.

---

# 12. Cơ chế công khai tài liệu

Tài liệu cộng đồng sử dụng hai thông tin quan trọng trong bảng `documents`:

```text
is_public = true
subject_id = ID môn học
```

Chỉ tài liệu:

```text
is_public = true
is_deleted = false
```

mới được hiển thị trong kho cộng đồng.

Điều này giúp phân biệt tài liệu cộng đồng với tài liệu cá nhân hoặc tài liệu trong nhóm.

---

# 13. Cơ chế lưu tài liệu về cá nhân

Người dùng đăng nhập có thể chọn:

> Lưu về cá nhân

Hệ thống tạo một bản sao của tài liệu trong kho cá nhân.

File được lưu vào khu vực:

```text
storage/personal/{user_id}/from_community/
```

Thông tin tài liệu được sao chép để người dùng có thể tiếp tục quản lý trong kho cá nhân.

Logic này được thiết kế để tái sử dụng cơ chế `save_to_personal` hiện có của hệ thống.

---

# 14. Đánh giá tài liệu

Người dùng đã đăng nhập có thể đánh giá tài liệu.

Mỗi người dùng chỉ có một đánh giá cho một tài liệu.

Điểm đánh giá:

```text
1 → 5 sao
```

Người dùng có thể:

* Tạo đánh giá.
* Thay đổi số sao.
* Sửa bình luận.
* Xóa đánh giá.

Mỗi đánh giá có:

```text
Số sao
Bình luận
Người đánh giá
Thời gian tạo
Thời gian cập nhật
```

Database sử dụng ràng buộc:

```text
UNIQUE(document_id, user_id)
```

để đảm bảo một người dùng không tạo nhiều đánh giá cho cùng một tài liệu.

---

# 15. Bình luận

Bình luận được lưu cùng với đánh giá.

Giới hạn:

```text
Tối đa 500 ký tự
```

Danh sách bình luận hiển thị:

* Avatar.
* Tên người dùng.
* Số sao.
* Nội dung bình luận.
* Thời gian.

Người dùng chỉ có quyền xóa hoặc chỉnh sửa đánh giá của chính mình.

---

# 16. Thống kê đánh giá

Trang chi tiết tài liệu hiển thị:

```text
⭐ 4.5 / 5
120 đánh giá
```

Hệ thống tính:

```text
AVG(stars)
COUNT(*)
```

Điểm trung bình được sử dụng ở:

* Trang chi tiết.
* Danh sách tài liệu.
* Danh sách môn học.
* Thống kê kho học liệu.

---

# 17. Theo dõi lượt tải

Mỗi lần tài liệu được tải xuống, hệ thống ghi nhận thông tin vào `download_logs`.

Đối với người dùng đã đăng nhập, hệ thống có thể ghi nhận `user_id`.

Đối với khách chưa đăng nhập, tài liệu vẫn có thể được tải nhưng không cần gắn với tài khoản.

Số lượt tải được sử dụng để:

* Hiển thị mức độ phổ biến.
* Sắp xếp tài liệu.
* Thống kê theo môn học.

---

# 18. Tìm kiếm

Kho học liệu hỗ trợ tìm kiếm theo:

* Tên môn học.
* Tên tài liệu.

Ví dụ:

```text
Tìm: Cơ sở dữ liệu
```

có thể trả về:

```text
CSDL
Giáo trình Cơ sở dữ liệu
Đề thi Cơ sở dữ liệu
Slide Cơ sở dữ liệu
```

Backend sử dụng khả năng Full-Text Search của PostgreSQL thông qua `plainto_tsquery`.

---

# 19. Bộ lọc tài liệu

Tại trang môn học, người dùng có thể lọc:

### Theo loại

```text
Tất cả
Giáo trình
Đề thi
Slide
Bài tập
Khác
```

### Theo năm học

Ví dụ:

```text
2020-2021
2021-2022
2022-2023
2023-2024
```

### Theo cách sắp xếp

```text
Mới nhất
Phổ biến nhất
Đánh giá cao nhất
```

---

# 20. Các trang giao diện

## 20.1. Trang chủ

Route:

```text
/library
```

Hiển thị:

* Tên Kho học liệu cộng đồng.
* Thanh tìm kiếm.
* Danh sách khoa.
* Số môn học.
* Số tài liệu.

---

## 20.2. Trang khoa

Route:

```text
/library/faculty/:facultyId
```

Hiển thị:

```text
Kho học liệu
    ↓
Tên khoa
    ↓
Danh sách môn học
```

Mỗi môn học hiển thị:

* Tên môn.
* Mã môn.
* Số tài liệu.
* Điểm đánh giá trung bình.

---

## 20.3. Trang môn học

Route:

```text
/library/subject/:subjectId
```

Hiển thị:

* Tên môn.
* Mô tả.
* Số tài liệu.
* Tổng lượt tải.
* Điểm đánh giá trung bình.
* Bộ lọc.
* Danh sách tài liệu.

---

## 20.4. Trang chi tiết tài liệu

Route:

```text
/library/document/:documentId
```

Trang bao gồm:

### Khu vực preview

Cho phép người dùng xem trước tài liệu.

### Thông tin tài liệu

* Tên.
* Mô tả.
* Loại file.
* Kích thước.
* Khoa.
* Môn học.
* Loại tài liệu.
* Năm học.
* Người đóng góp.

### Thống kê

```text
Rating
Số đánh giá
Số lượt tải
```

### Chức năng

```text
Tải xuống
Lưu về cá nhân
Đánh giá
Bình luận
```

---

# 21. Trang quản trị duyệt tài liệu

Route:

```text
/library/admin/submissions
```

Chỉ:

```text
faculty_admin
system_admin
```

được truy cập.

Trang có các tab:

```text
Chờ duyệt
Đã duyệt
Đã từ chối
```

Mỗi yêu cầu hiển thị:

* Tên tài liệu.
* Người đóng góp.
* Thời gian.
* Khoa.
* Môn học.
* Năm học.
* Loại tài liệu.
* Ghi chú.

Admin có hai lựa chọn:

```text
Duyệt
Từ chối
```

Nếu từ chối phải nhập lý do.

---

# 22. Thông báo

Hệ thống sử dụng bảng `notifications` hiện có để gửi thông báo.

Các loại thông báo:

### Có tài liệu chờ duyệt

```text
community_submission_received
```

Gửi cho Faculty Admin.

### Tài liệu được duyệt

```text
community_submission_approved
```

Gửi cho người đóng góp.

### Tài liệu bị từ chối

```text
community_submission_rejected
```

Gửi cho người đóng góp và kèm lý do từ chối.

---

# 23. Cấu trúc dữ liệu chính

Các bảng mới:

```text
subjects
community_submissions
document_ratings
```

Bảng `documents` được bổ sung:

```text
is_public
subject_id
```

Các bảng có sẵn được tái sử dụng:

```text
faculties
documents
users
notifications
download_logs
favorites
tags
document_tags
```

---

# 24. Materialized View

Hệ thống xây dựng:

```text
community_subject_stats
```

Materialized View lưu thống kê theo môn học:

```text
subject_id
faculty_id
document_count
total_downloads
avg_rating
```

Mục đích là hạn chế việc phải tính toán lại các thống kê lớn mỗi khi người dùng mở trang.

View có thể được refresh định kỳ:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY community_subject_stats;
```

---

# 25. Tóm tắt chức năng

Kho học liệu cộng đồng tạo thành một hệ thống hoàn chỉnh:

```text
             KHO HỌC LIỆU CỘNG ĐỒNG
                       │
          ┌────────────┴────────────┐
          │                         │
      Người dùng                 Admin
          │                         │
     ┌────┴────┐              ┌────┴────┐
     │          │              │         │
    Xem       Đóng góp       Duyệt     Từ chối
     │          │              │         │
 Tìm kiếm      │              │         │
 Tải xuống      │              │         │
 Đánh giá       │              │         │
 Lưu cá nhân    │              │         │
                ↓              ↓         ↓
             Submission → Pending → Approved
                              │
                              ↓
                       Public Document
```

Chức năng này kết hợp giữa **quản lý tài liệu, phân quyền, kiểm duyệt, tìm kiếm, đánh giá, thống kê và chia sẻ tài liệu công khai**, tạo thành một không gian học liệu dùng chung cho toàn hệ thống.
