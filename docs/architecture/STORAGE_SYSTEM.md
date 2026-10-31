# KIẾN TRÚC HỆ THỐNG LƯU TRỮ FILE, CƠ CHẾ KIỂM TRA TRÙNG LẶP VÀ VÒNG ĐỜI TÀI LIỆU (DIGITAL LIBRARY)

> **Phân loại thông tin kỹ thuật trong tài liệu:**
> - **[Đang triển khai]**: Tính năng, logic và cấu trúc đã được kiểm chứng trực tiếp từ mã nguồn thực tế của dự án.
> - **[Nhận định kỹ thuật]**: Phân tích chuyên sâu về cơ sở lý thuyết, ưu nhược điểm, đánh đổi kỹ thuật (trade-offs) và rủi ro tiềm ẩn của thiết kế hiện tại.
> - **[Đề xuất tương lai]**: Các giải pháp nâng cấp kiến trúc (như Content-Addressed Storage, Chunk Streaming, 2PC) chưa được cài đặt trong mã nguồn hiện hành.

---

## MỤC LỤC TỔNG QUAN

1. **Phần I: Nền tảng lý thuyết về lưu trữ file và hệ thống tệp**
   - 1.1. Bản chất của file ở góc độ hệ điều hành
   - 1.2. File vật lý và Metadata: Vì sao phải phân tách?
   - 1.3. Cơ sở dữ liệu quan hệ (RDBMS) và bài toán lưu trữ nhị phân (BLOB vs Filesystem)
   - 1.4. Phân tích Local Filesystem so với Object Storage (S3-compatible)
   - 1.5. Phân định các môi trường: Client, Backend Server, Filesystem và Database
2. **Phần II: Mã băm (Checksum) và Thuật toán mật mã học SHA-256**
   - 2.1. Khái niệm Checksum, Hash Function và Digest
   - 2.2. Vì sao tên file, phần mở rộng và kích thước không đủ để xác định file trùng?
   - 2.3. Cấu tạo và nguyên lý toán học của thuật toán SHA-256
   - 2.4. Tiêu chí lựa chọn SHA-256 cho hệ thống Digital Library
   - 2.5. Hai mô hình tính toán SHA-256 trong Python (RAM In-Memory vs Stream Chunking)
3. **Phần III: Phân tích bộ nhớ RAM, hiệu năng và khả năng mở rộng**
   - 3.1. Phân tích vòng đời dữ liệu upload trong bộ nhớ đệm
   - 3.2. Mô hình toán học ước lượng thời gian xử lý (Latency Modeling)
   - 3.3. Phân tích dung lượng RAM tiêu thụ và rủi ro tải đồng thời (Concurrency Impact)
   - 3.4. Đánh giá tính hợp lý và các giới hạn kích thước file hiện tại
4. **Phần IV: Cơ chế kiểm tra trùng lặp (Deduplication Logic)**
   - 4.1. Bản chất của Deduplication: Phát hiện trùng lặp vs Lưu trữ khử trùng lặp
   - 4.2. Luồng thực thi kiểm tra trùng lặp từ Endpoint đến Database và Storage
   - 4.3. Kiểm tra trùng lặp trong Kho tài liệu cá nhân (Personal Space)
   - 4.4. Kiểm tra trùng lặp trong Không gian nhóm (Group Workspace)
   - 4.5. Cơ chế Upload theo gói (Batch Upload) và Cấu trúc Bundle
   - 4.6. Bảng kịch bản thực nghiệm đối chiếu ma trận Deduplication
5. **Phần V: Cơ chế ghi file vật lý và tính nhất quán với PostgreSQL**
   - 5.1. Quy trình sinh tên an toàn và ghi file xuống đĩa cứng
   - 5.2. Mối quan hệ bất đối xứng giữa Local Filesystem và PostgreSQL Transaction
   - 5.3. Xử lý sự cố lệch pha và cơ chế bù trừ (Compensating Actions)
6. **Phần VI: Cấu trúc phân vùng thư mục Storage thực tế**
   - 6.1. Bảng quy chuẩn các Pattern đường dẫn trên hệ thống tệp
   - 6.2. Cơ chế phục vụ file tĩnh và ánh xạ URL (Static Mounting)
7. **Phần VII: Vòng đời tài liệu: Xóa mềm, Khôi phục và Dọn rác tự động**
   - 7.1. Phân biệt Xóa mềm (Soft Delete) và Xóa vĩnh viễn (Hard Purge)
   - 7.2. Tiến trình khôi phục tài liệu (Restore Workflow)
   - 7.3. Tác vụ định kỳ quét rác nền (APScheduler Background Jobs)
8. **Phần VIII: Danh mục và giải thích chi tiết các hàm cốt lõi**
   - 8.1. Bảng tra cứu các hàm xử lý lưu trữ
   - 8.2. Giải phẫu chi tiết từng hàm nghiệp vụ trọng yếu
9. **Phần IX: Đánh giá tổng thể kiến trúc và Định hướng phát triển**
   - 9.1. Các ưu điểm nổi bật của thiết kế hiện tại
   - 9.2. Ma trận rủi ro kỹ thuật và biện pháp khắc phục
   - 9.3. Kiến trúc mục tiêu: Content-Addressed Storage (CAS) hoàn chỉnh
10. **Phần X: Bộ 25 câu hỏi - đáp chuyên sâu phục vụ bảo vệ đồ án tốt nghiệp**
11. **Phần XI: Thuật ngữ chuyên ngành và Tài liệu tham khảo**

---

# PHẦN I: NỀN TẢNG LÝ THUYẾT VỀ LƯU TRỮ FILE VÀ HỆ THỐNG TỆP

## 1. Bản chất của file ở góc độ hệ điều hành

Ở mức độ trừu tượng thấp nhất của hệ điều hành (Operating System - OS), một **file (tệp tin)** không phải là một đối tượng trực quan có biểu tượng hay tên gọi, mà là **một chuỗi tuyến tính các byte dữ liệu nhị phân (stream of bytes)** được ghi lại trên các khối vật lý (blocks/sectors) của thiết bị lưu trữ thứ cấp (HDD, SSD, NVMe).

Hệ điều hành giao tiếp với phần cứng lưu trữ thông qua **Filesystem (hệ thống tệp)** (ví dụ: ext4 trên Linux, APFS trên macOS, NTFS trên Windows). Filesystem quản lý cấu trúc dữ liệu gồm hai thành phần tách biệt hoàn toàn:
1. **Dữ liệu thực tế (Data Blocks)**: Nơi chứa nội dung nhị phân thô của file.
2. **Cấu trúc quản lý (Inodes / File Allocation Table)**: Nơi lưu trữ vị trí của các Data Blocks trên đĩa cứng, quyền truy cập (permissions), kích thước file, thời gian tạo/sửa đổi.

```
+-------------------------------------------------------------------------+
|                              FILESYSTEM                                 |
|                                                                         |
|  [ Inode / File Record ]                    [ Data Blocks on Disk ]     |
|  - Inode Number: 1048576                     Block #45020: 0x25 0x50... |
|  - File Size: 2,450,112 bytes                Block #45021: 0x44 0x46... |
|  - Permissions: -rw-r--r--                   Block #45022: 0x2D 0x31... |
|  - Pointers: [Block 45020, 45021, ...]                                  |
+-------------------------------------------------------------------------+
```

## 2. File vật lý và Metadata: Vì sao phải phân tách?

Một sai lầm phổ biến khi mới tiếp cận kỹ thuật phần mềm là đồng nhất "file" với "tên file". Trên thực tế, hệ thống phân biệt rạch ròi giữa **Nội dung vật lý (Physical Payload)** và **Siêu dữ liệu (Metadata)**:

- **Nội dung file vật lý (Physical Payload)**: Là chuỗi byte xác định ý nghĩa nội dung của file (ví dụ: các cấu trúc đối tượng PDF, mã nguồn văn bản, ma trận pixel ảnh JPEG). Nội dung này mang tính độc lập hoàn toàn với ngữ cảnh ai là người sở hữu nó trên ứng dụng.
- **Siêu dữ liệu (Metadata)**: Là thông tin mô tả ngữ cảnh của file trong hệ thống ứng dụng, bao gồm: tiêu đề hiển thị cho người dùng, mô tả, định dạng MIME type, người sở hữu (User ID), phòng ban/nhóm làm việc (Workspace ID), thẻ phân loại (Tags), trạng thái xóa (Soft Delete), và dấu vân tay nhận diện nội dung (Checksum).

### Bảng minh chứng: Phân tích tài liệu `DeCuong.pdf` trong Digital Library **[Đang triển khai]**

Để hiểu sự phân tách này trong dự án Digital Library, hãy xem xét một tài liệu thực tế được tải lên hệ thống:

| Khái niệm kỹ thuật | Giá trị thực tế trong hệ thống | Nơi lưu trữ / Quản lý | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **Tên hiển thị (Display Title)** | `DeCuong.pdf` | Bột `title` (PostgreSQL `documents`) | Tên thân thiện hiển thị trên giao diện người dùng. Người dùng có thể đổi tên thành `DeCuong_ChinhSua.pdf` mà không làm thay đổi file trên ổ đĩa. |
| **Đường dẫn vật lý (File Path)** | `storage/14/7c9a12b4e8...pdf` | Cột `file_path` (PostgreSQL) + Local Disk | Tọa độ chính xác của file nhị phân trên đĩa cứng server. Tên file vật lý được tạo ngẫu nhiên bằng UUID để chống trùng lặp và tấn công bảo mật. |
| **Định danh cơ sở dữ liệu** | `id = 105` (Integer) | Khóa chính Primary Key (PostgreSQL) | Định danh duy nhất để liên kết khóa ngoại với bảng tags, download_logs, favorites. |
| **Kích thước file (File Size)** | `2,450,112` bytes (~2.33 MB) | Cột `file_size` (BigInteger) | Phục vụ hiển thị giao diện và thống kê dung lượng lưu trữ. |
| **Định dạng MIME** | `application/pdf` | Cột `file_type` (String) | Giúp trình duyệt nhận biết cách render file (mở PDF Viewer thay vì tải file thô). |
| **Dấu vân tay nội dung (Checksum)** | `e3b0c44298fc1c149afbf...` | Cột `checksum` (String 64 ký tự SHA-256) | Đại diện cho chuỗi byte nhị phân của file. Dùng để phát hiện trùng lặp tuyệt đối. |
| **Ngữ cảnh sở hữu** | `owner_id = 14`, `workspace_id = NULL` | Khóa ngoại Foreign Keys (PostgreSQL) | Xác định quyền hạn: file thuộc kho cá nhân của User 14 hay thuộc Không gian nhóm. |

> **[Nhận định kỹ thuật] Kết luận cốt lõi**: Tên file **không bao giờ** được coi là định danh duy nhất của tài liệu. Hai file hoàn toàn khác nhau có thể có cùng tên `BaoCao.docx`, và ngược lại, một file có nội dung giống hệt nhau có thể được lưu dưới hàng chục cái tên khác nhau (`BaoCao_v1.docx`, `BaoCao_final.docx`). Do đó, hệ thống buộc phải tách rời Metadata trong Database và nội dung nhị phân trên Filesystem.

---

## 3. Cơ sở dữ liệu quan hệ (RDBMS) và bài toán lưu trữ nhị phân (BLOB vs Filesystem)

Một câu hỏi kinh điển của các hội đồng bảo vệ đồ án: *"Tại sao không lưu trực tiếp file vào cột `BYTEA` (PostgreSQL) hoặc `BLOB` (MySQL) trong cơ sở dữ liệu để quản lý tập trung và đảm bảo Transaction ACID?"*

### So sánh kỹ thuật: Database BLOB vs Local Filesystem **[Nhận định kỹ thuật]**

```
MÔ HÌNH A: DATABASE BLOB                        MÔ HÌNH B: SEPARATION OF CONCERNS (Digital Library)
+-----------------------------------+           +-----------------------+   +-----------------------+
|            PostgreSQL             |           |      PostgreSQL       |   |   Local Filesystem    |
|                                   |           |                       |   |                       |
| [documents table]                 |           | [documents table]     |   | storage/              |
| - id: 101                         |           | - id: 101             |   | └── 14/               |
| - title: "DeCuong.pdf"            |           | - title: "DeCuong.pdf"|   |     └── 7c9a...pdf    |
| - payload: 0x25504446... (50MB)   |           | - file_path: "str..." |   |                       |
|   (Làm phình to DB, cache RAM,    |           | - checksum: "e3b0..." |   | (Tối ưu I/O stream,   |
|    WAL log bị quá tải)            |           | (Gọn nhẹ, query ms)   |   |  zero-copy read)      |
+-----------------------------------+           +-----------------------+   +-----------------------+
```

