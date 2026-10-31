# Hướng Dẫn Sử Dụng: Quản Lý Tài Liệu Yêu Thích & Tiến Độ Đọc

Chức năng **Tài liệu yêu thích** giúp bạn lưu trữ, theo dõi tiến độ đọc sách/tài liệu và phân loại tài liệu bằng hệ thống thẻ (tags) cá nhân linh hoạt, đồng bộ tức thời trên toàn bộ hệ thống.

---

## 1. Đánh dấu Yêu thích & Nhận diện Trực quan

### 1.1. Cách đánh dấu / bỏ yêu thích:
- **Trên thẻ tài liệu (DocumentCard):** Nhấn vào biểu tượng Trái tim ở góc trên bên phải của thẻ tài liệu.
- **Trong Menu chuột phải (Context Menu):** Nhấp chuột phải hoặc bấm nút 3 chấm `...` và chọn **"Thêm vào Yêu thích"** hoặc **"Bỏ yêu thích"**.
- **Trên trang Yêu thích:** Bấm vào biểu tượng trái tim đỏ trên thẻ tài liệu để bỏ yêu thích ngay lập tức.

### 1.2. Nhận diện trực quan đồng nhất:
- **Tài liệu đã yêu thích:**
  - Biểu tượng trái tim **màu đỏ, đã tô đặc**.
  - **Viền hồng/đỏ nhạt** bao quanh thẻ tài liệu (`border-rose-300 ring-1 ring-rose-200 shadow-rose-50`) giúp nhận ra ngay tài liệu đã yêu thích ở cả giao diện Sáng (Light) và Tối (Dark).
  - Menu chuột phải tự động đổi nhãn thành **"Bỏ yêu thích"**.
- **Tài liệu chưa yêu thích:**
  - Biểu tượng trái tim dạng **viền rỗng** màu xám (xuất hiện khi rê chuột).
  - Viền thẻ tiêu chuẩn theo định dạng tệp.
  - Menu chuột phải hiển thị nhãn **"Thêm vào Yêu thích"**.

> **Cập nhật tức thời (Optimistic Update):** Khi bạn bấm tim ở bất kỳ trang nào (Trang Tài liệu cá nhân, Trang Nhóm, Trang Yêu thích hay Menu ngữ cảnh), trạng thái sẽ được cập nhật ngay lập tức mà không cần tải lại trang. Nếu có lỗi mạng, hệ thống sẽ tự động hoàn tác và hiển thị thông báo.

---

## 2. Truy cập Trang Yêu Thích
- Trên thanh điều hướng bên trái (Sidebar), nhấn chọn mục **Yêu thích** (biểu tượng trái tim) trong nhóm *Thư mục cá nhân*, hoặc truy cập đường dẫn `/personal/favorites`.
- Trang hiển thị đầy đủ thông tin tệp tin (tên, loại file, dung lượng, ngày tạo/cập nhật, chủ sở hữu, hình ảnh thu nhỏ) **giống hệt trang Tài liệu**, kèm thêm phần mở rộng quản lý tiến độ đọc, ghi chú và thẻ.

---

## 3. Thống Kê & Lọc Nhanh Tiến Độ Đọc
Ở đầu trang, 4 thẻ thống kê hiển thị trực quan số lượng tài liệu theo tiến độ:
- **Tất cả yêu thích**: Toàn bộ tài liệu bạn đã đánh dấu.
- **Đọc sau**: Tài liệu chờ đọc (màu vàng hổ phách).
- **Đang đọc**: Tài liệu bạn đang nghiên cứu (màu xanh dương).
- **Đã đọc**: Tài liệu đã hoàn thành (màu xanh lá).

> **Mẹo:** Nhấn trực tiếp vào bất kỳ thẻ thống kê nào để lọc nhanh danh sách tài liệu tương ứng.

---

## 4. Chuyển đổi Giao diện Lưới & Danh sách (Grid / List View)
- Trên thanh công cụ, bạn có thể chuyển đổi giữa:
  - **Dạng Lưới (Grid):** Hiển thị trực quan với thẻ DocumentCard và khung quản lý tiến độ, ghi chú bên dưới.
  - **Dạng Danh sách (List):** Hiển thị dạng bảng rút gọn thông tin file và thẻ, thao tác tải nhanh và mở menu ngữ cảnh.

---

## 5. Quản Lý Tiến Độ Đọc Trên Từng Tài Liệu
Tại mỗi thẻ tài liệu:
1. Tìm mục **Tiến độ đọc**.
2. Nhấn vào ô chọn trạng thái và chọn một trong 3 trạng thái:
   - **Đọc sau** (`to_read`)
   - **Đang đọc** (`reading`)
   - **Đã đọc** (`completed`)
3. Hệ thống sẽ tự động lưu lại và cập nhật số liệu thống kê ở đầu trang.

---

## 6. Ghi Chú Cá Nhân (Notes)
- **Thêm ghi chú:** Nhấn nút **+ Thêm** tại khung *Ghi chú*.
- **Sửa / Xóa ghi chú:** Nhấn nút **Sửa** để mở cửa sổ chỉnh sửa:
  - Nhập nội dung cần ghi nhớ (tối đa 5000 ký tự).
  - Nhấn **Lưu ghi chú** để lưu lại.
  - Nhấn **Xóa ghi chú** nếu không còn nhu cầu lưu nội dung.

---

## 7. Gắn và Gỡ Thẻ Cá Nhân (Tagging)
- **Gắn thẻ mới:**
  1. Nhấn nút **+ Gắn thẻ** trên thẻ tài liệu.
  2. Gõ tên thẻ mới (ví dụ: `#ToanCaoCap` hoặc `OnThi`) hoặc chọn nhanh từ danh sách *Gợi ý thẻ đã dùng*.
  3. Nhấn **+ Thêm** hoặc nhấn vào thẻ gợi ý để gán vào tài liệu (mỗi tài liệu tối đa 10 thẻ).
- **Gỡ thẻ:** Nhấn vào biểu tượng dấu **×** nhỏ bên cạnh tên thẻ để gỡ thẻ ra khỏi tài liệu yêu thích (thẻ gốc trong kho thẻ vẫn được bảo toàn).
- **Lọc theo thẻ:** Sử dụng thanh lọc thẻ ở đầu trang để xem các tài liệu có cùng chủ đề. Nếu chọn nhiều thẻ, bạn có thể chuyển đổi giữa chế độ *Chứa một trong số thẻ* hoặc *Chứa tất cả thẻ*.

