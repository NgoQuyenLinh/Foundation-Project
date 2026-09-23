# SPEC: Kho tài liệu cộng đồng (Community Library)

## Tổng quan
Trang công khai cho phép truy cập không cần đăng nhập.
Tổ chức tài liệu theo phân cấp: Khoa → Môn học → Tài liệu.
Tài liệu được đóng góp từ người dùng và duyệt bởi faculty_admin.

## Routes

| Route | Component | Auth yêu cầu |
|---|---|---|
| `/library` | `LibraryHome` | Không |
| `/library/faculty/:facultyId` | `LibraryFaculty` | Không |
| `/library/subject/:subjectId` | `LibrarySubject` | Không |
| `/library/document/:documentId` | `LibraryDocumentDetail` | Không |
| `/library/admin` | `LibraryAdmin` | faculty_admin / system_admin |
| `/library/admin/submissions` | `LibraryAdminSubmissions` | faculty_admin / system_admin |

## Sidebar entry
Thêm vào Sidebar.tsx sau mục "Trường", trước "Thống kê":

```tsx
{
  to: "/library",
  icon: <BookOpen className="h-5 w-5" />,
  label: "Kho học liệu",
  badge: undefined,  // không cần badge số
}
```

## Quyền truy cập

```
Chưa đăng nhập:  xem, tìm kiếm, xem trước, tải xuống ✅
                 lưu về cá nhân ❌ → redirect login?redirect=/library/document/{id}

Đã đăng nhập:    tất cả trên + lưu về cá nhân + đánh giá + đóng góp ✅

faculty_admin:   tất cả + duyệt tài liệu thuộc khoa mình ✅
system_admin:    tất cả + duyệt mọi tài liệu ✅
```

---

## API Endpoints

### Public (không cần Authorization header)

```
GET /library/faculties/
    → list[FacultyOut] kèm document_count mỗi khoa

GET /library/faculties/{faculty_id}/subjects/
    → list[SubjectOut] kèm document_count, avg_rating

GET /library/subjects/{subject_id}/documents/
    query: page, page_size, sort (newest|popular|rating), doc_type, academic_year
    → PaginatedDocuments (chỉ is_public=true, is_deleted=false)

GET /library/documents/{document_id}
    → DocumentOut + rating_avg + rating_count + subject + faculty

GET /library/documents/{document_id}/download
    → FileResponse (ghi log vào download_logs — nếu có user_id thì ghi, không thì bỏ qua)

GET /library/search/
    query: q (tên môn hoặc tên tài liệu), faculty_id?, page, page_size
    → PaginatedDocuments — dùng plainto_tsquery PostgreSQL

GET /library/documents/{document_id}/ratings/
    query: page, page_size
    → list[RatingOut]
```

### Cần đăng nhập

```
POST /library/documents/{document_id}/save-to-personal
    → DocumentOut (bản copy trong kho cá nhân)
    Logic: giống save_to_personal của nhóm (copy file, copy tags, tạo tags thiếu)

POST /library/documents/{document_id}/ratings/
    body: { stars: 1-5, comment?: string }
    → RatingOut

PUT  /library/documents/{document_id}/ratings/{rating_id}
    body: { stars?: int, comment?: string }
    → RatingOut

DELETE /library/documents/{document_id}/ratings/{rating_id}
    → 204

POST /library/submissions/
    body: {
      source_document_id: int,  # document từ kho cá nhân hoặc nhóm
      subject_id: int,
      academic_year?: string,   # "2023-2024"
      doc_type?: string,        # "Giáo trình" | "Đề thi" | "Slide" | "Bài tập" | "Khác"
      note?: string
    }
    → SubmissionOut
    Logic:
      1. Xác nhận source_document thuộc người dùng hiện tại
      2. Tạo community_submission với status='pending'
      3. Tạo notification cho faculty_admin của faculty tương ứng với subject_id
         type='community_submission_received'
         message='Có tài liệu mới chờ duyệt: {document_title}'

GET /library/submissions/my/
    → list[SubmissionOut] — lịch sử đóng góp của mình
```

### Admin