1. **Hiệu năng bộ nhớ đệm (Database Buffer Pool Pollution)**:
   - RDBMS như PostgreSQL lưu trữ các trang dữ liệu (pages, kích thước mặc định 8KB) trên bộ nhớ RAM (Buffer Pool). Khi thực hiện truy vấn `SELECT`, nếu một cột chứa file 50MB, hệ thống buộc phải đọc hàng nghìn pages vào RAM, đẩy các index và metadata thường dùng ra ngoài cache. Điều này làm sụt giảm nghiêm trọng hiệu năng của toàn bộ hệ thống.
2. **Chi phí ghi nhật ký giao dịch (Write-Ahead Logging - WAL Overhead)**:
   - Trong PostgreSQL, mọi thao tác ghi dữ liệu đều phải ghi vào file nhật ký WAL trước khi ghi vào đĩa. Nếu lưu file 50MB vào cột `BYTEA`, dung lượng WAL sẽ tăng vọt thêm 50MB, làm chậm quá trình nhân bản dữ liệu (Replication) và tăng thời gian Backup/Restore CSDL lên gấp nhiều lần.
3. **Truy cập trực tiếp và Streaming (OS Zero-Copy / Range Requests)**:
   - Web Server / Framework có thể tận dụng các lời gọi hệ thống tối ưu của OS như `sendfile()` (Zero-Copy) để truyền thẳng byte từ đĩa cứng ra socket mạng mà không cần copy vào bộ nhớ của ứng dụng. Cơ sở dữ liệu quan hệ hoàn toàn bất lực trong việc cung cấp khả năng streaming tốc độ cao cho video hay tài liệu dung lượng lớn.
4. **Phân tách trách nhiệm (Separation of Concerns)**:
   - RDBMS tối ưu xuất sắc cho việc lập chỉ mục (B-Tree indexing), lọc điều kiện phức tạp (Join, Where, Group By), và bảo đảm ràng buộc toàn vẹn quan hệ.
   - Filesystem được thiết kế chuyên biệt để phân bổ block, quản lý phân mảnh và đọc/ghi luồng nhị phân tốc độ cao.

---

## 4. Phân tích Local Filesystem so với Object Storage (S3-compatible)

Trong kiến trúc lưu trữ hiện đại, có hai hướng tiếp cận lưu trữ ngoài database:

| Tiêu chí | Local Filesystem (Thiết kế hiện tại) **[Đang triển khai]** | Object Storage (AWS S3, MinIO, Cloudflare R2) **[Đề xuất tương lai]** |
| :--- | :--- | :--- |
| **Giao thức truy cập** | File I/O POSIX (`open()`, `read()`, `write()`, `shutil`) | HTTP REST API (`GET`, `PUT`, `DELETE` thông qua SDK) |
| **Độ trễ I/O (Latency)** | Cực thấp (Microseconds với SSD/NVMe cục bộ) | Cao hơn (vài chục đến hàng trăm mili-giây qua mạng) |
| **Khả năng mở rộng (Scalability)** | Bị giới hạn bởi dung lượng ổ cứng của server vật lý | Vô hạn (Elastic Storage), không lo hết đĩa |
| **Kiến trúc ứng dụng** | Server phải duy trì trạng thái đĩa (Stateful Server) | Backend hoàn toàn không trạng thái (Stateless Server) |
| **Chạy nhiều Server (Multi-instance)**| Rất khó khăn (cần NFS hoặc Cluster FS để chia sẻ đĩa) | Rất dễ dàng (mọi Server Backend đều trỏ về một S3 Bucket) |
| **Độ phức tạp hạ tầng** | Rất thấp, không cần cài đặt thêm dịch vụ lưu trữ bên thứ ba | Cần quản trị cụm MinIO hoặc trả phí Cloud Storage |

> **[Nhận định kỹ thuật]**: Việc dự án lựa chọn **Local Filesystem** ở giai đoạn hiện tại là hoàn toàn phù hợp với phạm vi đồ án/môn học lớn: giảm thiểu độ phức tạp triển khai, không phụ thuộc chi phí đám mây, độ trễ truy xuất thấp và dễ dàng cấu hình đường dẫn tĩnh. Tuy nhiên, khi hệ thống cần mở rộng theo chiều ngang (Scale-out nhiều container Backend), Local Filesystem sẽ trở thành điểm nghẽn đơn lẻ (Single Point of Failure).

---

## 5. Phân định các môi trường: Client, Backend Server, Filesystem và Database

Một trong những vấn đề gây hoang mang lớn nhất cho các bạn sinh viên khi bảo vệ đồ án là sự nhầm lẫn giữa máy tính cá nhân, server cục bộ và các bản triển khai trên Internet (Deploy / Hosting).

```
+--------------------------------------------------------------------------------------------------+
|                                    KIẾN TRÚC MÔI TRƯỜNG THỰC TẾ                                  |
|                                                                                                  |
| [ MÁY NGƯỜI DÙNG / TRÌNH DUYỆT ]                                                                 |
|  - File nằm trên ổ đĩa Client: C:\Documents\BaoCao.pdf                                           |
|  - Người dùng bấm Upload -> Trình duyệt gửi Multipart Form Data qua mạng HTTP                      |
|                                                                                                  |
|                                   HTTP Request (Multipart/form-data)                             |
|                                                  │                                               |
|                                                  ▼                                               |
| [ BACKEND SERVER (FastAPI - Python Process) ]                                                    |
|  - Tiến trình Python chạy tại: /Users/caotiendattx/.../Foundation-Project/backend                |
|  - Tiếp nhận Request -> Đọc stream -> Tính SHA-256 Checksum                                      |
|            │                                                     │                               |
|            │ (SQL Query qua asyncpg)                             │ (File I/O Write)              |
|            ▼                                                     ▼                               |
| [ DATABASE (PostgreSQL) ]                         [ LOCAL FILESYSTEM (Server Disk) ]             |
|  - Host: localhost:5432                           - Thư mục: backend/storage/                    |
|  - Bảng: documents                                - Lưu file vật lý: storage/14/uuid.pdf         |
|  - Lưu Metadata: file_path, checksum              - Lưu thumbnail: storage/thumbnails/105.jpg    |
|                                                   - Lưu markdown: storage/markdowns/105.md       |
|                                                                                                  |
|                                   HTTP GET /storage/14/uuid.pdf                                  |
|                                                  ▲                                               |
|                                                  │                                               |
| [ FRONTEND (React SPA - Vite) ] ─────────────────┴─────────────────────────────────────────────── |
|  - Chạy tại: http://localhost:5173                                                               |
|  - Nhận URL tĩnh từ Backend: http://localhost:8000/storage/14/uuid.pdf                           |
+--------------------------------------------------------------------------------------------------+
```

### Các nguyên nhân kỹ thuật khiến tài liệu không hiển thị **[Nhận định kỹ thuật]**

Khi một tài liệu có trong Database nhưng Frontend không thể mở hoặc tải, hội đồng có thể đặt câu hỏi về việc *"File bị mất"*. Về mặt khoa học hệ thống, cần phân biệt rõ 5 kịch bản kỹ thuật:

1. **Lệch pha giữa Database và Filesystem**: Database được khôi phục từ file dump `.sql` của máy khác hoặc môi trường staging/production, nhưng thư mục vật lý `storage/` không được copy đi kèm. Kết quả: Bản ghi metadata tồn tại, nhưng file vật lý không có trên đĩa cứng.
2. **Sai lệch Thư mục làm việc (Working Directory mismatch)**: Backend lưu file theo đường dẫn tương đối `storage/...`. Nếu khởi chạy ứng dụng từ thư mục gốc `/Foundation-Project` thay vì thư mục `/Foundation-Project/backend`, đường dẫn tương đối sẽ bị trỏ sai vị trí trên cây thư mục hệ điều hành.
3. **Lỗi Mount Static Files**: FastAPI chưa mount hoặc mount sai thư mục vật lý:
   `app.mount("/storage", StaticFiles(directory="storage"), name="storage")` **[Đang triển khai]**
   Nếu thư mục `storage` chưa được tạo trước khi mount, các request tải file tĩnh sẽ trả về HTTP 404 Not Found.
4. **Frontend kết nối sai Backend Endpoint**: File cấu hình môi trường `.env` của Frontend (`VITE_API_URL`) trỏ tới một địa chỉ Backend cũ (hoặc server cloud trước đây), trong khi file mới upload lại nằm trên ổ đĩa local của máy phát triển hiện tại.
5. **Quyền truy cập hệ thống tệp (File Permissions)**: Tiến trình chạy FastAPI không có quyền đọc (`chmod / chown`) trên thư mục con hoặc file được tạo ra bởi người dùng hệ điều hành khác.

---

# PHẦN II: MÃ BĂM (CHECKSUM) VÀ THUẬT TOÁN MẬT MÃ HỌC SHA-256

## 6. Khái niệm Checksum, Hash Function và Digest

### 6.1. Định nghĩa toán học
**Hàm băm mật mã học (Cryptographic Hash Function)** là một thuật toán toán học một chiều (one-way function) nhận đầu vào là một chuỗi bit có độ dài bất kỳ (từ 0 byte đến hàng Terabyte) và chuyển đổi thành một chuỗi bit có **độ dài cố định (Fixed-length output)**, được gọi là **Mã băm (Hash value, Message Digest, hoặc Checksum)**:

$$H: \{0, 1\}^* \rightarrow \{0, 1\}^k$$

Với thuật toán **SHA-256**, độ dài đầu ra luôn luôn là $k = 256$ bits (tương đương 32 bytes).

### 6.2. Vì sao Tên file, Extension và Kích thước là không đủ?
Nhiều hệ thống đơn giản kiểm tra file trùng bằng cách so sánh:
`filename == input.filename AND filesize == input.filesize`

Cách tiếp cận này thất bại hoàn toàn vì hai lý do căn bản:
1. **Dương tính giả (False Positive)**: Hai file hoàn toàn khác nhau có thể vô tình có cùng tên `baitap.docx` và cùng kích thước 45,020 bytes. Hệ thống sẽ chặn nhầm file của người dùng.
2. **Âm tính giả (False Negative)**: Người dùng tải lên cùng một cuốn giáo trình PDF nặng 20MB, nhưng đổi tên từ `GiaoTrinhCSDL.pdf` thành `TaiLieuHocTap.pdf`. Thuật toán so sánh tên sẽ bị qua mặt, khiến hệ thống ghi hai bản sao giống hệt nhau xuống đĩa cứng, gây lãng phí dung lượng.

### 6.3. Minh họa trực quan: Tính chất của SHA-256

Giả sử ta có 4 file thử nghiệm:
- **File A**: File gốc, chứa chuỗi byte biểu diễn nội dung văn bản: `"Kien truc he thong Digital Library"`.
- **File B**: Nội dung byte giống hệt File A, nhưng người dùng đổi tên thành `"Tai_lieu_moi.txt"`.
- **File C**: File hoàn toàn khác, nhưng vô tình được đặt tên giống File A và có kích thước được căn chỉnh bằng đúng File A.
- **File D**: Giống hệt File A, nhưng chỉ sửa đổi duy nhất **1 bit** cuối cùng (chữ `"y"` đổi thành `"z"`: `"Kien truc he thong Digital Librarz"`).

```
+----------------------------------------------------------------------------------------------------+
|                                    MINH HỌA TOÁN HỌC CỦA SHA-256                                   |
|                                                                                                    |
| [ File A ] ──► SHA-256 ──► 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8       |
|                                                                                                    |
| [ File B ] ──► SHA-256 ──► 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8 (TRÙNG) |
| (Khác tên file, nội dung byte giống nhau -> Digest giống hệt nhau 100%)                            |
|                                                                                                    |
| [ File C ] ──► SHA-256 ──► 4a7d1ed414474e4033ac29ccb8653d9b168a4112e4d0... (KHÁC HOÀN TOÀN)       |
| (Cùng tên file, nội dung byte khác nhau -> Digest khác biệt hoàn toàn)                             |
|                                                                                                    |
| [ File D ] ──► SHA-256 ──► f0e4c2f76c58916ec258f246851bea091d14d4247a2... (HIỆU ỨNG TUYẾT LỞ)     |
| (Chỉ lệch 1 bit duy nhất -> Hơn 50% số bit đầu ra bị đảo lộn hoàn toàn)                           |
+----------------------------------------------------------------------------------------------------+
```

