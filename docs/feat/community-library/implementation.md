# HƯỚNG DẪN XÂY DỰNG — KHO HỌC LIỆU CỘNG ĐỒNG

## 1. Kiến trúc tổng thể

Kho học liệu cộng đồng được xây dựng theo kiến trúc:

```text
Frontend React/TypeScript
        │
        │ HTTP / REST API
        ↓
FastAPI Backend
        │
        ├── Routers
        ├── Schemas
        ├── Services
        └── Models
        │
        ↓
PostgreSQL
        │
        ├── faculties
        ├── subjects
        ├── documents
        ├── community_submissions
        ├── document_ratings
        ├── notifications
        └── download_logs

        +
        
File Storage
        │
        ├── personal/
        ├── group/
        └── community/
```

Frontend chịu trách nhiệm giao diện và tương tác người dùng.

Backend chịu trách nhiệm:

* Xác thực.
* Phân quyền.
* Xử lý nghiệp vụ.
* Kiểm duyệt.
* Tạo bản sao tài liệu.
* Ghi nhận đánh giá.
* Ghi nhận lượt tải.
* Gửi thông báo.

PostgreSQL chịu trách nhiệm lưu trữ dữ liệu quan hệ.

File Storage chịu trách nhiệm lưu file vật lý.

---

# 2. Thiết kế Database

## 2.1. Bảng subjects

Bảng `subjects` đại diện cho môn học.

```text
subjects
├── id
├── faculty_id
├── code
├── name
├── description
└── created_at
```

Quan hệ:

```text
faculties 1 ───── N subjects
```

Mỗi môn học thuộc một khoa.

Database có ràng buộc:

```text
UNIQUE(faculty_id, code)
```

để tránh trùng mã môn trong cùng một khoa.

---

# 3. Bảng community_submissions

Đây là bảng trung tâm của quy trình kiểm duyệt.

```text
community_submissions
├── id
├── source_document_id
├── published_document_id
├── submitter_id
├── subject_id
├── academic_year
├── doc_type
├── note
├── status
├── reviewed_by
├── reviewed_at
├── reject_reason
└── created_at
```

Có hai document_id vì hệ thống phân biệt:

```text
source_document_id
```

và:

```text
published_document_id
```

`source_document_id` là tài liệu gốc của người dùng.

`published_document_id` là bản tài liệu được tạo trong kho cộng đồng sau khi được duyệt.

---

# 4. Bảng document_ratings

Lưu đánh giá của người dùng.

```text
document_ratings
├── id
├── document_id
├── user_id
├── stars
├── comment
├── created_at
└── updated_at
```

Điểm sao bị giới hạn:

```text
1 <= stars <= 5
```

Đồng thời:

```text
UNIQUE(document_id, user_id)
```

đảm bảo một user chỉ có một đánh giá cho mỗi tài liệu.

---

# 5. Thay đổi bảng documents

Không tạo bảng tài liệu riêng cho Community Library.

Hệ thống tái sử dụng bảng `documents`.

Bổ sung:

```text
is_public
subject_id
```

Trong đó:

```text
is_public = false
```

là mặc định.

Khi tài liệu được duyệt:

```text
is_public = true
```

`subject_id` xác định tài liệu thuộc môn học nào.

---

# 6. Tại sao sử dụng lại documents?

Việc tái sử dụng `documents` giúp hệ thống:

* Không tạo một hệ thống quản lý file thứ hai.
* Tái sử dụng metadata tài liệu.
* Tái sử dụng tags.
* Tái sử dụng logic download.
* Tái sử dụng preview.
* Tái sử dụng logic lưu về cá nhân.
* Dễ dàng mở rộng trong tương lai.

Community Library chỉ bổ sung metadata và nghiệp vụ kiểm duyệt.

---

# 7. Materialized View

Tạo:

```text
community_subject_stats
```

View tổng hợp:

```text
document_count
total_downloads
avg_rating
```

theo:

```text
subject_id
faculty_id
```

Mục đích:

```text
Request
   ↓
Không cần COUNT + AVG + JOIN nhiều bảng
   ↓
Đọc dữ liệu thống kê đã được materialize
```

Việc này đặc biệt hữu ích khi số lượng tài liệu và lượt đánh giá tăng lên.

---

# 8. Backend Model Layer

Tạo ba model mới:

```text
backend/app/models/subject.py
backend/app/models/community_submission.py
backend/app/models/document_rating.py
```

Sau đó export trong:

```text
backend/app/models/__init__.py
```

Model `Document` được bổ sung:

```python
is_public
subject_id
```

Các relationship chính:

```text
Faculty
   └── subjects

Subject
   ├── documents
   └── submissions

Document
   └── ratings

User
   └── ratings

CommunitySubmission
   ├── source_document
   ├── published_document
   ├── submitter
   ├── subject
   └── reviewer
```

---

# 9. Schema Layer

Tạo:

```text
backend/app/schemas/library.py
```

Các schema chính:

```text
SubjectOut
RatingOut
RatingCreate
RatingUpdate
SubmissionCreate
SubmissionOut
SubmissionRejectPayload
CommunityDocumentOut
```

`CommunityDocumentOut` mở rộng thông tin của tài liệu thông thường bằng:

```text
subject_name
faculty_name
doc_type
academic_year
contributed_by
rating_avg
rating_count
download_count
```

Nhờ vậy frontend có đủ dữ liệu để hiển thị mà không cần gọi quá nhiều API.

---

# 10. Router Layer

Tạo:

```text
backend/app/routers/library.py
```

Router xử lý ba nhóm API:

```text
PUBLIC
AUTHENTICATED
ADMIN
```

---

# 11. Public API

Các API public không bắt buộc đăng nhập.

Ví dụ:

```http
GET /library/faculties/
GET /library/faculties/{faculty_id}/subjects/
GET /library/subjects/{subject_id}/documents/
GET /library/documents/{document_id}
GET /library/documents/{document_id}/download
GET /library/search/
GET /library/documents/{document_id}/ratings/
```

Nguyên tắc:

```text
Không có JWT
      ↓
Vẫn có thể truy cập
```

Nếu có JWT thì backend vẫn có thể nhận diện user để ghi nhận thông tin phù hợp.

---

# 12. Optional Authentication

Các public endpoint sử dụng cơ chế:

```text
Optional User
```

Thay vì:

```text
get_current_user
```

bắt buộc.

Ý tưởng:

```text
Có token
   ↓
Xác thực
   ↓
current_user

Không có token
   ↓
current_user = None
```

Nhờ vậy cùng một API download có thể phục vụ cả:

```text
Guest
Logged-in user
```

---

# 13. API tải tài liệu

Khi người dùng gọi:

```http
GET /library/documents/{id}/download
```

Backend:

```text
1. Tìm document
2. Kiểm tra is_public
3. Kiểm tra is_deleted
4. Xác định file vật lý
5. Ghi download_logs nếu có user
6. Trả FileResponse
```

Đối với khách:

```text
download_logs
    user_id = NULL
```

hoặc bỏ qua user_id tùy thiết kế database hiện tại.

---

# 14. API tìm kiếm

Request:

```http
GET /library/search/?q=csdl
```

Backend sử dụng PostgreSQL Full-Text Search.

Luồng:

```text
q = "csdl"
      ↓
plainto_tsquery
      ↓
PostgreSQL Search
      ↓
Documents
```

Có thể kết hợp:

```text
faculty_id
page
page_size
```

để giới hạn kết quả.

---

# 15. API đánh giá

Tạo đánh giá:

```http
POST /library/documents/{id}/ratings/
```

Body:

```json
{
  "stars": 5,
  "comment": "Tài liệu rất hữu ích"
}
```

Backend:

```text
1. Kiểm tra user đã đăng nhập
2. Kiểm tra document tồn tại
3. Kiểm tra document public
4. Kiểm tra user chưa đánh giá
5. Tạo DocumentRating
6. Trả RatingOut
```

Nếu user đã đánh giá thì không tạo bản ghi thứ hai.

---

# 16. Sửa đánh giá

API:

```http
PUT /library/documents/{id}/ratings/{rating_id}
```

Backend phải kiểm tra:

```text
rating.user_id == current_user.id
```

để đảm bảo user chỉ sửa đánh giá của mình.

---

# 17. Xóa đánh giá

API:

```http
DELETE /library/documents/{id}/ratings/{rating_id}
```

Tương tự, backend kiểm tra ownership.

Sau khi xóa:

```text
rating_count
rating_avg
```

được tính lại khi truy vấn.

---

# 18. Luồng đóng góp tài liệu

Đây là luồng nghiệp vụ quan trọng nhất.

