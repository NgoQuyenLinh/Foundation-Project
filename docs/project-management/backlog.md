# 📋 Danh Sách Cải Tiến & Tối Ưu Trải Nghiệm (Backlog & Improvements)

> **Mô tả:** Tài liệu ghi nhận các hạn chế hiện tại về mặt giao diện (UI), trải nghiệm người dùng (UX) và tính năng cần nâng cấp/tái cấu trúc.  
> **Trạng thái:** Chờ xử lý / Đang phân tích yêu cầu.

---

## 📌 Tổng Hợp Các Hạng Mục Cần Cải Thiện

| STT | Vấn đề / Hạng mục | Vị trí liên quan trong Source Code | Tham khảo / Đề xuất giải pháp | Mức độ ưu tiên |
| :---: | :--- | :--- | :--- | :---: |
| **01** | Thao tác và UX quản lý Bundle phức tạp | `frontend/.../personal/BundleDetailPage.tsx`<br>`frontend/.../components/shared/AddToBundleModal.tsx` | Tối giản flow thao tác, giảm số bước click khi quản lý | Cao |
| **02** | UI của `DocumentCard` chưa tối ưu | `frontend/.../components/shared/DocumentCard.tsx`<br>`frontend/.../group/components/GroupDocumentCard.tsx` | Tham khảo Notion, Google Drive, OneDrive | Trung bình |
| **03** | Thiếu chế độ hiển thị nâng cao cho danh sách tài liệu | `frontend/.../components/shared/DocumentListView.tsx`<br>`frontend/.../components/shared/ViewToggle.tsx` | Bổ sung giao diện Metadata/Table view lấy cảm hứng từ **Paperless-ngx** | Trung bình |
| **04** | Tương tác Bundle/Folder chưa trực quan (thiếu Drag & Drop) | `frontend/.../components/shared/FolderCard.tsx`<br>`frontend/.../personal/components/PersonalFoldersSection.tsx` | Hỗ trợ kéo - thả (Drag and Drop) như Windows Explorer | Cao |
| **05** | Thiếu tính năng tìm kiếm tài liệu cục bộ trong Bundle | `frontend/.../pages/personal/BundleDetailPage.tsx`<br>`backend/app/services/search_service.py` | Bổ sung thanh tìm kiếm lọc theo tên tài liệu scoped theo Bundle/Folder | Cao |
| **06** | Thông tin nhóm còn hạn chế, thiếu tuỳ biến ảnh bìa & thông báo | `frontend/.../pages/group/GroupSpace.tsx`<br>`frontend/.../pages/group/components/SettingsTab.tsx` | Tham khảo bố cục Channel/Group của **Telegram**, **Zalo** | Trung bình |
| **07** | `FacultyCard` tại Thư viện cộng đồng chưa tạo sự khác biệt | `frontend/.../components/library/FacultyCard.tsx`<br>`frontend/.../pages/library/LibraryFaculty.tsx` | Tham khảo giao diện phân cấp môn học/khoa của **Studocu** | Trung bình |

---

## 📝 Chi Tiết Từng Vấn Đề

### 1. Tối Ưu Hóa Tương Tác & Thao Tác Với Bundle
* **Hiện trạng:**
  * Việc tương tác và quản lý tài liệu trong một bundle còn nhiều thao tác rườm rà.
  * Quy trình thêm, xoá hoặc chuyển bundle qua modal (`AddToBundleModal.tsx`) chưa trực quan, đòi hỏi nhiều bước xác nhận không cần thiết.
* **Yêu cầu cải tiến:**
  * Thiết kế lại các hành động nhanh (Quick Actions): ghim, đổi tên, phân loại ngay trên thanh công cụ hoặc menu ngữ cảnh (`FolderContextMenu.tsx`).
  * Tinh giản số bước khi nhóm nhiều tài liệu vào một Bundle.

---

### 2. Nâng Cấp Giao Diện `DocumentCard`
* **Hiện trạng:**
  * Card hiển thị thông tin ở mức cơ bản (tên, định dạng, ngày cập nhật), chưa tạo được phân cấp thị giác rõ ràng và chưa làm nổi bật metadata quan trọng.