### 6.4. Các nguyên lý an toàn cốt lõi cần làm rõ khi bảo vệ đồ án **[Nhận định kỹ thuật]**
- **Hiệu ứng tuyết lở (Avalanche Effect)**: Khi có sự biến thiên dù chỉ 1 bit ở dữ liệu đầu vào, thuật toán băm mật mã học sẽ khuếch tán sự thay đổi qua các vòng lặp toán học, làm cho hơn một nửa số bit trong chuỗi digest đầu ra thay đổi một cách ngẫu nhiên.
- **Hàm băm KHÔNG PHẢI là mã hóa (Hashing is NOT Encryption)**: Mã hóa là quá trình biến đổi hai chiều (Two-way: Plaintext $\leftrightarrow$ Ciphertext) thông qua Khóa (Key). Ngược lại, hàm băm là phép ánh xạ một chiều không thể giải ngược (One-way: Không thể tái tạo lại file 100MB từ chuỗi 64 ký tự hex).
- **Checksum không chứng minh an toàn mã độc**: Hai file mã độc khác nhau vẫn có checksum riêng biệt. Checksum chỉ chứng minh *tính toàn vẹn* và *tính tương đồng nội dung*, không thay thế được phần mềm diệt virus (Antivirus Scanner).
- **Rủi ro va chạm băm (Collision Risk) trên thực tế**: Về lý thuyết toán học (Nguyên lý lồng chim bồ câu - Pigeonhole Principle), vì tập đầu vào là vô hạn còn tập đầu ra giới hạn ở $2^{256}$ giá trị, chắc chắn tồn tại va chạm (hai file khác nhau có cùng hash). Tuy nhiên, không gian $2^{256} \approx 1.15 \times 10^{77}$ lớn tương đương số nguyên tử trong toàn bộ vũ trụ quan sát được. Xác suất để hai file ngẫu nhiên trong hệ thống trùng mã SHA-256 nhỏ hơn hàng triệu lần xác suất server bị thiên thạch phá hủy.

---

## 7. Cấu tạo và nguyên lý của thuật toán SHA-256

Thuật toán SHA-256 (Secure Hash Algorithm 2) được công bố bởi Viện Tiêu chuẩn và Kỹ thuật Quốc gia Hoa Kỳ (NIST) theo tiêu chuẩn FIPS 180-4.

### 7.1. Cấu trúc bit và biểu diễn Hexadecimal
- Đầu ra của SHA-256 là **256 bits**.
- 1 byte = 8 bits $\rightarrow$ 256 bits = **32 bytes**.
- Mỗi byte trong máy tính được biểu diễn bằng 2 ký tự Hexadecimal (hệ thập lục phân: `0-9`, `a-f`), vì $16 = 2^4$ (4 bits biểu diễn được 1 ký tự hex):

$$\frac{256 \text{ bits}}{4 \text{ bits/hex char}} = 64 \text{ ký tự hex}$$

Do đó, cột `checksum` trong cơ sở dữ liệu luôn luôn có độ dài cố định là **64 ký tự** (ví dụ: `varchar(255)` hoặc `varchar(64)`).

### 7.2. Nguyên lý khối (Block-based Merkle–Damgård Construction)
SHA-256 hoạt động trên các khối dữ liệu có kích thước chuẩn **512 bits (64 bytes)**:
1. **Đệm dữ liệu (Padding)**: Nếu file có độ dài không chia hết cho 512 bits, thuật toán sẽ thêm 1 bit `1`, theo sau là các bit `0`, và 64 bit cuối cùng biểu diễn độ dài gốc của file.
2. **Khởi tạo trạng thái**: Sử dụng 8 thanh ghi giá trị ban đầu ($H_0$ đến $H_7$), mỗi thanh ghi 32 bits, lấy từ phần thập phân của căn bậc hai của 8 số nguyên tố đầu tiên (2, 3, 5, 7, 11, 13, 17, 19).
3. **Vòng lặp nén (Compression Function)**: Với mỗi khối 512 bits, thuật toán thực hiện **64 vòng biến đổi logic** phức tạp gồm các hàm quay bit (`ROTR`), dịch chuyển bit (`SHR`), và các phép toán logic (`AND`, `XOR`, `NOT`, `Ch`, `Maj`).
4. **Kết xuất Digest**: Giá trị của 8 thanh ghi sau khối dữ liệu cuối cùng được ghép lại tạo thành chuỗi 256 bits hoàn chỉnh.

### 7.3. Ma trận so sánh các thuật toán băm phổ biến **[Nhận định kỹ thuật]**

| Tiêu chuẩn thuật toán | Độ dài Digest | Độ phức tạp phá vỡ va chạm | Trạng thái bảo mật mật mã học | Chi phí CPU tương đối | Đánh giá tính phù hợp trong Digital Library |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MD5** | 128 bits (32 hex) | $2^{16}$ (Đã bị phá vỡ hoàn toàn) | **KHÔNG AN TOÀN** (Có thể tạo 2 file PDF khác nhau cùng MD5 trong vài giây) | Rất nhanh (~1x) | Không phù hợp, dễ bị tấn công giả mạo tài liệu học tập. |
| **SHA-1** | 160 bits (40 hex) | $2^{63}$ (Đã bị Google phá vỡ - SHAttered) | **KHÔNG AN TOÀN** | Nhanh (~1.2x) | Đã bị loại bỏ khỏi các tiêu chuẩn bảo mật quốc tế. |
| **SHA-256** | **256 bits (64 hex)** | **$2^{128}$ (Bảo mật tuyệt đối hiện nay)** | **CHUẨN MẬT MÃ QUỐC TẾ** | **Trung bình (~1.8x, có tăng tốc phần cứng)** | **LỰA CHỌN TỐI ƯU**: Cân bằng hoàn hảo giữa an toàn, tính phổ biến và hiệu năng. |
| **BLAKE3 / xxHash** | 256 bits | Rất cao (BLAKE3) / Không mật mã (xxHash) | Cực nhanh nhờ SIMD | Cực nhanh (~0.3x) | Đòi hỏi thư viện C/Rust bên ngoài, phức tạp hóa việc cài đặt Python tiêu chuẩn. |

---

## 8. Hai mô hình tính toán SHA-256 trong Python

Trong mã nguồn thực tế của dự án, chúng ta có thể quan sát trực tiếp hai phương thức triển khai thuật toán SHA-256:

### Cách A: Nạp toàn bộ vào bộ nhớ đệm RAM (In-Memory Hashing) **[Đang triển khai tại document_service.py]**

```python
# Trích đoạn thực tế: backend/app/services/document_service.py (Dòng 34-36)
content_bytes = await upload.read()
checksum = hashlib.sha256(content_bytes).hexdigest()
```

- **Cơ chế hoạt động**: Nạp toàn bộ chuỗi byte của file tải lên vào một biến `bytes` duy nhất trong bộ nhớ RAM của tiến trình Python, sau đó truyền toàn bộ khối bộ nhớ này vào hàm `hashlib.sha256()`.
- **Ưu điểm**: Cực kỳ ngắn gọn, trực quan, cho phép tái sử dụng mảng byte nhiều lần (như decode text UTF-8, truyền vào `io.BytesIO`).
- **Nhược điểm**: Tiêu tốn bộ nhớ đệm tỉ lệ thuận với kích thước file.

### Cách B: Băm tuần tự theo khối (Stream Chunking via update) **[Đang triển khai tại app/utils/checksum.py]**

```python
# Trích đoạn thực tế: backend/app/utils/checksum.py (Dòng 7-12)
def compute_file_checksum(file_path: str) -> str:
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as file_obj:
        for chunk in iter(lambda: file_obj.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()
```

- **Cơ chế hoạt động**: Khởi tạo đối tượng băm `hasher = hashlib.sha256()`. Mở file trên đĩa cứng và đọc tuần tự từng khối **8192 bytes (8 KB)**. Hàm `hasher.update(chunk)` liên tục cập nhật trạng thái nội bộ 256 bits của thuật toán.
- **Tính tương đương toán học**: Do tính chất Merkle-Damgård, chuỗi digest thu được từ việc gọi `update()` trên $N$ khối 8KB liên tiếp **chính xác 100%** bằng với digest khi băm toàn bộ file trong một lần gọi.
- **Ưu điểm vượt trội về RAM**: Bất kể file có kích thước 100 MB hay 10 GB, bộ nhớ RAM tiêu thụ cho thuật toán băm luôn luôn là hằng số **$O(1)$** (~8 KB cho buffer).

---

# PHẦN III: PHÂN TÍCH BỘ NHỚ RAM, HIỆU NĂNG VÀ KHẢ NĂNG MỞ RỘNG

## 9. Phân tích vòng đời dữ liệu upload trong bộ nhớ đệm

Một câu hỏi hóc búa từ hội đồng: *"Khi người dùng upload file 50MB, file đó có nằm hoàn toàn trong RAM không?"*

Để trả lời chính xác, phải hiểu sâu cách xử lý đa tầng của **FastAPI/Starlette** và **Python runtime**:

```
[ HTTP Multipart Stream ] 
           │
           ▼
[ Starlette SpooledTemporaryFile ] (Ngưỡng 1MB)
   ├── File < 1MB ──► Lưu trong RAM (io.BytesIO)
   └── File > 1MB ──► Spool (ghi tạm) ra đĩa cứng OS: /tmp/tmp_xyz
           │
           ▼
[ Lời gọi: await upload.read() ] (TẠI ĐÂY RAM TĂNG ĐỘT BIẾN!)
   └── Đọc toàn bộ nội dung từ /tmp vào một đối tượng bytes mới trong RAM!
           │
           ▼
[ Biến content_bytes ] ──► Chiếm 50 MB RAM
           │
           ▼
[ upload.file = io.BytesIO(content_bytes) ] ──► Chiếm THÊM 50 MB RAM!
           │
           ▼
[ shutil.copyfileobj(...) ] ──► Ghi xuống storage chính thức
```

> **[Nhận định kỹ thuật] Kết luận quan trọng**: Mặc dù framework Starlette có cơ chế thông minh `SpooledTemporaryFile` để tránh tràn RAM (chỉ giữ tối đa 1MB trong bộ nhớ, vượt quá sẽ ghi file tạm ra đĩa `/tmp`), nhưng do code hiện tại của dự án gọi `await upload.read()` và gán lại `upload.file = io.BytesIO(content_bytes)`, dữ liệu đã bị ép buộc nạp toàn bộ vào RAM, làm mất đi tác dụng bảo vệ ban đầu của framework.

---

## 10. Mô hình toán học ước lượng thời gian xử lý (Latency Modeling)

Tổng thời gian xử lý một request upload tài liệu ($T_{\text{total}}$) không chỉ phụ thuộc vào thuật toán SHA-256 mà là một chuỗi tuần tự:

$$T_{\text{total}} = T_{\text{network\_rx}} + T_{\text{read\_mem}} + T_{\text{sha256}} + T_{\text{db\_query}} + T_{\text{disk\_write}} + T_{\text{db\_commit}}$$

### Mô hình ước lượng lý thuyết:
- Thời gian tính băm SHA-256:
  $$T_{\text{sha256}} \approx \frac{N}{R_{\text{sha256}}}$$
  *(Trong đó $N$ là kích thước file tính bằng byte; $R_{\text{sha256}}$ là thông lượng băm của CPU, thông thường đạt từ 300 MB/s đến 600 MB/s trên các dòng CPU hiện đại có tập lệnh Intel SHA Extensions).*
- Thời gian đọc dữ liệu vào RAM:
  $$T_{\text{read\_mem}} \approx \frac{N}{R_{\text{read\_tmp}}}$$
- Thời gian ghi dữ liệu xuống Storage đĩa cứng:
  $$T_{\text{disk\_write}} \approx \frac{N}{R_{\text{write\_disk}}}$$

