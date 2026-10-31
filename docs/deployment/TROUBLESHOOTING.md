# Cẩm Nang Xử Lý Sự Cố Chuyên Sâu (Deep Dive Troubleshooting & Postmortem Guide)

Tài liệu này ghi lại chi tiết quá trình điều tra, phân tích nguyên nhân gốc rễ (Root Cause Analysis), các phương án giải quyết và mã nguồn khắc phục cho các sự cố 404 nghiêm trọng phát sinh trong quá trình tích hợp Cloudflare R2 Storage.

---

## 1. Sự Cố 1: Lỗi 404 Do Trình Duyệt Gửi Request File Tương Đối Tới Backend

### Hiện trạng lỗi (Symptom)
Sau khi upload tài liệu lên hệ thống, khi mở bản xem trước hoặc click tải file, trình duyệt gửi request:
`GET http://localhost:8000/storage/6/3f18a2bc91.docx`
Backend FastAPI trả về: `404 Not Found`.

### Nguyên nhân gốc rễ (Root Cause)
1. **Ở Backend**: Khi lưu vào cơ sở dữ liệu, trường `file_path` chỉ lưu R2 Key tương đối: `storage/6/3f18a2bc91.docx`. Khi trả về response qua API `GET /documents/`, Backend trả nguyên chuỗi tương đối này.
2. **Ở Frontend**: Các hàm tiện ích tải file ở client tự động nối `API_BASE_URL` (`http://localhost:8000`) vào trước `file_path`. Vì file thực tế đã được đẩy lên Cloudflare R2 (không nằm trên thư mục `storage/` cục bộ của Backend), server FastAPI không tìm thấy file và trả về 404.

### Giải pháp kỹ thuật đã triển khai (Solution)

#### 1. Tự động chuyển đổi tại Pydantic Schema ([`schemas/document.py`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/backend/app/schemas/document.py)):
Thay vì sửa thủ công ở từng router endpoint (dễ bỏ sót), ta sử dụng `@field_validator(..., mode="before")` trong schema `DocumentOut`:

```python
@field_validator("file_path", "thumbnail_path", "markdown_path", mode="before")
@classmethod
def convert_to_public_url(cls, v: Optional[str]) -> Optional[str]:
    if not v:
        return v
    # Bỏ qua các flag đặc biệt như __bundle__
    if isinstance(v, str) and v.startswith("__") and v.endswith("__"):
        return v
    return get_file_url(v)
```

Hàm `get_file_url()` trong [`file_service.py`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/backend/app/services/file_service.py):
```python
def get_file_url(file_key: str | None) -> str | None:
    if not file_key:
        return None
    if file_key.startswith("http://") or file_key.startswith("https://") or file_key.startswith("data:"):
        return file_key
    if settings.MINIO_PUBLIC_URL:
        clean_key = file_key.lstrip('/')
        return f"{settings.MINIO_PUBLIC_URL.rstrip('/')}/{clean_key}"
    return file_key
```

#### 2. Chuẩn hóa Helper Frontend ([`services/api.ts`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/services/api.ts)):
Đảm bảo client không nối đè `API_BASE_URL` nếu URL đã là full URL:
```typescript
export const getFullFileUrl = (filePath: string | null | undefined): string => {
  if (!filePath) return ''
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('data:')
  ) {
    return filePath
  }
  const base = import.meta.env.VITE_R2_PUBLIC_URL || API_BASE_URL
  return `${base.replace(/\/+$/, '')}/${filePath.replace(/^\/+/, '')}`
}
```

---

## 2. Sự Cố 2: Lỗi Xung Đột Chuỗi Ngầm `.r` Trong Domain `.r2.dev` (Subtle String Collision)

> [!CAUTION]
> Đây là lỗi cực kỳ tinh vi, khó phát hiện nhất trong toàn bộ hệ thống!

### Hiện trạng lỗi (Symptom)
- File **PDF** mở xem trước bằng `PdfViewer` $\rightarrow$ **Thành công 100%**.
- File **DOCX** mở xem trước bằng `DocxViewer` $\rightarrow$ **Thành công 100%**.
- Nhưng tất cả các file **PPTX**, **XLSX**, **DOC (cũ)** $\rightarrow$ **Luôn báo lỗi 404 Not Found** ("Tài liệu không có nội dung text").