* **Yêu cầu cải tiến:**
  * Tham khảo UI từ các hệ thống quản lý tài liệu hiện đại (Google Drive, Notion, Dropbox).
  * Bổ sung preview thumbnail/ảnh bìa file tài liệu rõ nét hơn.
  * Hiển thị trực quan trạng thái tài liệu, quyền truy cập (`PermissionBadge.tsx`), dung lượng và tags.

---

### 3. Bổ Sung Chế Độ Xem Tài Liệu Phong Cách **Paperless-ngx**
* **Hiện trạng:**
  * Hệ thống hiện chỉ hỗ trợ chuyển đổi giữa dạng thẻ (Grid/Card) và dạng danh sách cơ bản (List) thông qua `ViewToggle.tsx`.
* **Yêu cầu cải tiến:**
  * Tham khảo phong cách quản lý của **Paperless-ngx**:
    * **Chế độ bảng chi tiết (Detailed Table View):** Hiển thị đầy đủ thông tin metadata (Tags màu sắc, ngày quét/tải lên, kích thước, định dạng, số lượt tải/đánh giá).
    * **Chế độ xem phân đôi (Split/Preview Layout):** Click vào item bên trái sẽ xem trước nhanh tài liệu (Quick Preview) và metadata bên phải mà không cần điều hướng sang trang chi tiết.

---

### 4. Tương Tác Kéo - Thả Giống Windows Explorer Cho Bundle / Folder
* **Hiện trạng:**
  * Bundle đang hoạt động tương tự như một Folder nhưng chưa có trải nghiệm thao tác tự nhiên. Người dùng phải mở modal chọn thư mục đích thay vì thao tác trực tiếp.
* **Yêu cầu cải tiến:**
  * Tích hợp cơ chế **Kéo & Thả (Drag and Drop)**:
    * Kéo một hoặc nhiều file tài liệu thả trực tiếp vào thẻ Folder/Bundle.
    * Kéo tài liệu ra ngoài để bỏ gán khỏi Bundle.
    * Kéo file từ máy tính thả thẳng vào Bundle để upload tự động.
  * Cung cấp hiệu ứng kéo thả mượt mà (dùng các thư viện như `@dnd-kit` hoặc `react-dropzone`).

---

### 5. Tìm Kiếm Scoped Tên Tài Liệu Trong Bundle
* **Hiện trạng:**
  * Thanh tìm kiếm hiện tại chủ yếu phục vụ tìm kiếm toàn cục (`search_service.py`, `SearchPage.tsx`).
  * Khi đang ở bên trong `BundleDetailPage.tsx`, người dùng chưa có ô tìm kiếm để lọc nhanh các tài liệu chỉ thuộc Bundle đó.
* **Yêu cầu cải tiến:**
  * Thêm ô tìm kiếm tức thì (Instant In-Bundle Filter) tại đầu trang `BundleDetailPage.tsx`.
  * Hỗ trợ tìm kiếm theo: Tiêu đề tài liệu, định dạng file (`.pdf`, `.docx`,...), và tag gắn kèm.

---

### 6. Mở Rộng Tính Năng Không Gian Nhóm (Group Space)
* **Hiện trạng:**
  * `GroupSpace.tsx` hiện hiển thị thông tin còn đơn điệu, thiếu dấu ấn của một không gian làm việc nhóm năng động.
  * Chưa có tính năng cá nhân hóa nhận diện nhóm (ảnh bìa/cover photo).
  * Cơ chế thông báo sự kiện trong nhóm chưa rõ ràng.
* **Yêu cầu cải tiến:**
  * **Tham khảo trải nghiệm Telegram / Zalo:**
    * Cho phép trưởng nhóm/quản trị viên cập nhật **Ảnh bìa (Cover Image)** và **Avatar nhóm**.
    * Bổ sung mục **Ghim thông báo quan trọng (Pinned Announcements)** ở đầu không gian nhóm.
    * Tích hợp widget tóm tắt hoạt động gần đây (Recent Activities / Feed) thay vì chỉ liệt kê danh sách tab.