### Bảng ví dụ định lượng giả định (Dựa trên thông số máy chủ tiêu chuẩn) **[Nhận định kỹ thuật]**
*(Giả định môi trường: NVMe SSD Write $800\text{ MB/s}$, CPU SHA-256 Throughput $400\text{ MB/s}$, Mạng nội bộ không tính trễ truyền tải)*:

| Kích thước file ($N$) | Thời gian tính SHA-256 ($T_{\text{sha256}}$) | Thời gian ghi đĩa ($T_{\text{disk\_write}}$) | Thời gian truy vấn DB ($T_{\text{db}}$) | Tổng thời gian ước lượng |
| :--- | :--- | :--- | :--- | :--- |
| **1 MB** (Tài liệu Word nhỏ) | $\sim 2.5\text{ ms}$ | $\sim 1.25\text{ ms}$ | $\sim 3.0\text{ ms}$ | **$\sim 6.75\text{ ms}$** (Gần như tức thì) |
| **10 MB** (Sách PDF nhiều hình ảnh)| $\sim 25.0\text{ ms}$ | $\sim 12.5\text{ ms}$ | $\sim 3.0\text{ ms}$ | **$\sim 40.5\text{ ms}$** (Hoàn toàn mượt mà) |
| **50 MB** (File tài liệu scan lớn)| $\sim 125.0\text{ ms}$ | $\sim 62.5\text{ ms}$ | $\sim 3.0\text{ ms}$ | **$\sim 190.5\text{ ms}$** (< 0.2 giây) |
| **500 MB** (Tệp dung lượng rất lớn)| $\sim 1,250.0\text{ ms}$ (1.25s) | $\sim 625.0\text{ ms}$ | $\sim 3.0\text{ ms}$ | **$\sim 1.88\text{ s}$** (Bắt đầu xuất hiện độ trễ) |

> Nhận định: Với kích thước tài liệu thông thường trong đồ án (dưới 50MB), thời gian tính toán SHA-256 là **hoàn toàn chấp nhận được** và không phải là nút thắt cổ chai (bottleneck) của hệ thống.

---

## 11. Phân tích dung lượng RAM tiêu thụ và rủi ro tải đồng thời (Concurrency)

Nếu một file 50MB được tải lên, lượng RAM tiêu thụ tức thời của tiến trình Python có thể lên tới:

$$\text{RAM}_{\text{single}} \approx \text{Buffer}_{\text{spool}} + \text{content\_bytes} + \text{BytesIO} \approx 50\text{ MB} + 50\text{ MB} + 50\text{ MB} \approx 150\text{ MB}$$

### Kịch bản tải đồng thời (Concurrent Upload Hazard) **[Nhận định kỹ thuật]**:
Giả sử có $K = 20$ người dùng đồng thời tải lên các tài liệu đồ án có kích thước $50\text{ MB}$:
$$\text{RAM}_{\text{peak}} \approx 20 \times 150\text{ MB} \approx 3,000\text{ MB} = 3\text{ GB RAM!}$$

Nếu máy chủ chạy trên một gói VPS hoặc Container chỉ có 2GB RAM, hệ điều hành sẽ lập tức kích hoạt cơ chế **OOM Killer (Out-Of-Memory Killer)** và cưỡng chế tắt tiến trình Python backend (`SIGKILL`), làm sập toàn bộ dịch vụ của hệ thống.

---

## 12. Đánh giá tính hợp lý và các giới hạn kích thước file hiện tại

### Khảo sát mã nguồn thực tế về Giới hạn kích thước (File Size Limits):
1. **Phía Frontend [Đang triển khai]**:
   - Tại file `frontend/digital-library/src/components/shared/modals/UploadModal.tsx` (Dòng 54):
     `const MAX_MB = 50;`
   - Frontend kiểm tra trực tiếp kích thước file và chặn người dùng trước khi gửi request nếu file vượt quá 50MB.
2. **Phía Backend [Đang triển khai]**:
   - Khảo sát mã nguồn tại `backend/app/routers/documents.py`, `backend/app/services/document_service.py` và `backend/app/main.py`:
     **Hiện tại chưa có middleware hoặc logic kiểm tra giới hạn `Content-Length` tối đa ở phía backend.**
   - Điều này đồng nghĩa: Nếu một người dùng cố tình gửi request trực tiếp bằng Postman/cURL với file dung lượng 500MB, Backend vẫn sẽ tiếp nhận và đọc vào RAM.

> **[Nhận định kỹ thuật] Kết luận kiến trúc**:
> - **Điểm tốt**: Việc đọc file vào RAM trước giúp kiểm tra trùng lặp tuyệt đối, đảm bảo 100% không tạo ra bất kỳ file rác nào trên đĩa nếu file bị trùng lặp.
> - **Hạn chế**: Thiếu tầng xác thực kích thước file ở cấp Backend (Backend Validation), tạo nguy cơ tấn công từ chối dịch vụ (Denial of Service - DoS qua RAM exhaustion).

---

# PHẦN IV: CƠ CHẾ KIỂM TRA TRÙNG LẶP (DEDUPLICATION LOGIC)

## 13. Bản chất của Deduplication: Phát hiện trùng lặp vs Lưu trữ khử trùng lặp

Cần phân định rạch ròi giữa hai thuật ngữ kỹ thuật rất dễ nhầm lẫn:
1. **Cơ chế phát hiện trùng lặp (Duplicate Detection) [Đang triển khai]**:
   Hệ thống tính checksum của file tải lên, đối chiếu với cơ sở dữ liệu. Nếu đã tồn tại file có cùng nội dung trong phạm vi cho phép, hệ thống **từ chối lưu file** và trả về thông báo lỗi HTTP 409 Conflict.
2. **Hệ thống lưu trữ khử trùng lặp vật lý (Physical Content Deduplication - CAS) [Đề xuất tương lai]**:
   Hệ thống cho phép người dùng upload thoải mái, nhưng dưới tầng lưu trữ vật lý chỉ lưu **duy nhất một bản copy**, các bản ghi tiếp theo chỉ tăng biến đếm tham chiếu (Reference Counter).

> Hệ thống Digital Library hiện tại sử dụng **Cơ chế phát hiện trùng lặp theo ngữ cảnh không gian (Scoped Duplicate Detection)**.

---

## 14. Luồng thực thi kiểm tra trùng lặp từ Endpoint đến Database và Storage

```
+--------------------------------------------------------------------------------------------------+
|                          SƠ ĐỒ TRUY VẾT LUỒNG DEDUPLICATION CHI TIẾT                             |
|                                                                                                  |
| [ Client Upload Request ]                                                                        |
|           │                                                                                      |
|           ▼                                                                                      |
| 1. Router: POST /documents/upload                                                                |
|    - Tiếp nhận MultipartForm: file, title, description, category_id, workspace_id, tag_ids       |
|    - Nếu file text: đọc UTF-8 preview content và seek(0)                                         |
|           │                                                                                      |
|           ▼                                                                                      |
| 2. Service: create_document_from_upload()                                                        |
|    - Bước 1: content_bytes = await upload.read()                                                 |
|    - Bước 2: checksum = hashlib.sha256(content_bytes).hexdigest()                                |
|           │                                                                                      |
|           ├──► 3. Database Query (Active Check):                                                 |
|           │    SELECT * FROM documents                                                           |
|           │    WHERE checksum = :checksum AND is_deleted = False                                 |
|           │      AND owner_id = :owner_id AND workspace_id IS NULL                              |
|           │    [NẾU TÌM THẤY] ──► Raise ValueError("duplicate_document:{id}")                    |
|           │                                 │                                                    |
|           │                                 ▼                                                    |
|           │                        Router bắt lỗi -> HTTP 409                                    |
|           │                        {"code": "DUPLICATE", "document_id": id}                     |
|           │                        (KẾT THÚC - HOÀN TOÀN KHÔNG GHI ĐĨA)                          |
|           │                                                                                      |
|           ├──► 4. Database Query (Trash Check):                                                  |
|           │    SELECT * FROM documents                                                           |
|           │    WHERE checksum = :checksum AND is_deleted = True                                  |
|           │      AND owner_id = :owner_id AND workspace_id IS NULL                              |
|           │    [NẾU TÌM THẤY] ──► Raise ValueError("in_trash:{id}:{title}")                      |
|           │                                 │                                                    |
|           │                                 ▼                                                    |
|           │                        Router bắt lỗi -> HTTP 409                                    |
|           │                        {"code": "IN_TRASH", "document_id": id, "title": title}       |
|           │                        (KẾT THÚC - FE HIỆN DIALOG HỎI KHÔI PHỤC)                     |
|           │                                                                                      |
|           ▼ (NẾU KHÔNG TRÙNG LẶP)                                                                |
| 5. Service: Lưu file vật lý                                                                      |
|    - upload.file = io.BytesIO(content_bytes)                                                     |
|    - file_path = save_upload_file(upload, owner_id) -> storage/{owner_id}/{uuid}.ext             |
|           │                                                                                      |
|           ▼                                                                                      |
| 6. Service & Router: Ghi nhận Database & Background Task                                         |
|    - Tạo Document Model và db.add(document)                                                      |
|    - await db.commit()                                                                           |
|    - background_tasks.add_task(_process_document_background, ...)                                |
+--------------------------------------------------------------------------------------------------+
```

---

## 15. Kiểm tra trùng trong Kho cá nhân (Personal Space)

### Điều kiện truy vấn SQL thực tế trong mã nguồn:
Trong hàm `create_document_from_upload` (`backend/app/services/document_service.py`), điều kiện lọc kho cá nhân:

```python
# [Đang triển khai]
query_active = select(Document).where(
    Document.checksum == checksum,
    Document.is_deleted == False,
    Document.owner_id == owner_id,
    Document.workspace_id.is_(None)
)

query_trash = select(Document).where(
    Document.checksum == checksum,
    Document.is_deleted == True,
    Document.owner_id == owner_id,
    Document.workspace_id.is_(None)
)
```

### Ý nghĩa nghiệp vụ:
1. **`Document.workspace_id.is_(None)`**: Xác định tài liệu này thuộc quyền sở hữu riêng tư của cá nhân, không nằm trong bất kỳ nhóm làm việc nào.
2. **`Document.owner_id == owner_id`**: Phạm vi kiểm tra được bao đóng trong kho của chính người dùng đó. **Người dùng B có quyền tải lên file trùng với Người dùng A mà không bị chặn.**
3. **Phân biệt Active và Trash**:
   - Nếu trùng với file đang hoạt động (`is_deleted = False`): Trả về mã lỗi `DUPLICATE`. Giao diện hiển thị cảnh báo: *"Tài liệu đã tồn tại trong kho của bạn."*
   - Nếu trùng với file nằm trong thùng rác (`is_deleted = True`): Trả về mã lỗi `IN_TRASH` kèm theo `document_id` và `title`. Giao diện mở hộp thoại xác nhận: *"Tài liệu X đang ở trong thùng rác. Bạn muốn khôi phục lại không?"*. Nếu người dùng đồng ý, frontend kích hoạt API Restore mà không cần tốn băng thông upload lại file.

---

## 16. Kiểm tra trùng trong Không gian nhóm (Group Workspace)

### Điều kiện truy vấn SQL thực tế:
Khi upload trong nhóm (`workspace_id` có giá trị cụ thể):

```python
# [Đang triển khai]
query_active = select(Document).where(
    Document.checksum == checksum,
    Document.is_deleted == False,
    Document.workspace_id == workspace_id
)

query_trash = select(Document).where(
    Document.checksum == checksum,
    Document.is_deleted == True,
    Document.workspace_id == workspace_id
)
```

### Điểm khác biệt sống còn so với kho cá nhân:
1. **Không lọc theo `owner_id`**: Trong không gian nhóm, tài liệu thuộc sở hữu chung của nhóm. Nếu Thành viên A đã tải lên file `BaoCaoTuan1.pdf`, sau đó Thành viên B tải lên cùng file đó vào nhóm, hệ thống **sẽ chặn lại** để bảo vệ nhóm khỏi việc rác dữ liệu.
2. **Kiểm tra phân quyền trước (Authorization Gate)**: Trước khi tiến hành đọc file hay kiểm tra checksum, router `backend/app/routers/groups.py` luôn thực thi:
   `await require_full_permission(db, group_id, current_user.id)`
   Nếu người dùng không phải là thành viên có quyền ghi của nhóm, request lập tức bị từ chối với HTTP 403 Forbidden.