```
GET /library/admin/submissions/
    query: status (pending|approved|rejected), subject_id?, page, page_size
    Logic: faculty_admin chỉ thấy submissions của khoa mình
           system_admin thấy tất cả
    → PaginatedSubmissions

GET /library/admin/submissions/{submission_id}
    → SubmissionOut kèm thông tin document gốc

POST /library/admin/submissions/{submission_id}/approve
    Logic:
      1. Update status='approved', reviewed_by, reviewed_at
      2. Copy file vật lý:
           storage/personal/{uid}/{file} → storage/community/{faculty_code}/{subject_code}/{file}
      3. Tạo Document mới:
           is_public=true, workspace_id=NULL,
           subject_id=submission.subject_id,
           owner_id=submission.submitter_id,
           copy title/description/file_type/file_size/content/metadata/tags từ source
      4. Update submission.published_document_id = new_document.id
      5. Tạo notification cho submitter:
           type='community_submission_approved'
           message='Tài liệu "{title}" đã được duyệt vào kho học liệu!'
    → SubmissionOut

POST /library/admin/submissions/{submission_id}/reject
    body: { reason: string }
    Logic:
      1. Update status='rejected', reviewed_by, reviewed_at, reject_reason
      2. Tạo notification cho submitter:
           type='community_submission_rejected'
           message='Tài liệu "{title}" bị từ chối: {reason}'
    → SubmissionOut
```

---

## Schemas (Pydantic)

```python
class SubjectOut(BaseModel):
    id: int
    faculty_id: int
    code: str
    name: str
    description: Optional[str]
    document_count: int = 0
    avg_rating: float = 0.0
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RatingOut(BaseModel):
    id: int
    document_id: int
    user_id: int
    user_name: str       # full_name hoặc username
    stars: int
    comment: Optional[str]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SubmissionOut(BaseModel):
    id: int
    source_document_id: int
    source_document_title: str
    published_document_id: Optional[int]
    submitter_id: int
    submitter_name: str
    subject_id: int
    subject_name: str
    faculty_name: str
    academic_year: Optional[str]
    doc_type: Optional[str]
    note: Optional[str]
    status: str          # pending | approved | rejected
    reject_reason: Optional[str]
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CommunityDocumentOut(BaseModel):
    """DocumentOut mở rộng cho kho cộng đồng"""
    id: int
    title: str
    description: Optional[str]
    file_type: Optional[str]
    file_size: Optional[int]
    subject_id: Optional[int]
    subject_name: Optional[str]
    faculty_name: Optional[str]
    doc_type: Optional[str]
    academic_year: Optional[str]
    owner_id: int
    contributed_by: str  # full_name hoặc username của người đóng góp
    rating_avg: float = 0.0
    rating_count: int = 0
    download_count: int = 0
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
```

---

## Models SQLAlchemy cần thêm

```python
# backend/app/models/subject.py
class Subject(Base):
    __tablename__ = "subjects"
    id, faculty_id, code, name, description, created_at
    # relationships: faculty, documents, submissions

# backend/app/models/community_submission.py
class CommunitySubmission(Base):
    __tablename__ = "community_submissions"
    id, source_document_id, published_document_id, submitter_id,
    subject_id, academic_year, doc_type, note,
    status, reviewed_by, reviewed_at, reject_reason, created_at
    # relationships: source_document, published_document,
    #                submitter, subject, reviewer

# backend/app/models/document_rating.py
class DocumentRating(Base):
    __tablename__ = "document_ratings"
    id, document_id, user_id, stars, comment, created_at, updated_at
    # relationships: document, user
```

---

## Frontend: Cấu trúc file

```
src/pages/library/
├── LibraryHome.tsx           # Trang chủ: danh sách khoa
├── LibraryFaculty.tsx        # Danh sách môn của khoa
├── LibrarySubject.tsx        # Danh sách tài liệu của môn
├── LibraryDocumentDetail.tsx # Chi tiết tài liệu cộng đồng
└── admin/
    ├── LibraryAdmin.tsx          # Dashboard admin: số liệu chờ duyệt
    └── LibraryAdminSubmissions.tsx # Danh sách submissions chờ duyệt

src/services/
└── libraryService.ts         # Tất cả API calls cho /library/*

src/types/
└── library.ts                # Subject, Submission, Rating, CommunityDocument types
```

---

## Frontend: Chi tiết từng trang

### LibraryHome (`/library`)

```
Layout: KHÔNG dùng MainLayout (không có Sidebar)
        Dùng PublicLayout: Header đơn giản (logo + tên hệ thống + nút Đăng nhập nếu chưa login)

Header khu vực:
  - Tiêu đề lớn: "Kho Học Liệu Cộng Đồng"
  - Subtitle: "Tài liệu học tập do sinh viên và giảng viên đóng góp"
  - SearchBar to ở giữa: placeholder "Tìm môn học, tài liệu..."
    → Khi gõ và submit: navigate('/library/search?q=...')

Body:
  - Tiêu đề section: "Khám phá theo Khoa"
  - Grid FacultyCard (tái sử dụng style FolderCard nhưng to hơn):
    + Icon khoa (dùng GraduationCap từ lucide)
    + Tên khoa
    + Số môn học | Số tài liệu
    + Màu card: dùng color từ faculty (nếu có) hoặc xoay vòng palette

Footer nhỏ: "© Hệ thống Thư viện số — Đại học Đà Lạt"
```