```text
User
 │
 │ Chọn tài liệu
 ↓
DocumentContextMenu
 │
 │ Đóng góp vào kho học liệu
 ↓
ContributeModal
 │
 ├── Chọn khoa
 ├── Chọn môn
 ├── Chọn loại
 ├── Chọn năm học
 └── Nhập ghi chú
 │
 ↓
POST /library/submissions/
 │
 ↓
CommunitySubmission
status = pending
 │
 ↓
Notification
 │
 ↓
Faculty Admin
```

---

# 19. Kiểm tra tài liệu nguồn

Khi nhận submission:

```text
source_document_id
```

phải được kiểm tra.

Backend cần đảm bảo:

```text
source_document thuộc current_user
```

để người dùng không thể lấy ID tài liệu của người khác rồi đóng góp thay họ.

---

# 20. Tạo Submission

Sau khi xác thực:

```text
CommunitySubmission
```

được tạo:

```text
status = pending
```

Thông tin lưu gồm:

```text
source_document_id
submitter_id
subject_id
academic_year
doc_type
note
created_at
```

---

# 21. Gửi thông báo cho Faculty Admin

Sau khi tạo submission:

```text
Tìm Faculty của Subject
       ↓
Tìm Faculty Admin
       ↓
Tạo Notification
```

Loại:

```text
community_submission_received
```

Nội dung ví dụ:

```text
Có tài liệu mới chờ duyệt: Giáo trình Cơ sở dữ liệu
```

---

# 22. Faculty Admin xem submission

Admin gọi:

```http
GET /library/admin/submissions/
```

Backend xác định role.

Nếu:

```text
faculty_admin
```

thì chỉ trả về submission thuộc khoa của admin.

Nếu:

```text
system_admin
```

thì trả về tất cả.

Đây là điểm quan trọng để đảm bảo phân quyền theo khoa.

---

# 23. Luồng duyệt tài liệu

Khi admin nhấn:

```text
Duyệt
```

Frontend gọi:

```http
POST /library/admin/submissions/{id}/approve
```

Backend thực hiện:

```text
1. Kiểm tra quyền admin
2. Kiểm tra submission
3. Kiểm tra status = pending
4. Xác định Faculty
5. Xác định Subject
6. Copy file
7. Tạo Document mới
8. Đánh dấu is_public = true
9. Liên kết subject
10. Cập nhật submission
11. Gửi notification
```

---

# 24. Copy file vật lý

File nguồn:

```text
storage/personal/{uid}/{file}
```

được copy sang:

```text
storage/community/{faculty_code}/{subject_code}/{file}
```

Mục đích là tách file công khai khỏi file gốc của người dùng.

---

# 25. Tạo Community Document

Sau khi copy file, backend tạo một `Document` mới.

Các thuộc tính quan trọng:

```text
is_public = true
workspace_id = NULL
subject_id = submission.subject_id
owner_id = submission.submitter_id
```

Các metadata của tài liệu nguồn được sao chép:

```text
title
description
file_type
file_size
content
metadata
tags
```

Sau đó:

```text
submission.published_document_id
        ↓
new_document.id
```

---

# 26. Hoàn thành duyệt

Submission được cập nhật:

```text
status = approved
reviewed_by = admin.id
reviewed_at = current_time
published_document_id = new_document.id
```

Sau đó tạo notification:

```text
community_submission_approved
```

Ví dụ:

```text
Tài liệu "Giáo trình Cơ sở dữ liệu"
đã được duyệt vào kho học liệu!
```

---

# 27. Luồng từ chối

Admin chọn:

```text
Từ chối
```

Frontend mở modal.

Admin phải nhập:

```text
Lý do từ chối
```

Sau đó gọi:

```http
POST /library/admin/submissions/{id}/reject
```

Body:

```json
{
  "reason": "Tài liệu không phù hợp với môn học."
}
```

Backend cập nhật:

```text
status = rejected
reviewed_by = admin.id
reviewed_at = current_time
reject_reason = reason
```

Không tạo tài liệu public.

---

# 28. Thông báo khi từ chối

Tạo notification:

```text
community_submission_rejected
```

Nội dung:

```text
Tài liệu "{title}" bị từ chối:
{reason}
```

Người đóng góp có thể xem được lý do.

---

# 29. Luồng người dùng chưa đăng nhập

```text
Guest
  │
  ↓
/library
  │
  ↓
Chọn Khoa
  │
  ↓
Chọn Môn
  │
  ↓
Chọn Tài liệu
  │
  ├───────────────┐
  ↓               ↓
Tải xuống       Lưu cá nhân
  │               │
  ↓               ↓
 Thành công     Login
                  │
                  ↓
              redirect_after_login
                  │
                  ↓
             Quay lại document
                  │
                  ↓
             Lưu về cá nhân
```