3. **Tính độc lập giữa các nhóm**: Hai nhóm $G_1$ và $G_2$ hoàn toàn độc lập. Cùng một file có thể tồn tại ở cả hai nhóm mà không bị xem là trùng lặp, bảo đảm tính riêng tư và bảo mật giữa các đồ án/môn học khác nhau.

---

## 17. Upload batch và Cấu trúc Bundle

Khi người dùng cần tải lên một gói nhiều tài liệu liên quan đến nhau (ví dụ: bộ slide thuyết trình kèm tài liệu tham khảo), hệ thống cung cấp tính năng **Batch Upload / Bundle**.

```
+-------------------------------------------------------------------------+
|                           CẤU TRÚC GÓI BUNDLE                           |
|                                                                         |
|  [ Bundle Cha (Parent) ]                                                |
|  - id: 201                                                              |
|  - is_bundle: True                                                      |
|  - file_path: "__bundle__" (Đánh dấu ảo, không có file vật lý)          |
|  - file_size: 15,200,000 bytes (Tổng kích thước các con)                |
|  - checksum: "bundle"                                                   |
|        │                                                                |
|        ├──► [ Tài liệu con 1 ]                                          |
|        │    - id: 202, bundle_parent_id: 201, file_path: "storage/..."  |
|        │    - checksum: "7a8b...1"                                      |
|        │                                                                |
|        └──► [ Tài liệu con 2 ]                                          |
|             - id: 203, bundle_parent_id: 201, file_path: "storage/..."  |
|             - checksum: "9f2c...4"                                      |
+-------------------------------------------------------------------------+
```

### Cơ chế Deduplication và Danh sách Bỏ qua (Skipped List) **[Đang triển khai]**:
1. Giới hạn số lượng file: Phải từ 1 đến tối đa 10 file (`len(files) >= 1 and len(files) <= 10`).
2. Trong vòng lặp duyệt từng file, hệ thống tính checksum và query kiểm tra trùng lặp:
   - Nếu file bị trùng active: Ghi nhận vào mảng `skipped.append({"filename": file.filename, "reason": "duplicate", "existing_id": dup_active.id})` và dùng lệnh `continue` để bỏ qua.
   - Nếu file bị trùng thùng rác: Ghi nhận `skipped.append({"filename": file.filename, "reason": "in_trash", "existing_id": dup_trash.id})` và bỏ qua.
   - **Chỉ các file không trùng mới được ghi đĩa và tạo Document record con.**
3. **Phản hồi nghiệp vụ (Response Payload)**:
   Endpoint trả về schema `BatchUploadOut`:
   ```json
   {
     "bundle": { "id": 201, "title": "Gói tài liệu CSDL", "bundle_children_count": 2 },
     "skipped": [
       { "filename": "Chuong1.pdf", "reason": "duplicate", "existing_id": 45 }
     ]
   }
   ```
   Frontend hiển thị Toast cảnh báo: *"1 file đã tồn tại, bỏ qua."*, gói Bundle vẫn được tạo thành công với 2 file còn lại!

---

## 18. Bảng kịch bản thực nghiệm đối chiếu ma trận Deduplication

Bảng dưới đây mô tả hành vi chính xác của hệ thống theo code thực tế qua các kịch bản giả định:

| Kịch bản thử nghiệm | Nội dung file & Kích thước | Tên file gửi lên | Ngữ cảnh tài khoản & Không gian | Checksum SHA-256 | Kết quả xử lý thực tế của hệ thống |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Kịch bản 1: Tải file mới** | Byte stream A (2.5 MB) | `baitap.pdf` | User A (Kho cá nhân) | `Hash_A` | **Thành công (HTTP 201)**: Ghi đĩa `storage/A/uuid.pdf`, tạo Document mới. |
| **Kịch bản 2: Đổi tên tải lại** | Byte stream A (2.5 MB) | `baitap_final.pdf` | User A (Kho cá nhân) | `Hash_A` | **Bị chặn (HTTP 409 `DUPLICATE`)**: Phát hiện trùng `Hash_A`. Hoàn toàn không ghi đĩa. |
| **Kịch bản 3: Tải lại file trong rác** | Byte stream A (2.5 MB) | `baitap.pdf` | User A (Đã xóa mềm file cũ) | `Hash_A` | **HTTP 409 `IN_TRASH`**: FE nhận mã, hiển thị hộp thoại đề xuất khôi phục nhanh. |
| **Kịch bản 4: Người khác tải file đó** | Byte stream A (2.5 MB) | `baitap.pdf` | User B (Kho cá nhân) | `Hash_A` | **Thành công (HTTP 201)**: Do `owner_id == B` khác với A. Ghi đĩa độc lập vào `storage/B/uuid.pdf`. |
| **Kịch bản 5: Tải vào nhóm làm việc** | Byte stream A (2.5 MB) | `baitap.pdf` | User B (Tải vào Nhóm G) | `Hash_A` | **Thành công (HTTP 201)**: Kiểm tra trong phạm vi `workspace_id == G` chưa có. Ghi vào `storage/groups/G/uuid.pdf`. |
| **Kịch bản 6: Thành viên khác tải lại vào nhóm** | Byte stream A (2.5 MB) | `tailieu.pdf` | User A (Tải vào Nhóm G) | `Hash_A` | **Bị chặn (HTTP 409 `DUPLICATE`)**: Nhóm G đã có file mang `Hash_A`. Không phân biệt ai là người tải. |
| **Kịch bản 7: File sửa đổi 1 ký tự** | Byte stream A' (lệch 1 byte) | `baitap.pdf` | User A (Kho cá nhân) | `Hash_A_Prime` | **Thành công (HTTP 201)**: Do hiệu ứng tuyết lở, `Hash_A_Prime` khác hoàn toàn `Hash_A`. Hệ thống ghi nhận tài liệu mới. |

---

# PHẦN V: CƠ CHẾ GHI FILE VẬT LÝ VÀ TÍNH NHẤT QUÁN VỚI POSTGRESQL

## 19. Quy trình sinh tên an toàn và ghi file xuống đĩa cứng

### 19.1. Nguy cơ bảo mật của tên file gốc (Path Traversal Vulnerability)
Nếu hệ thống trực tiếp sử dụng tên file do trình duyệt gửi lên để ghi đĩa:
`dest = "storage/" + upload.filename`

Kẻ tấn công có thể gửi file có tên: `../../../../etc/passwd` hoặc `../../main.py`. Lời gọi ghi file sẽ ghi đè lên các file mã nguồn hoặc file nhạy cảm của hệ điều hành.

### 19.2. Cơ chế làm sạch và UUID hóa trong Digital Library **[Đang triển khai]**
Tại `backend/app/services/file_service.py` (hàm `save_upload_file`):
```python
owner_dir = STORAGE_DIR / str(owner_id)
owner_dir.mkdir(parents=True, exist_ok=True)
suffix = Path(upload.filename or "upload.bin").suffix
safe_name = f"{uuid.uuid4().hex}{suffix}"
dest_path = owner_dir / safe_name
```
- **Thư mục phân vùng theo User ID (`storage/{owner_id}/`)**: Tách biệt không gian lưu trữ của các người dùng.
- **`uuid.uuid4().hex`**: Tạo chuỗi ngẫu nhiên 128-bit dạng hex (ví dụ: `4f2c9b...`) bảo đảm tính duy nhất tuyệt đối trên filesystem, triệt tiêu nguy cơ xung đột tên file và ngăn chặn 100% tấn công Path Traversal.
- **Giữ lại phần mở rộng (`suffix`)**: Giúp máy chủ xác định đúng Content-Type khi phục vụ file tĩnh.

---

## 20. Mối quan hệ bất đối xứng giữa Local Filesystem và PostgreSQL Transaction

Một trong những vấn đề kiến trúc sâu sắc nhất cần bảo vệ: **Tính nhất quán giữa File vật lý và Database record**.

```
[ POSTGRESQL DATABASE ]                           [ LOCAL FILESYSTEM ]
- Hỗ trợ ACID Transaction                         - Không có ACID Transaction
- Có lệnh rollback() nếu lỗi                     - Không có lệnh rollback native
- Quản lý cô lập dữ liệu (MVCC)                   - File đã ghi là tồn tại ngay lập tức
```

### Các kịch bản lỗi bất đồng bộ và cơ chế giải quyết:

#### Kịch bản 1: File đã ghi xuống đĩa, nhưng Database Commit thất bại (Crash / Constraint Violation)
- **Hậu quả**: Xuất hiện **File rác mồ côi (Orphaned File / Disk Leak)** trên ổ đĩa. File chiếm dung lượng nhưng không có bất kỳ bản ghi nào trong Database quản lý.
- **Cơ chế phòng vệ của dự án [Đang triển khai]**:
  Tại `upload_batch_documents` (`backend/app/routers/documents.py`), dự án cài đặt cơ chế bù trừ (Compensating Cleanup):
  ```python
  except Exception as e:
      await db.rollback()
      for p in saved_file_paths:
          if os.path.exists(p):
              try:
                  os.remove(p)
              except Exception:
                  pass
  ```
  Nếu có bất kỳ lỗi nào xảy ra trong quá trình tạo bundle hoặc commit database, hệ thống sẽ tự động quét danh sách các file vật lý vừa ghi và gọi `os.remove()` để dọn dẹp sạch sẽ.

#### Kịch bản 2: Database đã commit, nhưng file vật lý bị xóa ngoài đĩa (Lỗi E3 đã ghi nhận)
- **Hậu quả**: Database có metadata nhưng khi người dùng bấm tải thì nhận lỗi 404.
- **Nguyên nhân**: Do quản trị viên xóa nhầm thư mục, lỗi ổ đĩa hỏng, hoặc giải tán nhóm không đúng quy trình trong các phiên bản trước.
- **Giải pháp xử lý [Nhận định kỹ thuật]**: Cần một tiến trình kiểm định toàn vẹn nền (Reconciliation Job) chạy định kỳ: quét đối soát giữa cột `documents.file_path` và filesystem (`os.path.exists`), phát hiện các bản ghi mất file để đánh dấu trạng thái cảnh báo hoặc phục hồi từ bản sao lưu.

---

# PHẦN VI: CẤU TRÚC PHÂN VÙNG THƯ MỤC STORAGE THỰC TẾ

## 21. Bảng quy chuẩn các Pattern đường dẫn trên hệ thống tệp

Mã nguồn thực tế của dự án tổ chức dữ liệu theo các phân vùng sau:

| Thư mục lưu trữ vật lý | Quy ước sinh tên file thực tế | Thành phần điều khiển | Mục đích nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `storage/{owner_id}/{uuid}.ext` | `{uuid4().hex}.{ext}` | `file_service.save_upload_file` | Tài liệu tải lên đơn lẻ của cá nhân (`POST /documents/upload`). |
| `storage/personal/{user_id}/{uuid}_{name}` | `{uuid4().hex}_{filename}` | `documents.upload_batch_documents` | Các tài liệu con trong gói Bundle cá nhân. |
| `storage/personal/{user_id}/from_group/{uuid}_{name}` | `{uuid4().hex}_{filename}` | `group_service.save_to_personal` | Tài liệu được thành viên lưu từ nhóm về kho cá nhân. |
| `storage/personal/{user_id}/from_community/{uuid}_{name}` | `{uuid4().hex}_{filename}` | `library.save_community_to_personal` | Tài liệu được người dùng tải từ Thư viện cộng đồng về kho. |
| `storage/groups/{group_id}/{uuid}_{name}` | `{uuid4().hex}_{filename}` | `groups.upload_group_batch_documents` & `group_service.copy_file` | Tài liệu tải lên trong Không gian nhóm hoặc chia sẻ vào nhóm. |
| `storage/community/{faculty}/{subject}/{uuid}_{name}` | `{uuid4().hex}_{filename}` | `library.contribute_document` | Tài liệu học liệu mở được duyệt xuất bản cho toàn trường. |
| `storage/orphaned/{workspace_id}/{uuid}_{name}` | Giữ nguyên tên an toàn | `scheduler.dissolve_workspace` | Lưu tạm tài liệu khi nhóm bị giải tán mà chưa ai sao lưu. |
| `storage/thumbnails/{doc_id}.jpg` | `{doc_id}.jpg` | `file_processor.create_thumbnail` | Ảnh bìa đại diện (Trang 1 PDF, ảnh resize 800x800). |
| `storage/markdowns/{doc_id}.md` | `{doc_id}.md` | `file_processor.generate_markdown` | Nội dung văn bản trích xuất (OCR/Text) phục vụ đọc nhanh. |