### LibraryFaculty (`/library/faculty/:facultyId`)

```
Breadcrumb: Kho học liệu > [Tên khoa]

Header:
  - Icon khoa + tên khoa lớn + số liệu (X môn, Y tài liệu)
  - SearchBar lọc môn học theo tên (client-side)

Body:
  - Grid SubjectCard (giống FolderCard nhưng hiển thị thêm):
    + Tên môn (VD: "Cơ sở dữ liệu")
    + Mã môn (VD: CSDL)
    + Số tài liệu | Điểm đánh giá trung bình (⭐ 4.2)
    + Pill "12 tài liệu" màu primary nhạt
```

### LibrarySubject (`/library/subject/:subjectId`)

```
Breadcrumb: Kho học liệu > [Tên khoa] > [Tên môn]

Header:
  - Tên môn + mô tả
  - StatBar: X tài liệu | Y lượt tải | ⭐ Z trung bình

Filter bar (tái sử dụng DocumentFilterBar):
  - Tabs: Tất cả | Giáo trình | Đề thi | Slide | Bài tập | Khác
  - Dropdown: Năm học (2020-2021, 2021-2022, 2022-2023, 2023-2024)
  - Sort: Mới nhất | Phổ biến nhất | Đánh giá cao nhất
  - ViewToggle: Grid / List (tái sử dụng ViewToggle component)

Body: Grid/List DocumentCard hoặc DocumentRow
  Mỗi card thêm: ⭐ rating_avg | lượt tải | năm học | loại tài liệu
  Context menu (DocumentContextMenu mở rộng):
    - Xem/Xem trước
    - Tải xuống
    - Lưu về cá nhân (nếu chưa login → redirect login)
    - Đánh giá (nếu đã login)
```

### LibraryDocumentDetail (`/library/document/:documentId`)

```
Layout: PublicLayout (không sidebar)

2 cột (tái sử dụng DocumentDetail):
  Cột trái (rộng):
    - Preview tài liệu
    - Mô tả
    - Section "Đánh giá & Bình luận":
        Tổng quan: ⭐ X.X / 5 (Y đánh giá) + phân bổ sao (1-5)
        Nút "Viết đánh giá" (nếu đã login)
        Form đánh giá: chọn sao + textarea bình luận
        Danh sách bình luận: Avatar + tên + sao + comment + ngày

  Cột phải (sidebar):
    - Thông tin tệp (giống DocumentDetail hiện tại)
    - Khoa: [tên khoa]
    - Môn học: [tên môn]
    - Loại tài liệu: [Giáo trình/Đề thi/...]
    - Năm học: [2023-2024]
    - Đóng góp bởi: [tên người đóng góp]
    - ⭐ rating_avg (Y đánh giá)
    - Số lượt tải
    - Nút "Tải xuống tài liệu" (primary, full width)
    - Nút "Lưu về cá nhân" (outline) — nếu chưa login: mở modal "Đăng nhập để lưu"
    - Nút "Đóng góp tài liệu tương tự" (ghost)
```

### Modal đóng góp tài liệu (ContributeModal)

```
Trigger: Nút "Đóng góp vào kho học liệu" trong DocumentContextMenu
         (xuất hiện trong kho cá nhân và không gian nhóm)

Bước 1 — Chọn thông tin phân loại:
  - Dropdown Khoa (fetch /library/faculties/)
  - Dropdown Môn học (fetch /library/faculties/{id}/subjects/ sau khi chọn khoa)
  - Dropdown Loại tài liệu: Giáo trình | Đề thi | Slide bài giảng | Bài tập | Khác
  - Input Năm học: "2023-2024" (optional)
  - Textarea Ghi chú cho admin (optional)

Bước 2 — Xác nhận:
  - Hiển thị tóm tắt: tên tài liệu + khoa + môn + loại
  - Warning: "Tài liệu sẽ được admin khoa duyệt trước khi công khai"
  - Nút "Gửi đóng góp"

Sau khi gửi: Toast "Đã gửi yêu cầu đóng góp! Admin sẽ duyệt trong thời gian sớm nhất."
```

### LibraryAdminSubmissions (`/library/admin/submissions`)