---

# 30. Cơ chế redirect sau login

Khi guest nhấn:

```text
Lưu về cá nhân
```

Frontend lưu:

```javascript
sessionStorage.setItem(
  'redirect_after_login',
  currentUrl
)
```

Sau đó:

```text
navigate('/login')
```

Sau khi login:

```javascript
const redirect =
  sessionStorage.getItem('redirect_after_login')
```

Nếu tồn tại:

```text
navigate(redirect)
```

Sau đó xóa:

```javascript
sessionStorage.removeItem(
  'redirect_after_login'
)
```

---

# 31. Frontend Architecture

Các file chính:

```text
src/
├── pages/library/
│   ├── LibraryHome.tsx
│   ├── LibraryFaculty.tsx
│   ├── LibrarySubject.tsx
│   ├── LibraryDocumentDetail.tsx
│   └── admin/
│       ├── LibraryAdmin.tsx
│       └── LibraryAdminSubmissions.tsx
│
├── components/library/
│   ├── FacultyCard.tsx
│   ├── SubjectCard.tsx
│   └── PublicLayout.tsx
│
├── components/shared/
│   ├── StarRating.tsx
│   ├── RatingCard.tsx
│   └── ContributeModal.tsx
│
├── services/
│   └── libraryService.ts
│
└── types/
    └── library.ts
```

---

# 32. PublicLayout

Các trang public không sử dụng `MainLayout`.

Thay vào đó:

```text
PublicLayout
├── Header
├── Content
└── Footer
```

Header:

```text
Logo
Kho học liệu cộng đồng
Đăng nhập / Avatar
```

Footer:

```text
© Hệ thống Thư viện số — Đại học Đà Lạt
```

---

# 33. Routing

Các route public:

```text
/library
/library/faculty/:id
/library/subject/:id
/library/document/:id
```

Không yêu cầu authentication.

Route admin:

```text
/library/admin/submissions
```

bắt buộc:

```text
faculty_admin
system_admin
```

---

# 34. Tái sử dụng component

Một trong những nguyên tắc chính khi xây dựng chức năng là **tái sử dụng tối đa giao diện và logic hiện có**.

Các component được sử dụng lại:

```text
DocumentCard
DocumentRow
DocumentFilterBar
ViewToggle
SearchBar
FileIcon
EmptyState
StatCard
```

Các component mới chỉ bổ sung phần đặc thù của Community Library.

---

# 35. ContributeModal

Modal đóng góp gồm hai bước.

## Bước 1

Người dùng chọn:

```text
Khoa
Môn học
Loại tài liệu
Năm học
Ghi chú
```

Môn học chỉ được tải sau khi chọn khoa.

```text
Faculty
   ↓
GET /library/faculties/{id}/subjects/
   ↓
Subject
```

## Bước 2

Hiển thị tóm tắt:

```text
Tên tài liệu
Khoa
Môn học
Loại tài liệu
Năm học
```

Sau đó cảnh báo:

```text
Tài liệu sẽ được admin khoa duyệt trước khi công khai.
```

Cuối cùng người dùng chọn:

```text
Gửi đóng góp
```

---

# 36. Trang LibraryHome

Luồng:

```text
GET /library/faculties/
        ↓
FacultyCard[]
        ↓
Người dùng chọn Faculty
        ↓
/library/faculty/{id}
```

Trang cũng có:

```text
SearchBar
```

để tìm kiếm tài liệu.

---

# 37. Trang LibraryFaculty

Luồng:

```text
GET /library/faculties/{id}/subjects/
        ↓
SubjectCard[]
```

Mỗi SubjectCard hiển thị:

```text
Tên môn
Mã môn
Số tài liệu
Rating trung bình
```

---

# 38. Trang LibrarySubject

Luồng:

```text
GET /library/subjects/{id}/documents/
```

Query có thể gồm:

```text
page
page_size
sort
doc_type
academic_year
```

Ví dụ:

```text
/library/subjects/3/documents/?sort=popular&doc_type=Slide
```

Frontend hiển thị:

```text
DocumentCard
```

hoặc:

```text
DocumentRow
```

tùy ViewToggle.

---

# 39. Trang LibraryDocumentDetail

Trang chi tiết sử dụng lại bố cục của `DocumentDetail` hiện có.

Cấu trúc:

```text
┌───────────────────────────────────────────┐
│ Preview                   │ Thông tin     │
│                           │ tài liệu      │
│                           │               │
│                           │ Download      │
│                           │ Save          │
├───────────────────────────┴───────────────┤
│ Đánh giá & Bình luận                      │
│                                           │
│ ⭐ 4.5 / 5                                │
│                                           │
│ RatingCard                                │
│ RatingCard                                │
└───────────────────────────────────────────┘
```

---

# 40. Trang Admin Submission

Trang:

```text
/library/admin/submissions
```

Có:

```text
Chờ duyệt
Đã duyệt
Đã từ chối
```

Admin có thể lọc:

```text
Khoa
Môn học
Trạng thái
```

Mỗi submission:

```text
Document
Submitter
Faculty
Subject
Academic year
Document type
Note
```

và hai action:

```text
Duyệt
Từ chối
```

---

# 41. Luồng dữ liệu tổng thể

Toàn bộ chức năng có thể mô tả bằng luồng:

```text
                USER
                 │
                 ↓
        Personal / Group
                 │
                 │ Contribute
                 ↓
       CommunitySubmission
                 │
                 │ pending
                 ↓
          Faculty Admin
                 │
        ┌────────┴────────┐
        │                 │
      Approve           Reject
        │                 │
        ↓                 ↓
 Copy file           Save reason
        │                 │
        ↓                 ↓
Create Document    Notification
        │
        ↓
is_public = true
        │
        ↓
 COMMUNITY LIBRARY
        │
 ┌──────┼──────────┐
 ↓      ↓          ↓
View  Download   Search
 │
 ├── Save personal
 ├── Rating
 └── Comment
```

---

# 42. Luồng dữ liệu khi đánh giá

```text
User
 │
 ↓
LibraryDocumentDetail
 │
 ↓
Chọn sao + nhập comment
 │
 ↓
POST /ratings/
 │
 ↓
FastAPI
 │
 ↓
DocumentRating
 │
 ↓
PostgreSQL
 │
 ↓
RatingOut
 │
 ↓
Frontend cập nhật UI
```

---

# 43. Luồng dữ liệu khi tải

```text
User
 │
 ↓
Download
 │
 ↓
GET /download
 │
 ↓
Check public document
 │
 ↓
Find physical file
 │
 ├── Ghi download_logs
 │
 ↓
FileResponse
 │
 ↓
Browser download
```

---

# 44. Luồng kiểm tra quyền Admin

Khi truy cập:

```text
/library/admin/submissions
```

Frontend kiểm tra:

```text
isAdmin
```

Backend tiếp tục kiểm tra role.

Frontend guard giúp UX.

Backend authorization mới là lớp bảo mật thực tế.

---

# 45. Phân quyền theo khoa

Ví dụ:

```text
Faculty A
 └── Faculty Admin A

Faculty B
 └── Faculty Admin B
```

Nếu:

```text
Faculty Admin A
```

đăng nhập thì chỉ được xem:

```text
community_submissions
WHERE subject.faculty_id = faculty_A
```

Không được duyệt tài liệu của:

```text
Faculty B
```

System Admin không bị giới hạn theo khoa.

---

# 46. Storage

File được chia thành các khu vực:

```text
storage/
├── personal/
├── group/
└── community/
```

Community sử dụng:

```text
storage/community/{faculty_code}/{subject_code}/
```

Ví dụ:

```text
storage/community/
└── CNTT/
    ├── CSDL/
    │   ├── giao-trinh-csdl.pdf
    │   └── de-thi-csdl.pdf
    │
    └── OOP/
        └── slide-oop.pdf
```

Cấu trúc này giúp dễ quản lý và tránh trộn file giữa các khoa/môn.

---

# 47. Các API chính

## Public

```text
GET  /library/faculties/
GET  /library/faculties/{id}/subjects/
GET  /library/subjects/{id}/documents/
GET  /library/documents/{id}
GET  /library/documents/{id}/download
GET  /library/search/
GET  /library/documents/{id}/ratings/
```

## Authenticated

```text
POST   /library/documents/{id}/save-to-personal
POST   /library/documents/{id}/ratings/
PUT    /library/documents/{id}/ratings/{rating_id}
DELETE /library/documents/{id}/ratings/{rating_id}

POST /library/submissions/
GET  /library/submissions/my/
```

## Admin

```text
GET  /library/admin/submissions/
GET  /library/admin/submissions/{id}
POST /library/admin/submissions/{id}/approve
POST /library/admin/submissions/{id}/reject
```