---

### 7. Tái Thiết Kế `FacultyCard` & Thư Viện Cộng Đồng Theo Phong Cách **Studocu**
* **Hiện trạng:**
  * Thẻ Khoa (`FacultyCard.tsx`) tại `LibraryFaculty.tsx` chưa tạo được điểm nhấn khác biệt với các loại thẻ danh mục khác.
  * Thông tin khóa học, môn học và số lượng tài nguyên học tập chưa được tổ chức hấp dẫn.
* **Yêu cầu cải tiến:**
  * **Học hỏi mô hình phân cấp của Studocu:**
    * Thẻ Khoa/Trường cần hiển thị số lượng tài liệu hiện có, các môn học nổi bật (Trending/Popular Subjects), và số lượng sinh viên tham gia đóng góp.
    * Thêm biểu tượng/bộ nhận diện đặc trưng cho từng khối ngành/khoa.
    * Cải tiến trang chi tiết môn học (`LibrarySubject.tsx`) để phân chia rõ: Đề thi cũ, bài giảng tóm tắt, giáo trình và bài tập mẫu.

---

## 📌 Bổ Sung Các Hạng Mục Cần Cải Thiện (Đợt 2)

| STT | Vấn đề / Hạng mục | Vị trí liên quan trong Source Code | Tham khảo / Đề xuất giải pháp | Mức độ ưu tiên |
| :---: | :--- | :--- | :--- | :---: |
| **08** | Bổ sung chức năng "Sửa" trong `DocumentContextMenu`, gộp thao tác "Đổi tên" vào đó | `frontend/.../components/shared/DocumentContextMenu.tsx`<br>`frontend/.../components/shared/UploadDocumentModal.tsx` | Tái sử dụng UI form upload, cho phép chỉnh sửa tên, tags, mô tả,... | Cao |
| **09** | Bundle thiếu chức năng lọc & tìm kiếm cục bộ | `frontend/.../pages/personal/BundleDetailPage.tsx`<br>`frontend/.../components/shared/DocumentSection.tsx` | Đồng bộ UX với `DocumentSection`: filter theo tag, loại file, trạng thái + search box | Cao |
| **10** | `DocumentCard` chưa hiển thị nội dung tóm tắt tài liệu | `frontend/.../components/shared/DocumentCard.tsx` | Hiển thị vài dòng đầu (preview text) hoặc tích hợp model tóm tắt (AI/LLM) — tham khảo Studocu | Trung bình |
| **11** | Thiếu thông tin số trang tài liệu | `frontend/.../components/shared/DocumentCard.tsx`<br>`frontend/.../components/shared/DocumentListView.tsx`<br>`backend/app/services/document_service.py` | Bổ sung trường `page_count` vào metadata và hiển thị trên Card/List | Trung bình |
| **12** | Thiếu chế độ hiển thị kết hợp Card + List (Hybrid View) làm mặc định | `frontend/.../components/shared/ViewToggle.tsx`<br>`frontend/.../components/shared/DocumentListView.tsx`<br>`frontend/.../components/shared/DocumentCard.tsx` | Tham khảo Studocu: layout kết hợp thumbnail + metadata dạng bảng gọn, đặt làm default view | Cao |

---

## 📝 Chi Tiết Từng Vấn Đề (Bổ Sung)

### 8. Gộp Chức Năng "Đổi Tên" Vào "Sửa" Trong `DocumentContextMenu`

* **Hiện trạng:**
  * `DocumentContextMenu.tsx` hiện có riêng mục **"Đổi tên"** (Rename) chỉ cho phép sửa duy nhất trường tên tài liệu.
  * Muốn sửa tags, mô tả, hoặc metadata khác thì người dùng phải vào trang chi tiết — trải nghiệm phân mảnh, thiếu nhất quán.