### Quá trình điều tra & Nguyên nhân cốt lõi (Root Cause)
Kiểm tra component điều phối xem trước [`TabPreview.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentDetail/tabs/TabPreview.tsx):

```typescript
// Đoạn code cũ có bug:
const targetCheck = `${filePath} ${doc.title || ""}`.toLowerCase();
const isCode =
  fileType.startsWith("text/") ||
  CODE_EXTENSIONS.some((ext) => targetCheck.includes(ext)) ||
  targetCheck.includes("dockerfile");
```

Danh sách `CODE_EXTENSIONS` trong [`DocumentDetail.types.ts`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentDetail/DocumentDetail.types.ts) bao gồm:
`[".py", ".js", ".ts", ".cpp", ".c", ".h", ".go", ".rs", ".r", ".m", ...]`

Khi file được lưu trên Cloudflare R2, `filePath` là:
`https://pub-54fbde7f3e0e4376aeebd41d1c0f3d1a.r2.dev/storage/6/test.pptx`

Khi thực hiện `targetCheck.includes(ext)`:
Phần tử **`".r"`** (ngôn ngữ R) xuất hiện bên trong chuỗi **`".r2.dev"`**!
Do đó, biểu thức `CODE_EXTENSIONS.some(...)` **luôn luôn trả về `true` cho MỌI file lưu trên R2!**

Xem xét thứ tự render trong JSX của `TabPreview.tsx`:
1. `isImage`? $\rightarrow$ Sai.
2. `isPdf`? $\rightarrow$ Đúng với PDF (được xử lý trước).
3. `isDocx`? $\rightarrow$ Đúng với DOCX (được xử lý trước).
4. `isCode`? $\rightarrow$ **LUÔN ĐÚNG VỚI MỌI FILE CÒN LẠI!**
5. `isPptx || isXlsx || isLegacyDoc` $\rightarrow$ **KHÔNG BAO GIỜ ĐƯỢC CHẠY ĐẾN!**

Kết quả: Toàn bộ file Slide PowerPoint (`.pptx`), Bảng tính Excel (`.xlsx`) đều bị quẳng vào [`CodeViewer.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/components/shared/documents/DocumentDetail/viewers/CodeViewer.tsx). `CodeViewer` gửi request `GET /documents/{id}/raw` tới Backend để lấy mã nguồn thô $\rightarrow$ Backend kiểm tra thấy file nhị phân không có text $\rightarrow$ Bắn lỗi 404!

### Giải pháp khắc phục triệt để
1. Viết hàm trích xuất phần mở rộng chính quy `getExtension()`, chỉ phân tích phần đuôi của pathname URL hoặc tiêu đề file, bỏ qua query param và domain.
2. Sử dụng `CODE_EXTENSIONS.includes(fileExt)` (so khớp chính xác đuôi file) thay vì tìm kiếm chuỗi con `targetCheck.includes(ext)`.
3. Bổ sung điều kiện loại trừ: `isCode` chỉ được `true` khi file không thuộc các định dạng `image`, `pdf`, `docx`, `legacyDoc`, `pptx`, `xlsx`.

```typescript
// Code sau khi sửa trong TabPreview.tsx:
const getExtension = (pathOrUrl?: string, title?: string): string => {
  const raw = pathOrUrl || "";
  try {
    const url = new URL(raw);
    const pathname = url.pathname;
    const lastDot = pathname.lastIndexOf(".");
    if (lastDot !== -1) return pathname.substring(lastDot).toLowerCase();
  } catch {
    const clean = raw.split("?")[0].split("#")[0];
    const lastDot = clean.lastIndexOf(".");
    if (lastDot !== -1) return clean.substring(lastDot).toLowerCase();
  }
  if (title) {
    const clean = title.split("?")[0].split("#")[0];
    const lastDot = clean.lastIndexOf(".");
    if (lastDot !== -1) return clean.substring(lastDot).toLowerCase();
  }
  return "";
};

const fileExt = getExtension(doc.file_path, doc.title);

const isImage = fileType.startsWith("image/") || [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(fileExt);
const isPdf = fileType === "application/pdf" || fileExt === ".pdf";
const isDocx = fileType.includes("wordprocessingml") || fileExt === ".docx";
const isLegacyDoc = fileType === "application/msword" || fileExt === ".doc";
const isPptx = fileType.includes("presentationml") || fileType.includes("powerpoint") || fileExt === ".pptx" || fileExt === ".ppt";
const isXlsx = fileType.includes("spreadsheetml") || fileType.includes("excel") || fileExt === ".xlsx" || fileExt === ".xls";

// Cô lập hoàn toàn isCode
const isCode =
  !isImage &&
  !isPdf &&
  !isDocx &&
  !isLegacyDoc &&
  !isPptx &&
  !isXlsx &&
  (fileType.startsWith("text/") ||
    CODE_EXTENSIONS.includes(fileExt) ||
    (doc.title || "").toLowerCase().includes("dockerfile"));
```

---

## 3. Sự Cố 3: File Code/Text Báo 404 Do Tác Vụ Nền Ghi Đè Xóa Sạch Database

### Hiện trạng lỗi (Symptom)
Khi upload một file code thật sự (ví dụ `test.py`, `main.cpp`, `README.md`), mở vào `DocumentDetail` thì màn hình báo lỗi:
`404 Not Found: Tài liệu không có nội dung text`.

### Quá trình điều tra (Investigation)
1. Kiểm tra trực tiếp dữ liệu trong PostgreSQL:
   ```sql
   SELECT id, title, file_path, length(content) FROM documents WHERE id = 14;
   -- Kết quả: id=14, title='Test Python File', content='', length=0!
   ```
2. Tại sao `content` lại rỗng trong khi lúc upload người dùng đã gửi file có nội dung?
3. Xem xét luồng chạy trong [`routers/documents.py`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/backend/app/routers/documents.py):
   - Tại `upload_document`: File được đọc thành công và gán vào `content` ban đầu.
   - Sau đó `BackgroundTasks` gọi `_process_document_background(doc.id, doc.file_path, ...)`
   - Trong `_process_document_background`:
     ```python
     content = await loop.run_in_executor(None, extract_text, file_path, mime_type)
     ...
     doc.content = content  # BUG Ở ĐÂY!
     await db.commit()
     ```
   - Hàm `extract_text(file_path)` trong [`file_processor.py`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/backend/app/services/file_processor.py):
     `if not Path(file_path).exists(): return ""`
     Vì `file_path` là key R2 `storage/6/uuid.py`, file vật lý không có trên ổ đĩa backend, nên hàm trả về `""`.
   - Kết quả: `doc.content = ""` **ghi đè xóa sạch dữ liệu vừa tạo trong database!**
4. Khi người dùng mở xem, endpoint `GET /documents/{id}/raw` thấy `doc.content` trống, tìm tiếp ở local disk không thấy $\rightarrow$ raise HTTP 404!

### Giải pháp khắc phục
1. **Trong `_process_document_background`**:
   - Nếu file không có ở local, tự động gọi `download_r2_to_temp_file(file_path)` để tải file về ổ đĩa tạm.
   - **Chỉ cập nhật `doc.content` nếu trích xuất được text mới (`if content and content.strip(): doc.content = content`)**, tuyệt đối không ghi đè chuỗi rỗng lên nội dung sẵn có.
   - Tự động upload ảnh bìa JPEG và Markdown mới sinh lên Cloudflare R2 để đồng bộ.
2. **Trong endpoint `GET /documents/{id}/raw`**:
   - Bổ sung Fallback lớp 2: Nếu `content` trong DB trống, tải file trực tiếp từ Cloudflare R2 bằng `download_file_from_r2(doc.file_path)`.
   - Giải mã UTF-8 và tự động cache ngược lại vào cột `content` trong database.
3. **Ở Frontend (`CodeViewer.tsx`)**:
   - Thêm try-catch fallback: Nếu backend API trả về lỗi, client tự động dùng `fetch(getFullFileUrl(filePath))` tải trực tiếp từ Cloudflare R2 Public CDN.

---

## 4. Sự Cố 4: Lệch Nơi Lưu Trữ (Storage Drift) Khi Upload Hàng Loạt (Batch Upload)

### Hiện trạng lỗi (Symptom)
Upload lẻ 1 file thì xem được, nhưng upload gói tài liệu (Batch Upload từ 2-10 file) thì các file con bên trong bundle khi mở ra đều báo 404.

### Nguyên nhân gốc rễ
- Endpoint `upload_document` (upload lẻ) sử dụng `save_upload_file` đẩy lên R2.
- Endpoint `upload_batch_documents` và `add_files_to_bundle` lại viết mã cũ:
  ```python
  storage_dir = f"storage/personal/{current_user.id}"
  with open(f"{storage_dir}/{unique_name}", "wb") as f:
      f.write(content)
  ```
  File bị ghi vào ổ đĩa local của backend, nhưng Pydantic Schema khi serialize trả về client lại gắn tiền tố domain R2 (`https://pub-xxx.r2.dev/storage/personal/...`)! Trên R2 hoàn toàn không có file này $\rightarrow$ Dẫn đến 404.

### Giải pháp khắc phục
Refactor lại cả `upload_batch_documents`, `add_files_to_bundle` trong [`documents.py`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/backend/app/routers/documents.py) và `upload_group_batch_documents` trong [`groups.py`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/backend/app/routers/groups.py):
Thay toàn bộ việc ghi file cục bộ bằng `await save_upload_file(file, current_user.id)`.

---

## 5. Sự Cố 5: Lỗi Điều Hướng Sai Route Trong `usePersonalDocuments.ts`

### Hiện trạng lỗi (Symptom)
Nhấp vào nút "Xem chi tiết" (icon 3 chấm) của tài liệu cá nhân thì trình duyệt bị chuyển hướng về màn hình `/login` hoặc hiển thị trang trống.

### Nguyên nhân gốc rễ
Tại dòng 103 của [`usePersonalDocuments.ts`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/pages/personal/hooks/usePersonalDocuments.ts):
```typescript
if (action === "view") {
  navigate(`/ca-nhan/tai-lieu/${documentId}`);
}
```
Route `/ca-nhan/tai-lieu/:id` không hề được định nghĩa trong [`App.tsx`](file:///Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project/frontend/digital-library/src/App.tsx) (Route đúng là `/personal/documents/:id`). Khi React Router không tìm thấy route khớp, nó kích hoạt fallback catch-all: `<Route path="*" element={<Navigate to="/login" replace />} />`.

### Giải pháp khắc phục
1. Đổi đích đến trong `usePersonalDocuments.ts` thành `navigate('/personal/documents/${documentId}')`.
2. Bổ sung Route alias redirect trong `App.tsx` để bảo vệ chống gãy link cũ:
   ```typescript
   function LegacyPersonalDocRedirect() {
     const { id } = useParams<{ id: string }>();
     return <Navigate to={`/personal/documents/${id}`} replace />;
   }
   // Trong Routes:
   <Route path="/ca-nhan/tai-lieu/:id" element={<LegacyPersonalDocRedirect />} />
   ```

---

## 6. Sự Cố 6: Nút Toggle Sidebar (Info Icon) & Nút Bản Gốc / Markdown Biến Mất Trong DocumentDetail

### Hiện trạng lỗi (Symptom)
1. Trong giao diện chi tiết tài liệu `DocumentDetail`, nút **Info icon** (dùng để ẩn/hiện bảng thông tin sidebar bên phải) bị biến mất hoàn toàn đối với hầu hết các tài liệu hoặc khi chuyển sang các tab khác (*Nội dung*, *Mô tả*, *Ghi chú*, *Hoạt động*).
2. Nút chuyển đổi giữa **Bản gốc** và **Bản Markdown** cũng không còn hiển thị ngay cả với các tài liệu văn bản.

### Quá trình điều tra & Nguyên nhân gốc rễ (Root Cause)
1. **Lỗi đóng gói điều kiện giao diện trong `DocumentDetail.tsx`**:
   Kiểm tra dòng 178–224 trước khi sửa:
   ```tsx
   <div className="flex items-center gap-2 pb-2">
     {/* BUG: Cả nút Info icon bị nhốt bên trong điều kiện này! */}
     {activeTab === "detail" && markdownDownloadUrl && (
       <div className="flex items-center gap-1">
         <button onClick={() => setViewMode("original")}>Bản gốc</button>
         <button onClick={() => setViewMode("markdown")}>Markdown</button>
         <button onClick={() => setSidebarOpen((v) => !v)} title="Ẩn/Hiện bảng thông tin">
           <Info className="h-4 w-4" />
         </button>
       </div>
     )}
   </div>
   ```
   - Nút `Info` icon (toggle sidebar) bị đặt **bên trong** khối `{activeTab === "detail" && markdownDownloadUrl && (...)}`.
   - Bất cứ khi nào tài liệu không có file Markdown (`markdown_path == null`), giá trị `markdownDownloadUrl` là `null`, dẫn đến toàn bộ khối này không được render $\rightarrow$ **Nút Info icon bị ẩn theo!**
   - Khi người dùng chuyển sang các tab khác ngoài tab `detail` (`activeTab !== "detail"`), khối này cũng không thỏa mãn $\rightarrow$ **Nút Info icon biến mất hoàn toàn!**
2. **Tại sao nút Bản gốc / Markdown cũng mất**:
   - Nút này phụ thuộc vào `markdownDownloadUrl` (tức `doc.markdown_path`).
   - Do sự cố ở tác vụ nền (Sự cố 7 bên dưới), sau khi chuyển sang R2 thì các file upload không sinh được Markdown, khiến `markdown_path` trong Database bị `None`.

### Giải pháp kỹ thuật đã triển khai
1. Tách độc lập nút Info icon ra khỏi điều kiện `markdownDownloadUrl`:
   ```tsx
   <div className="flex items-center gap-2 pb-2">
     {/* Nút chuyển đổi Bản gốc / Markdown: chỉ hiện ở tab "detail" và khi có markdownDownloadUrl */}
     {activeTab === "detail" && markdownDownloadUrl && (
       <div className="flex items-center gap-1">
         <button onClick={() => setViewMode("original")}>Bản gốc</button>
         <button onClick={() => setViewMode("markdown")}>Markdown</button>
       </div>
     )}

     {/* Nút toggle ẩn/hiện bảng thông tin sidebar: LUÔN LUÔN HIỂN THỊ TRÊN MỌI TAB */}
     <button
       type="button"
       onClick={() => setSidebarOpen((v) => !v)}
       className={cn(
         "shrink-0 inline-flex items-center justify-center p-1.5 rounded-md border transition-all shadow-2xs",
         sidebarOpen
           ? "border-primary-200 bg-primary-50 text-primary-600 hover:bg-primary-100"
           : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900"
       )}
       title={sidebarOpen ? "Ẩn bảng thông tin" : "Hiện bảng thông tin"}
     >
       <Info className="h-4 w-4" />
     </button>
   </div>
   ```

---

## 7. Sự Cố 7: Mất Chức Năng Tự Động Cài Ảnh Bìa (Thumbnail) & Sinh Markdown Khi Upload Lên Cloudflare R2

### Hiện trạng lỗi (Symptom)
- Ở nhánh `main` trước đây: Khi người dùng upload file PDF hoặc tài liệu văn bản, hệ thống tự động tạo ảnh bìa thumbnail (chụp trang đầu PDF) và tự sinh bản xem trước Markdown (`storage/markdowns/{id}.md`).
- Sau khi chuyển sang Cloudflare R2 trên nhánh `produc`: Upload xong thì tài liệu hoàn toàn không có ảnh bìa (`thumbnail_path = None`) và không có bản Markdown (`markdown_path = None`).

### Nguyên nhân gốc rễ (Root Cause)
1. **Mất file trên đĩa cục bộ**:
   Khi chuyển sang R2, hàm `save_upload_file` đẩy trực tiếp byte stream lên Cloudflare R2 qua `s3_client.put_object` và không lưu file vào thư mục `storage/` cục bộ nữa.
2. **Tiến trình chạy ngầm `_process_document_background` bị gãy**:
   - `_process_document_background` nhận `file_path = "storage/6/uuid.pdf"` và truyền trực tiếp vào `create_thumbnail(file_path)` và `generate_markdown(file_path)`.
   - Cả hai hàm trên đều kiểm tra `if not Path(file_path).exists(): return None`.
   - Do file không tồn tại trên ổ đĩa backend, các hàm này âm thầm trả về `None`, không sinh ra thumbnail và markdown.
3. **Lỗi thiếu tham số trong `create_thumbnail`**:
   Trong `file_processor.py`, `group = get_file_group(mime_type)` chỉ kiểm tra `mime_type` mà không truyền `file_path`. Khi client gửi MIME generic như `application/octet-stream` hoặc rỗng, hệ thống không nhận diện được file `.pdf` qua extension.
4. **Endpoint cập nhật ảnh bìa nhóm `update_group_document_thumbnail`**:
   Chứa đoạn code cũ `if not os.path.exists(document.file_path): raise HTTPException(404)`, khiến tính năng đổi ảnh bìa PDF nhóm luôn báo lỗi 404 khi lưu trên R2.

### Giải pháp kỹ thuật đã triển khai
1. **Bộ đệm tải tạm On-Demand trong tác vụ nền (`_process_document_background`)**:
   - Kiểm tra nếu file không có ở local disk, tự động gọi `download_r2_to_temp_file(file_path, suffix=suffix)` để tải file về thư mục đệm `storage/temp/`.
   - Truyền đường dẫn file đệm này vào `extract_text`, `create_thumbnail` và `generate_markdown`.
   - Sau khi tạo xong file ảnh bìa `.jpg` và markdown `.md`, tự động gọi `upload_bytes_to_r2` đẩy lên Cloudflare R2 và lưu đường dẫn vào database.
   - Thêm khối `finally` tự động xóa file đệm temp sau khi hoàn tất để giải phóng ổ cứng.
2. **Sửa `create_thumbnail` trong `file_processor.py`**:
   Truyền `group = get_file_group(mime_type, file_path)` để nhận diện đúng extension.
3. **Cập nhật `update_group_document_thumbnail` trong `groups.py`**:
   Hỗ trợ tải tạm file từ R2 và upload ảnh bìa mới lên R2 tương tự endpoint tài liệu cá nhân.
4. **Chạy script di chuyển & tái tạo dữ liệu (Data Reprocessing)**:
   Quét toàn bộ các tài liệu hiện có trong Database bị thiếu ảnh bìa hoặc markdown do sự cố trước đó, tự động tải từ R2 về và tái tạo ảnh bìa + markdown thành công 100%.

---

## 8. Bảng Tổng Hợp Kiểm Thử & Lệnh Xác Minh (Verification Cheatsheet)

| Kịch bản kiểm thử | Lệnh / Thao tác kiểm tra | Kết quả mong đợi |
| :--- | :--- | :--- |
| **Kiểm tra đọc file Text từ R2** | `curl -H "Authorization: Bearer <token>" http://localhost:8000/documents/14/raw` | `200 OK`, trả về nội dung `print("hello world")` |
| **Kiểm tra Public URL PPTX** | `curl -I https://pub-54fbde7f3e0e4376aeebd41d1c0f3d1a.r2.dev/storage/6/1e5d0443...pptx` | `200 OK`, `Content-Type: presentationml.presentation` |
| **Kiểm tra Public URL XLSX** | `curl -I https://pub-54fbde7f3e0e4376aeebd41d1c0f3d1a.r2.dev/storage/6/66adf1c9...xlsx` | `200 OK`, `Content-Type: spreadsheetml.sheet` |
| **Kiểm tra Thumbnail PDF trên R2** | `curl -I https://pub-54fbde7f3e0e4376aeebd41d1c0f3d1a.r2.dev/storage/thumbnails/6.jpg` | `200 OK`, `Content-Type: image/jpeg` |
| **Kiểm tra Nút Info Sidebar** | Mở bất kỳ tài liệu nào ở mọi tab trong `DocumentDetail` | Nút Info icon luôn hiển thị ở góc phải tab bar |
| **Kiểm tra Frontend Build** | `cd frontend/digital-library && npm run build` | Build hoàn tất thành công, không lỗi TypeScript |
| **Kiểm tra CORS Bucket** | `curl -I -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET" https://pub-54fbde7f3e0e4376aeebd41d1c0f3d1a.r2.dev/...` | Có header `Access-Control-Allow-Origin: *` |