```
Chỉ faculty_admin và system_admin truy cập được.
Hiển thị trong sidebar mục admin (thêm sau).

Filter bar:
  - Tabs: Chờ duyệt (N) | Đã duyệt | Đã từ chối
  - Dropdown: Khoa | Môn học

Danh sách submission dạng card:
  - Tên tài liệu + người đóng góp + thời gian gửi
  - Khoa > Môn học | Năm học | Loại
  - Ghi chú của người đóng góp (nếu có)
  - 2 nút: "Duyệt" (primary) | "Từ chối" (danger)

Modal từ chối:
  - Textarea "Lý do từ chối" (required, min 10 ký tự)
  - Nút xác nhận
```

---

## Component mới cần tạo (tối giản, tái sử dụng tối đa)

```
src/components/shared/
├── StarRating.tsx          # Hiển thị + chọn sao (1-5), tái dùng ở detail + form
├── RatingCard.tsx          # Card 1 bình luận (Avatar + tên + sao + comment)
└── ContributeModal.tsx     # Modal đóng góp tài liệu (2 bước)

src/components/library/
├── FacultyCard.tsx         # Card khoa (style FolderCard to hơn)
├── SubjectCard.tsx         # Card môn học
└── PublicLayout.tsx        # Layout không sidebar (Header đơn + Footer)
```

---

## Service layer

```typescript
// src/services/libraryService.ts

export const libraryService = {
  // Public
  getFaculties: () => api.get('/library/faculties/').then(r => r.data),
  getSubjects: (facultyId: number) =>
    api.get(`/library/faculties/${facultyId}/subjects/`).then(r => r.data),
  getDocuments: (subjectId: number, params?) =>
    api.get(`/library/subjects/${subjectId}/documents/`, { params }).then(r => r.data),
  getDocument: (docId: number) =>
    api.get(`/library/documents/${docId}`).then(r => r.data),
  search: (params: { q: string; faculty_id?: number; page?: number }) =>
    api.get('/library/search/', { params }).then(r => r.data),
  getRatings: (docId: number, params?) =>
    api.get(`/library/documents/${docId}/ratings/`, { params }).then(r => r.data),

  // Auth required
  saveToPersonal: (docId: number) =>
    api.post(`/library/documents/${docId}/save-to-personal`).then(r => r.data),
  submitRating: (docId: number, payload: { stars: number; comment?: string }) =>
    api.post(`/library/documents/${docId}/ratings/`, payload).then(r => r.data),
  updateRating: (docId: number, ratingId: number, payload) =>
    api.put(`/library/documents/${docId}/ratings/${ratingId}`, payload).then(r => r.data),
  deleteRating: (docId: number, ratingId: number) =>
    api.delete(`/library/documents/${docId}/ratings/${ratingId}`),
  submit: (payload: SubmitPayload) =>
    api.post('/library/submissions/', payload).then(r => r.data),
  getMySubmissions: () =>
    api.get('/library/submissions/my/').then(r => r.data),

  // Admin
  getAdminSubmissions: (params?) =>
    api.get('/library/admin/submissions/', { params }).then(r => r.data),
  approveSubmission: (id: number) =>
    api.post(`/library/admin/submissions/${id}/approve`).then(r => r.data),
  rejectSubmission: (id: number, reason: string) =>
    api.post(`/library/admin/submissions/${id}/reject`, { reason }).then(r => r.data),
}
```

---

## Luật đặc biệt cho Agent

```
1. KHÔNG dùng MainLayout cho các trang /library/* (trừ /library/admin/*)
   → Tạo PublicLayout riêng: Header đơn (logo + nút Đăng nhập) + children + Footer

2. /library/admin/* dùng MainLayout bình thường (đã có sidebar, header)
   nhưng thêm guard: chỉ faculty_admin và system_admin truy cập được

3. Khi chưa đăng nhập nhấn "Lưu về cá nhân":
   → Lưu redirect URL vào sessionStorage: 'redirect_after_login'
   → navigate('/login')
   → LoginPage sau khi login thành công: đọc sessionStorage và navigate về đó

4. ContributeModal được trigger từ DocumentContextMenu
   → Thêm item "Đóng góp vào kho học liệu" vào DocumentContextMenu.tsx
   → Chỉ hiện khi người dùng đã đăng nhập

5. Tái sử dụng tối đa:
   - DocumentCard, DocumentRow, DocumentFilterBar, ViewToggle, SearchBar,
     FileIcon, EmptyState, StatCard → dùng nguyên, không sửa
   - FolderCard → học style để tạo FacultyCard, SubjectCard
   - DocumentDetail → học layout để tạo LibraryDocumentDetail
   - DocumentContextMenu → thêm 1 item, không viết lại

6. Không cần auth header cho các GET /library/* (public routes)
   → axios sẽ tự gắn token nếu có, backend chấp nhận cả 2 trường hợp
```