---

# 48. Kiểm thử luồng 1 — Guest

### Bước 1

Truy cập:

```text
/library
```

Kết quả:

```text
Không redirect login.
```

### Bước 2

Chọn khoa.

### Bước 3

Chọn môn.

### Bước 4

Chọn tài liệu.

### Bước 5

Tải tài liệu.

Kết quả:

```text
Download thành công.
```

### Bước 6

Chọn:

```text
Lưu về cá nhân
```

Kết quả:

```text
Redirect /login
```

### Bước 7

Đăng nhập.

Kết quả:

```text
Quay lại trang document trước đó.
```

---

# 49. Kiểm thử luồng 2 — Đóng góp

```text
Personal Documents
        ↓
Context Menu
        ↓
Đóng góp vào kho học liệu
        ↓
ContributeModal
        ↓
Chọn Faculty
        ↓
Chọn Subject
        ↓
Chọn Type
        ↓
Nhập thông tin
        ↓
Submit
```

Database phải tạo:

```text
community_submissions.status = pending
```

Đồng thời tạo notification cho Faculty Admin.

---

# 50. Kiểm thử luồng 3 — Duyệt

```text
Faculty Admin
      ↓
/library/admin/submissions
      ↓
Pending submission
      ↓
Approve
      ↓
Copy file
      ↓
Create public Document
      ↓
is_public = true
      ↓
Document xuất hiện
      ↓
Notification cho contributor
```

---

# 51. Kiểm thử luồng 4 — Từ chối

```text
Admin
 ↓
Reject
 ↓
Nhập reason
 ↓
POST reject
 ↓
status = rejected
 ↓
reject_reason = reason
 ↓
Notification
```

Tài liệu không được đưa vào kho công khai.

---

# 52. Kiểm thử luồng 5 — Rating

```text
User
 ↓
Document Detail
 ↓
Chọn 5 sao
 ↓
Nhập comment
 ↓
Submit
 ↓
POST /ratings/
 ↓
DocumentRating
 ↓
Rating hiển thị ngay
```

Kiểm tra:

```text
AVG(stars)
COUNT(ratings)
```

được cập nhật chính xác.

---

# 53. Kiểm thử Build

Frontend cần chạy:

```bash
npm run build
```

Mục tiêu:

```text
0 TypeScript errors
0 build errors
```

Backend cần kiểm tra:

```text
API startup
Database connection
Swagger
Public API
Authenticated API
Admin API
```

---

# 54. Kết quả triển khai

Theo kết quả kiểm thử của chức năng, các luồng chính đã được xác nhận:

```text
Guest access                 PASSED
Student contribution        PASSED
Faculty Admin approval      PASSED
Rating & Save personal      PASSED
Frontend build              PASSED
```

Frontend TypeScript compile và bundle thành công.

---

# 55. Tổng kết kiến trúc

Kho học liệu cộng đồng không hoạt động như một kho file độc lập mà được xây dựng như một **lớp mở rộng của hệ thống quản lý tài liệu hiện có**.

Các thành phần cũ được tái sử dụng:

```text
Documents
Users
Faculties
Tags
Favorites
Download Logs
Notifications
```

Các thành phần mới bổ sung:

```text
Subjects
Community Submissions
Document Ratings
Community Storage
Community APIs
Community UI
```

Kiến trúc tổng thể:

```text
                 ┌──────────────────┐
                 │   Public Users   │
                 └────────┬─────────┘
                          │
                          ↓
                ┌─────────────────────┐
                │  Community Library  │
                └──────────┬──────────┘
                           │
              ┌────────────┼────────────┐
              ↓            ↓            ↓
           Search       Download      Rating
              │            │            │
              └────────────┼────────────┘
                           │
                           ↓
                    PostgreSQL
                           │
              ┌────────────┴────────────┐
              ↓                         ↓
       Public Documents          Submission System
                                        │
                                        ↓
                                  Faculty Admin
                                        │
                              ┌─────────┴─────────┐
                              ↓                   ↓
                           Approve              Reject
                              │                   │
                              ↓                   ↓
                       Public Document      Reject Reason
                              │
                              ↓
                       Community Storage
```

Thiết kế này cho phép hệ thống vừa duy trì được **tính mở của một kho học liệu công khai**, vừa đảm bảo **quy trình kiểm duyệt và phân quyền theo khoa**, đồng thời tận dụng lại các thành phần quản lý tài liệu đã tồn tại trong hệ thống.