---

# PHẦN VII: VÒNG ĐỜI TÀI LIỆU: XÓA MỀM, KHÔI PHỤC VÀ DỌN RÁC TỰ ĐỘNG

## 22. Phân biệt Xóa mềm (Soft Delete) và Xóa vĩnh viễn (Hard Purge)

Trong các ứng dụng quản lý tài liệu doanh nghiệp hoặc thư viện trường học, việc xóa tài liệu là thao tác tiềm ẩn rủi ro rất cao nếu người dùng bấm nhầm. Do đó, hệ thống cài đặt quy trình **Vòng đời 2 giai đoạn**:

```
[ Active Document ] 
        │
        ├── (Thao tác Xóa thông thường: DELETE /documents/{id})
        ▼
[ Thùng Rác (Trash) - Soft Deleted ] ──────────────────┐
  - is_deleted = True                                  │ (Quá hạn 30 ngày)
  - deleted_at = Timestamp                            │
  - FILE VẬT LÝ VẪN GIỮ NGUYÊN TRÊN ĐĨA!               │
        │                                              ▼
        ├── (Thao tác Khôi phục)           [ Scheduler: cleanup_deleted_documents ]
        │   POST /trash/{id}/restore                   │
        ▼                                              │
[ Trở lại Active Document ]                            ▼
                                           [ XÓA VĨNH VIỄN (Hard Purge) ]
                                             - _safe_remove(child.file_path) (nếu là bundle)
                                             - _safe_remove(file_path)
                                             - _safe_remove(thumbnail_path)
                                             - _safe_remove(markdown_path)
                                             - db.delete(document) -> db.commit()
```

### Ý nghĩa của các trường Database liên quan **[Đang triển khai]**:
- `is_deleted` (Boolean, default=False): Cờ đánh dấu tài liệu đang hoạt động hay nằm trong thùng rác. Mọi truy vấn hiển thị tài liệu bình thường đều phải có điều kiện `is_deleted == False`.
- `deleted_at` (DateTime): Thời điểm chính xác tài liệu bị đưa vào thùng rác. Đây là mốc thời gian để Scheduler tính toán thời hạn 30 ngày.

---

## 23. Tiến trình khôi phục và Dọn rác tự động

### 23.1. Khôi phục tài liệu (Restore)
Tại `backend/app/routers/trash.py` (hàm `restore_document`):
Chỉ cần cập nhật cờ logic:
```python
document.is_deleted = False
document.deleted_at = None
await db.commit()
```
Không cần đụng chạm đến filesystem vì file vật lý chưa từng bị xóa. Quá trình diễn ra trong vài mili-giây.

### 23.2. Dọn rác tự động theo lịch (APScheduler Background Jobs) **[Đang triển khai]**
Tại `backend/app/jobs/scheduler.py`:
Tiến trình lập lịch nền `AsyncIOScheduler` được cấu hình khởi chạy cùng FastAPI:
1. **Lịch quét tài liệu nhóm mồ côi (`cleanup_orphaned_documents`)**:
   - Chạy lúc **00:00 hằng ngày** (`CronTrigger(hour=0, minute=0)`).
   - Quét các tài liệu `is_orphaned == True` và `orphaned_at < now - 10 ngày`.
   - Xóa file đĩa và xóa bản ghi DB.
2. **Lịch quét thùng rác tài liệu (`cleanup_deleted_documents`)**:
   - Chạy lúc **00:10 hằng ngày** (`CronTrigger(hour=0, minute=10)`).
   - Quét tất cả tài liệu: `is_deleted == True` và `deleted_at < now - 30 ngày` (**áp dụng cho cả kho cá nhân và kho nhóm**).
   - Xóa đệ quy: Nếu là Bundle cha, tìm tất cả con và xóa file vật lý của từng con trước.
   - Xóa file gốc (`file_path`), ảnh bìa (`thumbnail_path`), nội dung OCR (`markdown_path`) thông qua hàm an toàn `_safe_remove`.
   - Xóa bản ghi trong CSDL: `await db.delete(doc)`.

---

# PHẦN VIII: DANH MỤC VÀ GIẢI THÍCH CHI TIẾT CÁC HÀM CỐT LÕI

## 24. Bảng tra cứu các hàm cốt lõi **[Đang triển khai]**

| Tên hàm | File nguồn | Input chính | Trách nhiệm xử lý | Output | Tác động FS / DB |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `compute_file_checksum` | `app/utils/checksum.py` | `file_path: str` | Băm file trên đĩa cứng theo khối 8KB bằng SHA-256 | `str` (64 ký tự hex) | Chỉ đọc đĩa |
| `safe_remove` | `app/services/file_service.py` | `path: str \| None` | Xóa an toàn file đĩa, bỏ qua None, bundle ảo và lỗi OSError | `None` | Xóa file đĩa |
| `save_upload_file` | `app/services/file_service.py` | `upload: UploadFile`, `owner_id: int` | Lưu stream upload vào `storage/{owner_id}/{uuid}.ext` | `str` (đường dẫn file) | Ghi file mới |
| `create_document_from_upload`| `app/services/document_service.py` | `db`, `upload`, `owner_id`, `title`... | Đọc RAM, băm SHA-256, check trùng active & trash, ghi đĩa | `Document` ORM Model | Ghi file + Insert DB |
| `upload_document` | `app/routers/documents.py` | `file`, `title`, Form data... | Endpoint upload đơn cá nhân, bắt lỗi trùng 409, kích hoạt background | `DocumentOut` JSON | Gọi service + task |
| `upload_batch_documents` | `app/routers/documents.py` | `files: list`, `bundle_title`... | Endpoint upload gói bundle, lọc trùng từng file, trả về skipped | `BatchUploadOut` JSON | Ghi nhiều file + DB |
| `upload_group_batch_documents`| `app/routers/groups.py` | `group_id`, `files: list`... | Endpoint upload gói trong nhóm, check quyền, lọc trùng theo group | `BatchUploadOut` JSON | Ghi file nhóm + DB |
| `copy_file` | `app/services/group_service.py` | `src_path`, `dst_dir`, `filename` | Tạo thư mục đích, copy file vật lý bằng shutil.copy2 kèm UUID | `str` (đường dẫn mới) | Copy file đĩa |
| `share_document_to_group` | `app/services/group_service.py` | `document_id`, `workspace_id`... | Deep copy file từ cá nhân sang nhóm, tạo bản ghi Document mới | `Document` Model | Copy file + Insert DB |
| `hard_delete_document` | `app/routers/trash.py` | `document_id: int` | Endpoint xóa vĩnh viễn (purge), xóa sạch file vật lý đĩa trước khi xóa DB | HTTP 204 No Content | Xóa đĩa + Delete DB |
| `cleanup_deleted_documents` | `app/jobs/scheduler.py` | Không có (chạy ngầm) | Quét dọn tự động tài liệu rác quá hạn 30 ngày (cá nhân và nhóm) | `None` | Xóa đĩa + Delete DB |

---

## 25. Giải phẫu chi tiết các hàm trọng yếu

### 25.1. Hàm `create_document_from_upload`
- **1. Mục đích nghiệp vụ**: Đóng vai trò là "cổng kiểm soát" trung tâm khi tạo mới tài liệu từ file upload. Đảm bảo nguyên tắc: **Không bao giờ ghi file xuống đĩa nếu file đó bị trùng lặp**.
- **2. Vị trí kiến trúc**: Tầng nghiệp vụ dịch vụ (`Service Layer`), file `backend/app/services/document_service.py`.
- **3. Đầu vào**: `db: AsyncSession`, `upload: UploadFile`, `owner_id: int`, `title: str`, `description`, `category_id`, `workspace_id`, `tag_ids`, `content`, `thumbnail_path`.
- **4. Luồng xử lý chi tiết**:
  1. Gọi `content_bytes = await upload.read()` nạp dữ liệu vào RAM.
  2. Tính `checksum = hashlib.sha256(content_bytes).hexdigest()`.
  3. Xây dựng câu truy vấn kiểm tra trùng lặp trên PostgreSQL cho cả trạng thái `is_deleted = False` và `is_deleted = True`.
  4. Nếu tìm thấy bản ghi active $\rightarrow$ Ném lỗi `ValueError("duplicate_document:{id}")`.
  5. Nếu tìm thấy bản ghi trash $\rightarrow$ Ném lỗi `ValueError("in_trash:{id}:{title}")`.
  6. Khôi phục con trỏ đọc bằng `upload.file = io.BytesIO(content_bytes)`.
  7. Gọi `save_upload_file()` ghi file ra đĩa.
  8. Khởi tạo đối tượng ORM `Document`, gắn các quan hệ Tags nếu có, thực hiện `db.add()` và `db.flush()`.
- **5. Điều kiện rẽ nhánh**:
  - Nếu có `workspace_id`: Kiểm tra trong phạm vi `Document.workspace_id == workspace_id`.
  - Nếu không có `workspace_id`: Kiểm tra `Document.owner_id == owner_id AND Document.workspace_id.is_(None)`.
- **6. Đầu ra**: Đối tượng `Document` đã được flush (có `id` tạm thời từ sequence).
- **7. Tác động phụ**: Tạo một file vật lý trên đĩa cứng và chèn một bản ghi mới trong bảng `documents`.

---

# PHẦN IX: ĐÁNH GIÁ KIẾN TRÚC VÀ ĐỊNH HƯỚNG PHÁT TRIỂN

## 26. Các ưu điểm nổi bật của thiết kế hiện tại **[Nhận định kỹ thuật]**

1. **Bảo vệ đĩa cứng triệt để (Zero-Orphan-on-Duplicate)**: Bằng việc đảo thứ tự "Tính Checksum $\rightarrow$ Check DB $\rightarrow$ Mới ghi đĩa", hệ thống triệt tiêu hoàn toàn tình trạng tích tụ file rác khi người dùng vô tình hay cố ý upload lại file cũ.
2. **Trải nghiệm người dùng thông minh (Trash-Aware UX)**: Hệ thống không chỉ báo lỗi trùng đơn thuần mà còn thông minh nhận biết file đang nằm trong thùng rác, cung cấp cơ chế khôi phục 1 chạm trên giao diện Frontend.
3. **Phân vùng lưu trữ an toàn (UUID Sandboxing)**: Sử dụng UUID kết hợp phân tách thư mục theo User ID loại bỏ 100% rủi ro đè file hoặc tấn công Path Traversal.
4. **Xử lý nền tối ưu (Asynchronous Background Offloading)**: Các tác vụ nặng như trích xuất văn bản, chạy OCR tiếng Việt bằng Tesseract, convert trang đầu PDF sang ảnh bìa JPEG đều được đẩy sang `BackgroundTasks`, giúp API upload phản hồi cho người dùng trong vòng mili-giây.

---

## 27. Ma trận rủi ro kỹ thuật và biện pháp khắc phục **[Nhận định kỹ thuật]**

| Mã rủi ro | Cơ chế gây ra vấn đề | Điều kiện kích hoạt rủi ro | Mức độ tác động | Hướng xử lý đề xuất tương lai |
| :--- | :--- | :--- | :--- | :--- |
| **R-01: RAM Exhaustion** | Dùng `upload.read()` nạp toàn bộ file vào RAM tiến trình Python | Nhiều request đồng thời tải file lớn (> 50MB) | **CAO** (Có thể sập tiến trình Backend do OOM Killer) | Chuyển sang cơ chế hash stream theo chunk 64KB trực tiếp từ luồng request. |
| **R-02: Race Condition** | Hai request upload cùng 1 file được gửi đến server gần như cùng một tích tắc ($t_0$) | Cả hai tiến trình đều query DB thấy chưa có, sau đó cả hai cùng ghi đĩa và insert DB | **TRUNG BÌNH** (Tạo 2 bản ghi trùng nhau trong Database) | Bổ sung ràng buộc Unique Partial Index trên PostgreSQL: `CREATE UNIQUE INDEX ... ON documents(owner_id, checksum) WHERE is_deleted = False;` |
| **R-03: Disk Duplication** | Cơ chế `copy_file` (Deep Copy) khi chia sẻ tài liệu sang nhóm hoặc từ nhóm về cá nhân | Người dùng chia sẻ nhiều tài liệu dung lượng lớn | **TRUNG BÌNH** (Lãng phí dung lượng đĩa cứng của server) | Chuyển đổi sang kiến trúc Content-Addressed Storage (CAS) chia sẻ blob. |
| **R-04: Thiếu Storage Quota** | Không có trường kiểm tra tổng dung lượng tối đa của một User | Người dùng upload quá nhiều file làm đầy ổ cứng server | **CAO** (Server hết đĩa sẽ làm hỏng cả database) | Bổ sung bảng quản lý Quota, kiểm tra tổng `SUM(file_size)` trước khi cho phép ghi đĩa. |