* **Yêu cầu cải tiến:**
  * **Thay thế** mục "Đổi tên" bằng mục **"Sửa" (Edit / Chỉnh sửa thông tin)**.
  * Khi click "Sửa", mở modal có **giao diện tương đồng với form Upload** (`UploadDocumentModal.tsx`) nhưng ở chế độ edit:
    * Cho phép chỉnh sửa: **Tên tài liệu, Mô tả, Tags, Quyền truy cập, Danh mục/Bundle, Môn học liên quan,...**
    * Hiển thị preview file hiện tại (nếu có).
    * Nút hành động: **"Lưu thay đổi"** / **"Huỷ"**.
  * Có thể tách component dùng chung `DocumentFormModal.tsx` với prop `mode: "create" | "edit"` để tái sử dụng UI và logic validate.
  * Loại bỏ hoàn toàn action "Đổi tên" riêng lẻ để tránh trùng lặp chức năng.

---

### 9. Bổ Sung Lọc & Tìm Kiếm Trong Bundle (Đồng Bộ UX Với `DocumentSection`)

* **Hiện trạng:**
  * Trong `BundleDetailPage.tsx`, danh sách tài liệu chỉ hiển thị thô, không có công cụ lọc hay tìm kiếm cục bộ.
  * Trong khi đó, `DocumentSection.tsx` đã có bộ công cụ filter/search hoàn chỉnh — tạo sự **bất nhất quán về UX** giữa hai khu vực.
* **Yêu cầu cải tiến:**
  * **Tái sử dụng component filter/search** từ `DocumentSection.tsx` (hoặc trích xuất thành `DocumentFilterBar.tsx` dùng chung) và nhúng vào đầu `BundleDetailPage.tsx`.
  * Hỗ trợ các tiêu chí lọc:
    * **Tìm kiếm tức thì** theo tên tài liệu (debounce input).
    * **Lọc theo tag** (multi-select).
    * **Lọc theo loại file** (`.pdf`, `.docx`, `.pptx`,...).
    * **Lọc theo trạng thái** (đã xem / chưa xem, public / private, có ghim / không).
    * **Sắp xếp** theo: ngày cập nhật, tên A→Z, dung lượng, số lượt xem.
  * Hiển thị **số lượng kết quả** sau khi lọc và nút **"Xoá bộ lọc"** nhanh.
  * **Kết hợp với hạng mục #05** (tìm kiếm scoped trong Bundle) để thống nhất một giải pháp duy nhất.

---

### 10. Hiển Thị Nội Dung Tóm Tắt Trên `DocumentCard`

* **Hiện trạng:**
  * `DocumentCard.tsx` chỉ hiển thị tên, định dạng, ngày cập nhật — người dùng phải mở tài liệu mới biết nội dung nói về gì.
  * Không có preview text hay abstract, gây khó khăn khi duyệt nhiều tài liệu cùng lúc.
* **Yêu cầu cải tiến:**
  * Bổ sung vùng **"Nội dung xem trước"** trên Card với 2 phương án (có thể kết hợp):
    1. **Trích xuất vài dòng đầu** (first N lines / đoạn mở đầu) từ nội dung tài liệu đã được index ở backend.
    2. **Tích hợp model tóm tắt nội dung (AI Summary)** — sinh đoạn tóm tắt 2–3 câu cho mỗi tài liệu:
       * Có thể dùng LLM (OpenAI, Gemini, hoặc model self-hosted) chạy **background job** một lần khi upload và cache lại kết quả.
       * Lưu trường `summary` trong DB để không phải tóm tắt lại mỗi lần render.
  * **Tham khảo Studocu:** hiển thị đoạn preview text dưới tiêu đề, giới hạn ~2-3 dòng với dấu `...`, có tooltip hoặc expand để xem đầy đủ.
  * Cho phép người dùng **bật/tắt hiển thị preview** trong cài đặt view (tránh rối mắt với người chỉ muốn xem dạng lưới gọn).

---

### 11. Hiển Thị Số Trang Tài Liệu Trên `DocumentCard` & `DocumentListView`

* **Hiện trạng:**
  * Metadata tài liệu chưa có trường `page_count`, hoặc có nhưng chưa được hiển thị ở UI.
  * Người dùng không biết tài liệu dài/ngắn trước khi mở — gây mất thời gian.
* **Yêu cầu cải tiến:**
  * **Backend:**
    * Bổ sung bước **trích xuất số trang** khi upload/index tài liệu (dùng `PyPDF2`, `pdfplumber`, `python-docx`, `python-pptx` tuỳ định dạng).
    * Lưu vào trường `page_count` trong bảng `documents` (hoặc metadata JSON).
    * Với file không xác định được số trang (ảnh, txt,...) → để `null` và ẩn ở UI.
  * **Frontend:**
    * Hiển thị số trang trên `DocumentCard.tsx` (ví dụ: icon 📄 + `"12 trang"` cạnh dung lượng / ngày cập nhật).
    * Hiển thị cột **"Số trang"** trong `DocumentListView.tsx` (dạng table).
    * Thêm vào tiêu chí **sắp xếp** theo số trang (tuỳ chọn).

---

### 12. Chế Độ Hiển Thị Kết Hợp Card + List (Hybrid View) — Đặt Làm Mặc Định

* **Hiện trạng:**
  * `ViewToggle.tsx` hiện chỉ có 2 chế độ: **Grid (Card)** và **List** — mỗi chế độ có trade-off riêng:
    * Card: đẹp, có thumbnail, nhưng chiếm nhiều không gian, khó so sánh metadata.
    * List: gọn, dễ so sánh, nhưng thiếu trực quan, không có preview.
  * Người dùng phải chuyển đổi qua lại liên tục giữa 2 chế độ.
* **Yêu cầu cải tiến:**
  * **Thiết kế chế độ Hybrid View** — layout kết hợp ưu điểm cả hai:
    * **Cột trái:** thumbnail nhỏ (vuông hoặc chữ nhật) + icon định dạng.
    * **Cột giữa:** tiêu đề + đoạn preview text (từ hạng mục #10) + tags.
    * **Cột phải:** metadata gọn theo hàng dọc hoặc hàng ngang: số trang, dung lượng, ngày cập nhật, lượt xem, quyền truy cập.
    * **Hover:** hiện quick actions (ghim, sửa, tải, chia sẻ,...).
  * **Tham khảo Studocu:** layout danh sách tài liệu kết hợp thumbnail + tiêu đề + mô tả + metadata dạng cột, rất dễ scan thông tin.
  * **Đặt Hybrid View làm chế độ mặc định** cho `DocumentListView` / `DocumentSection` / `BundleDetailPage`.
  * Cập nhật `ViewToggle.tsx` để có **3 chế độ**: `Hybrid` (mặc định) | `Grid` | `List`.
  * Lưu lựa chọn view của người dùng vào **localStorage / user preferences** để giữ nguyên khi quay lại.

---

## 🗂️ Ghi Chú & Đề Xuất Chung

* **Tái sử dụng component:** Nên trích xuất các component dùng chung như `DocumentFormModal`, `DocumentFilterBar`, `DocumentMetadataRow` để tránh lặp code giữa các trang (Bundle, DocumentSection, Library,...).
* **Cập nhật schema DB:** Các hạng mục #10 (summary) và #11 (page_count) yêu cầu thay đổi schema — cần tạo **migration script** và backfill dữ liệu cho tài liệu cũ.
* **Đồng bộ UX:** Các hạng mục #05 và #09 nên được triển khai **cùng lúc** để thống nhất trải nghiệm tìm kiếm/lọc trên toàn hệ thống.
* **Hiệu năng:** Với chế độ Hybrid View + preview text + summary, cần chú ý **lazy load** và **virtualized list** khi số lượng tài liệu lớn (dùng `react-window` hoặc `@tanstack/react-virtual`).
* **Thứ tự ưu tiên đề xuất triển khai:**
  1. #12 (Hybrid View mặc định) — ảnh hưởng trực tiếp đến trải nghiệm chung.
  2. #08 (Gộp "Sửa" vào Context Menu) + #09 (Filter/Search trong Bundle).
  3. #11 (Số trang) — dễ triển khai, giá trị cao.
  4. #10 (Preview/Summary nội dung) — cần đầu tư backend/AI nhiều hơn.