---

## 28. Kiến trúc mục tiêu: Content-Addressed Storage (CAS) hoàn chỉnh **[Đề xuất tương lai]**

Để tiến tới một hệ thống cấp độ sản xuất (Production-grade), kiến trúc lưu trữ nên được tái cấu trúc theo mô hình **Content-Addressed Storage (CAS)** kết hợp **Đếm tham chiếu (Reference Counting)**:

```
+--------------------------------------------------------------------------------------------------+
|                              KIẾN TRÚC MỤC TIÊU: CAS STORAGE ENGINE                              |
|                                                                                                  |
| [ Document Metadata 1 ] ──┐                                                                      |
| (Kho cá nhân User A)      │                                                                      |
|                           ├──► [ BẢNG STORAGE_BLOBS ]              [ ĐĨA CỨNG VẬT LÝ ]           |
| [ Document Metadata 2 ] ──┤    - id: 501                           - storage/blobs/ab/cd/        |
| (Nhóm Nghiên cứu CSDL)    │    - checksum: "abcd1234..." ────────►   abcd1234...bin              |
|                           │    - file_size: 15 MB                  (DUY NHẤT 1 FILE VẬT LÝ       |
| [ Document Metadata 3 ] ──┘    - ref_count: 3                        TRÊN TOÀN SERVER)           |
| (Thư viện cộng đồng)                                                                             |
+--------------------------------------------------------------------------------------------------+
```

### Nguyên lý hoạt động:
1. **Lưu trữ Blob theo Hash**: File trên đĩa không đặt tên ngẫu nhiên mà đặt tên bằng chính Checksum của nó: `storage/blobs/ab/cd/{sha256}.bin`.
2. **Bảng trung gian `storage_blobs`**:
   - Chứa: `id`, `checksum`, `storage_path`, `file_size`, `ref_count`.
   - Bảng `documents` chỉ chứa thông tin nghiệp vụ và khóa ngoại `blob_id` trỏ vào bảng này.
3. **Quy trình Chia sẻ tài liệu (Zero-Copy Sharing)**:
   - Khi User chia sẻ tài liệu sang nhóm, hệ thống **hoàn toàn không copy file trên đĩa**. Hệ thống chỉ tạo một bản ghi `documents` mới trỏ vào `blob_id` cũ và thực hiện lệnh nguyên tử:
     `UPDATE storage_blobs SET ref_count = ref_count + 1 WHERE id = :blob_id;`
4. **Quy trình Xóa an toàn (Garbage Collection via Ref Count)**:
   - Khi một bản ghi tài liệu bị xóa vĩnh viễn (Hard Delete), hệ thống giảm:
     `UPDATE storage_blobs SET ref_count = ref_count - 1 WHERE id = :blob_id;`
   - Chỉ khi nào `ref_count == 0` (không còn bất kỳ người dùng, nhóm hay thư viện nào trỏ tới), tiến trình dọn dẹp mới thực sự gọi `os.remove()` để giải phóng đĩa cứng.

---

# PHẦN X: BỘ 25 CÂU HỎI - ĐÁP CHUYÊN SÂU PHỤC VỤ BẢO VỆ ĐỒ ÁN TỐT NGHIỆP

### Câu 1: Checksum là gì và tại sao hệ thống lại cần sử dụng checksum?
- **Trả lời ngắn gọn**: Checksum là một chuỗi ký tự cố định đại diện cho toàn bộ nội dung nhị phân của file. Hệ thống sử dụng checksum SHA-256 để định danh duy nhất nội dung tài liệu, phát hiện trùng lặp chính xác mà không phụ thuộc vào tên file.
- **Giải thích sâu**: Do hàm băm có tính chất xác định (deterministic), cùng một nội dung byte sẽ luôn cho ra cùng một checksum. Điều này cho phép hệ thống nhận diện việc người dùng tải lên cùng một tài liệu dù họ đã đổi tên file hiển thị.
- **Liên hệ mã nguồn**: Cột `Document.checksum` trong PostgreSQL được tính toán ngay khi nhận upload qua `hashlib.sha256(content_bytes).hexdigest()`.

### Câu 2: Tại sao không dùng tên file và kích thước (file size) để kiểm tra trùng lặp cho đơn giản?
- **Trả lời ngắn gọn**: Vì tên file và kích thước dễ gây ra cả dương tính giả (trùng tên/size nhưng khác nội dung) lẫn âm tính giả (cùng nội dung nhưng đổi tên).
- **Giải thích sâu**: Tên file là một thuộc tính tùy biến của người dùng. Hai người dùng khác nhau có thể cùng đặt tên `DeCuong.docx` cho hai môn học khác nhau. Ngược lại, người dùng tải cùng một file nhưng đổi tên từ `v1` sang `v2`. Chỉ có băm nội dung byte mới phản ánh trung thực bản chất của file.

### Câu 3: Thuật toán SHA-256 tạo ra chuỗi dài bao nhiêu bit và bao nhiêu ký tự Hexadecimal?
- **Trả lời ngắn gọn**: SHA-256 tạo ra chuỗi đầu ra có độ dài cố định là **256 bits**, tương đương với **32 bytes**, và được biểu diễn bằng **64 ký tự thập lục phân (hexadecimal)**.
- **Giải thích sâu**: Mỗi ký tự hex đại diện cho 4 bits ($16 = 2^4$). Do đó $256 / 4 = 64$ ký tự. Cột lưu trữ trong DB cần tối thiểu 64 ký tự.

### Câu 4: Hai file có cùng tên thì có chắc chắn trùng nội dung không?
- **Trả lời ngắn gọn**: Không. Tên file chỉ là siêu dữ liệu hiển thị (Metadata). Hai tài liệu có nội dung hoàn toàn khác biệt vẫn có thể mang cùng một tên gọi.

### Câu 5: Hai file có cùng checksum SHA-256 thì có khả năng nội dung khác nhau không?
- **Trả lời ngắn gọn**: Về mặt lý thuyết toán học là có (nguyên lý chuồng bồ câu), nhưng trên thực tế xác suất này nhỏ tới mức tiệm cận bằng 0 ($1 / 2^{256}$), được toàn bộ ngành khoa học máy tính coi là không thể xảy ra trong các ứng dụng thực tế.

### Câu 6: Nếu một tài liệu PDF 100 trang bị thay đổi chỉ một dấu chấm, checksum có bị thay đổi không?
- **Trả lời ngắn gọn**: Có, checksum sẽ thay đổi hoàn toàn do **Hiệu ứng tuyết lở (Avalanche Effect)**.
- **Giải thích sâu**: Trong SHA-256, một thay đổi dù chỉ 1 bit ở đầu vào sẽ khuếch tán qua 64 vòng nén logic, làm cho trung bình hơn 50% số bit đầu ra bị đảo lộn. Do đó, hệ thống sẽ coi đây là hai tài liệu hoàn toàn khác nhau.

### Câu 7: Việc đọc toàn bộ file vào RAM bằng `await upload.read()` có hợp lý không? Đánh đổi là gì?
- **Trả lời ngắn gọn**: Đây là một sự đánh đổi kỹ thuật. Thiết kế này giúp code đơn giản và kiểm tra trùng trước khi ghi đĩa, nhưng tiềm ẩn rủi ro tiêu tốn RAM khi có nhiều upload đồng thời hoặc file lớn.
- **Giải thích sâu**: Đánh đổi giữa tính đơn giản trong phát triển và khả năng chịu tải. Với đồ án có giới hạn file 50MB, giải pháp này chấp nhận được nhưng cần nâng cấp lên chunk streaming khi triển khai quy mô lớn.

### Câu 8: Độ phức tạp thời gian (Time Complexity) của thuật toán SHA-256 là gì?
- **Trả lời ngắn gọn**: Độ phức tạp thời gian là tuyến tính **$O(N)$**, trong đó $N$ là kích thước (số lượng byte) của file.
- **Giải thích sâu**: Thuật toán chia dữ liệu thành các khối 512-bit tuần tự. Số lượng khối cần xử lý tỉ lệ thuận trực tiếp với kích thước file.

### Câu 9: Lượng bộ nhớ RAM cần dùng tăng thế nào khi đọc toàn bộ file vào RAM?
- **Trả lời ngắn gọn**: Lượng RAM tăng tuyến tính **$O(N)$** theo kích thước file. Thậm chí trong Python, do việc tạo biến `bytes` và bọc `io.BytesIO`, mức tiêu thụ RAM có thể gấp 2 đến 3 lần kích thước thực tế của file trong thời gian ngắn.

### Câu 10: Nếu có 20 người cùng lúc upload file 50MB, điều gì có thể xảy ra với server?
- **Trả lời ngắn gọn**: Server có thể tiêu tốn từ 2GB đến 3GB RAM tức thời. Nếu server cấu hình thấp, hệ điều hành sẽ kích hoạt **OOM Killer** làm sập tiến trình Backend.

### Câu 11: Tại sao hệ thống lại kiểm tra checksum TRƯỚC KHI ghi file ra đĩa?
- **Trả lời ngắn gọn**: Để ngăn ngừa triệt để tình trạng tạo ra **file rác mồ côi (Disk Leak)** trên đĩa cứng khi upload bị từ chối do trùng lặp.
- **Giải thích sâu**: Nếu ghi file ra đĩa trước rồi mới check DB, khi check thấy trùng và raise Exception, file vừa ghi sẽ nằm lại trên đĩa vĩnh viễn nếu không có cơ chế dọn dẹp phức tạp đi kèm.

### Câu 12: Tại sao kiểm tra trùng lặp lại phải kiểm tra cả những tài liệu đang nằm trong thùng rác (`is_deleted == True`)?
- **Trả lời ngắn gọn**: Vì file vật lý của tài liệu trong thùng rác vẫn tồn tại trên đĩa cứng. Kiểm tra này giúp phát hiện và cho phép người dùng **khôi phục nhanh** thay vì tạo thêm một bản ghi và ghi thêm một file trùng lặp.

### Câu 13: Tại sao phạm vi kiểm tra trùng lặp của Kho cá nhân và Không gian nhóm lại khác nhau?
- **Trả lời ngắn gọn**: Do ranh giới bảo mật và ngữ cảnh nghiệp vụ. Kho cá nhân là riêng tư (kiểm tra theo từng `owner_id`), trong khi nhóm là sở hữu tập thể (kiểm tra theo `workspace_id` bất kể ai trong nhóm tải lên).

### Câu 14: Việc hệ thống phát hiện trùng lặp có đồng nghĩa với việc hệ thống đang dùng chung file vật lý không?
- **Trả lời ngắn gọn**: **Không**. Hệ thống hiện tại chỉ là phát hiện trùng lặp và từ chối upload (Duplicate Detection). Mỗi tài liệu hợp lệ ở các không gian khác nhau vẫn có một file vật lý riêng biệt trên đĩa.

### Câu 15: Điều gì xảy ra nếu hai người dùng cùng bấm upload một file giống hệt nhau vào cùng một tích tắc?
- **Trả lời ngắn gọn**: Có thể xảy ra hiện tượng **Race Condition (Tranh chấp điều kiện)**. Cả hai luồng xử lý cùng lúc query thấy chưa có file, sau đó cả hai cùng ghi đĩa và insert DB, dẫn đến hai bản ghi trùng nhau. Để khắc phục triệt để cần Unique Constraint ở mức Database.

### Câu 16: Nếu file đã ghi xuống đĩa thành công nhưng câu lệnh `db.commit()` bị lỗi thì sao?
- **Trả lời ngắn gọn**: Hệ thống sẽ rơi vào trạng thái file mồ côi. Trong hàm `upload_batch_documents`, dự án đã cài đặt khối `except` để quét danh sách các file vừa ghi và gọi `os.remove()` nhằm rollback lại filesystem.

### Câu 17: Tại sao ứng dụng không lưu thẳng file nhị phân vào cột `BYTEA/BLOB` của PostgreSQL?
- **Trả lời ngắn gọn**: Để bảo vệ hiệu năng bộ nhớ đệm (Buffer Pool), tránh phình to nhật ký giao dịch (WAL log), và tận dụng các cơ chế streaming truyền file tốc độ cao (Zero-copy) của hệ điều hành.

### Câu 18: Sự khác biệt bản chất giữa Soft Delete và Hard Delete là gì?
- **Trả lời ngắn gọn**: Soft Delete chỉ cập nhật trạng thái `is_deleted = True` trong database (file đĩa giữ nguyên), cho phép khôi phục tức thì. Hard Delete sẽ xóa vĩnh viễn file trên đĩa cứng và xóa dòng dữ liệu khỏi database.

### Câu 19: Tại sao các tác vụ như OCR, trích xuất text và sinh thumbnail lại cần chạy bằng Background Tasks?
- **Trả lời ngắn gọn**: Vì các tác vụ này tiêu tốn nhiều CPU và thời gian (vài giây đến vài chục giây). Nếu chạy đồng bộ (Synchronous), HTTP request sẽ bị treo (blocked), dẫn đến trải nghiệm người dùng cực kỳ chậm chạp và có nguy cơ Gateway Timeout.

### Câu 20: Nếu chuyển từ Local Filesystem sang Object Storage (S3/MinIO), kiến trúc ứng dụng cần thay đổi những gì?
- **Trả lời ngắn gọn**: Thay thế các hàm thao tác file POSIX (`open`, `os.remove`, `shutil`) bằng AWS S3 SDK (`boto3` / `aioboto3`). Backend trở thành Stateless Server, cho phép mở rộng không giới hạn số lượng instance.

### Câu 21: Bundle document có file vật lý trên đĩa cứng không?
- **Trả lời ngắn gọn**: **Không**. Bundle cha là một bản ghi quản lý ảo, trường `file_path` được gán giá trị đặc biệt `"__bundle__"`, chỉ có các tài liệu con bên trong bundle mới có file vật lý thực sự.

### Câu 22: Cơ chế dọn rác tự động của scheduler xử lý tài liệu bundle như thế nào để tránh disk leak?
- **Trả lời ngắn gọn**: Trước khi xóa bản ghi bundle cha, hàm `cleanup_deleted_documents` sẽ truy vấn tìm tất cả các document con có `bundle_parent_id == doc.id`, duyệt qua từng con để xóa sạch file vật lý, thumbnail, markdown của con trước, sau đó mới xóa cha.

### Câu 23: Làm thế nào để ngăn chặn tấn công Path Traversal khi lưu file người dùng upload?
- **Trả lời ngắn gọn**: Không bao giờ sử dụng tên file gốc từ client để làm đường dẫn lưu trữ. Hệ thống sử dụng `uuid.uuid4().hex` để sinh tên file ngẫu nhiên và lưu trong thư mục phân vùng an toàn.

### Câu 24: Tại sao hệ thống lại tạo thêm file markdown (`storage/markdowns/{doc_id}.md`) sau khi upload?
- **Trả lời ngắn gọn**: Nhằm phục vụ tính năng đọc văn bản nhanh và tìm kiếm toàn văn (Full-Text Search). Nội dung sau khi trích xuất được định dạng lại dạng Markdown để Frontend hiển thị tức thì mà không cần load toàn bộ file gốc nặng nề.

### Câu 25: Điểm yếu lớn nhất của cơ chế chia sẻ tài liệu (`share_document_to_group`) hiện tại là gì?
- **Trả lời ngắn gọn**: Là việc sử dụng **Deep Copy** (`copy_file` sang thư mục nhóm). Điều này làm nhân đôi dung lượng đĩa cứng cho cùng một nội dung tài liệu. Hướng khắc phục là chuyển sang kiến trúc CAS dùng chung blob.

---

# PHẦN XI: THUẬT NGỮ CHUYÊN NGÀNH VÀ TÀI LIỆU THAM KHẢO

## 30. Bảng đối chiếu thuật ngữ chuyên ngành Anh - Việt

| Thuật ngữ tiếng Anh | Nghĩa tiếng Việt chuẩn trong tài liệu | Giải thích ngữ cảnh |
| :--- | :--- | :--- |
| **Checksum / Message Digest** | Giá trị kiểm tra / Mã băm | Chuỗi ký tự cố định đại diện cho nội dung file. |
| **Cryptographic Hash Function**| Hàm băm mật mã học | Hàm toán học một chiều biến đổi chuỗi byte bất kỳ thành mã băm cố định. |
| **Deduplication** | Khử trùng lặp / Phát hiện trùng lặp | Kỹ thuật phát hiện hoặc loại bỏ các khối dữ liệu bị lặp lại. |
| **Content-Addressed Storage (CAS)**| Lưu trữ định danh theo nội dung | Kiến trúc lưu trữ gán địa chỉ file bằng chính mã băm nội dung của nó. |
| **Reference Counting** | Biến đếm tham chiếu | Kỹ thuật quản lý bộ nhớ/file bằng cách đếm số lượng liên kết đang trỏ tới đối tượng. |
| **Soft Delete / Hard Delete** | Xóa mềm / Xóa vĩnh viễn | Ẩn dữ liệu logic trong DB vs Xóa sạch vật lý trên đĩa cứng. |
| **Buffer Pool** | Vùng đệm bộ nhớ đệm | Phân vùng RAM của DBMS dùng để cache các trang dữ liệu từ đĩa. |
| **Path Traversal** | Tấn công duyệt thư mục | Lỗ hổng bảo mật sử dụng ký tự `../` để truy cập file ngoài phạm vi cho phép. |
| **Zero-Copy** | Kỹ thuật sao chép trực tiếp | Cơ chế truyền dữ liệu từ đĩa ra card mạng mà không copy qua tầng ứng dụng. |

## 31. Tài liệu tham khảo kỹ thuật chính thức

1. **NIST FIPS 180-4**: *Secure Hash Standard (SHS)* - Tiêu chuẩn liên bang Hoa Kỳ về các thuật toán băm bảo mật (SHA-1, SHA-224, SHA-256, SHA-512).
2. **Python Software Foundation**: *Python `hashlib` Module Official Documentation* - Hướng dẫn sử dụng thư viện băm tiêu chuẩn và OpenSSL wrapper.
3. **Starlette / FastAPI Documentation**: *Request Data and `UploadFile` Implementation* - Cơ chế quản lý bộ nhớ đệm SpooledTemporaryFile trong ASGI Framework.
4. **PostgreSQL Global Development Group**: *PostgreSQL 15 Documentation - Chapter on Storage and Write-Ahead Logging (WAL)* - Tài liệu tối ưu lưu trữ nhị phân và nhật ký giao dịch.
5. **Silberschatz, Galvin, Gagne**: *Operating System Concepts (10th Edition)* - Kiến trúc hệ thống tệp, Inodes và quản lý khối lưu trữ.

---
---
### 1. NGUYÊN TẮC CỐT LÕI CỦA KIẾN TRÚC BẠN YÊU CẦU
   Tầng                       | Cơ chế hoạt động
  ----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
   Database (Logic)           | Độc lập hoàn toàn giữa các không gian:• User A (cá nhân), User B (cá nhân), Nhóm 1, Nhóm 2, Kho cộng đồng đều sở hữu bản ghi Document riêng.• Mỗi bản ghi có title, description, owner_id,
                              | workspace_id, tags, quyền sửa/xóa hoàn toàn độc lập, không ai đụng chạm ai.
   Storage (Cloudflare R2)    | Duy nhất một file vật lý (Single-Instance):• Dù có 10 hay 100 bản ghi Document ở các không gian khác nhau, nếu nội dung tệp giống nhau (cùng checksum SHA-256), tất cả đều trỏ chung vào đúng 1
                              | file_path trên Cloudflare R2.• Không bao giờ upload lại file binary nếu checksum đã có trên hệ thống.
   Vòng đời & Xóa (Lifecycle) | Reference Counting (Kiểm tra tham chiếu):• Khi một bản ghi bị xóa vĩnh viễn, hệ thống đếm xem còn bản ghi Document nào khác (ở cá nhân khác, nhóm khác hay kho cộng đồng) đang dùng chung file_path đó
                              | không.• Nếu còn ≥ 1 bên dùng: Chỉ xóa record DB của bên yêu cầu xóa, giữ nguyên 100% file vật lý trên R2.• Nếu không còn ai dùng (count = 0): Mới thực sự xóa file trên R2.
  ──────
  ### 2. PHÂN TÍCH 5 KỊCH BẢN CỤ THỂ THEO ĐÚNG YÊU CẦU CỦA BẠN

  #### Kịch bản 1: Cùng 1 người upload file vào Cá nhân rồi upload vào Nhóm

  • Tại Cá nhân: User upload file X. File X chưa có trên R2 → Upload lên R2, tạo Document #1 (cá nhân).
  • Tại Nhóm: User upload file X vào nhóm.
      • Kiểm tra trùng nghiệp vụ: Nhóm này chưa có file X → Cho phép.
      • Kiểm tra Storage: Thấy file X đã tồn tại trên R2 (nhờ kiểm tra checksum toàn hệ thống) → Không upload R2 nữa, tạo Document #2 (của nhóm) nhưng gán thẳng file_path, thumbnail_path, markdown_path của Document #1.
  • Kết quả: User thấy tài liệu xuất hiện ở cả 2 nơi bình thường, nhưng trên R2 chỉ tốn dung lượng đúng 1 lần.

  #### Kịch bản 2: Hai người lạ không quen biết, khác nhóm cùng upload 1 file

  • User A upload file tài liệu môn học vào kho riêng của A → Lưu R2, tạo Document A.
  • User B (ở trường khác, nhóm khác) cũng upload đúng file đó → Hệ thống nhận diện checksum đã tồn tại trên R2 → Không upload lên R2, tạo Document B riêng của User B trỏ vào file đã có.
  • User A và User B không hề nhìn thấy tài liệu của nhau, nhưng Cloudflare R2 tiết kiệm được 50% dung lượng.

  #### Kịch bản 3: Chia sẻ từ Kho cá nhân vào Nhóm (share_document_to_group)

  • Khi chọn "Chia sẻ vào nhóm": Tạo riêng một Document mới thuộc về nhóm (workspace_id = group_id), gán source_document_id = doc_gốc.id và trỏ chung vào file_path của kho cá nhân.
  • Không copy tệp vật lý: Sau này nhóm có sửa tên, xóa vĩnh viễn khỏi nhóm thì kho cá nhân của người chia sẻ hoàn toàn không bị ảnh hưởng.

  #### Kịch bản 4: Xóa vĩnh viễn (Hard delete / Purge / Tự động dọn dẹp sau 30 ngày)

  • Khi gọi DELETE /trash/{doc_id}/purge hoặc Scheduler dọn rác 30 ngày:
      • Trước khi gọi hàm xóa R2, chạy truy vấn:
        SELECT COUNT(*) FROM documents WHERE file_path = :file_path AND id != :doc_id;

      • Nếu Count > 0: (Vẫn còn bản ghi khác trỏ vào):
          • → Chỉ xóa bản ghi Document trong Database.
          • → Bỏ qua việc xóa file vật lý trên R2. Các bên khác vẫn xem/tải file bình thường.
      • Nếu Count == 0: (Không còn ai trỏ vào file này nữa):
          • → Xóa bản ghi Database.
          • → Gọi s3_client.delete_object xóa sạch file trên Cloudflare R2 (giải phóng dung lượng triệt để).
      • Làm tương tự cho cả thumbnail_path và markdown_path.


  #### Kịch bản 5: Bảo vệ "Kho tài liệu cộng đồng" (Community Library)

  • Tài liệu thuộc kho cộng đồng là những tài liệu có is_public == True (đã được Admin duyệt qua CommunitySubmission).
  • Quy tắc phân quyền: Người dùng thông thường không có quyền xóa tài liệu cộng đồng (chỉ Admin mới có quyền xóa).
  • Đảm bảo tính toàn vẹn: Nếu người dùng tải tài liệu từ cộng đồng về cá nhân, hoặc người đóng góp ban đầu xóa file trong kho cá nhân của họ → Nhờ cơ chế Reference Check ở Kịch bản 4, file vật lý trong kho cộng đồng không bao giờ
  bị mất.