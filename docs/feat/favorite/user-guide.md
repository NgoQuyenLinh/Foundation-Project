# Hướng dẫn sử dụng Tính năng Yêu thích (User Guide)

Tài liệu này hướng dẫn chi tiết cách sử dụng toàn bộ tính năng **Yêu thích tài liệu**, theo dõi tiến độ đọc, ghi chú và gắn thẻ cá nhân trong Hệ thống Thư viện số.

---

## 1. Yêu thích / Bỏ yêu thích tài liệu

### Đánh dấu yêu thích ở mọi nơi
Bạn có thể đánh dấu yêu thích hoặc bỏ yêu thích tài liệu từ:
- **Trang Tài liệu cá nhân (`/personal/documents`)**
- **Trang Tài liệu được chia sẻ (`/personal/shared-with-me`)**
- **Thư mục / Không gian nhóm**
- **Trang Yêu thích (`/personal/favorites`)**

### Dấu hiệu nhận biết
- **Đã yêu thích:** Biểu tượng trái tim màu đỏ đặc ($\heartsuit$), thẻ tài liệu có đường viền hồng nổi bật (`border-rose-300`).
- **Chưa yêu thích:** Biểu tượng trái tim viền xám rỗng, chỉ hiện khi rê chuột hoặc theo thiết kế mặc định.

### Cách thao tác
1. **Bấm trực tiếp vào icon trái tim ($\heartsuit$):** Nằm ở góc trên bên phải của từng thẻ tài liệu (`DocumentCard`) hoặc ở hàng danh sách (`DocumentListView`).
2. **Qua menu ngữ cảnh (chuột phải / nút 3 chấm):**
   - Chọn **"Thêm vào Yêu thích"** nếu tài liệu chưa được yêu thích.
   - Chọn **"Bỏ yêu thích"** nếu tài liệu đã có trong danh sách yêu thích.
3. **Cập nhật tức thì (Optimistic Update):** Trạng thái trái tim và viền tài liệu cập nhật ngay lập tức trên màn hình. Nếu kết nối mạng gián đoạn, hệ thống sẽ tự động hoàn tác và thông báo lỗi.

---

## 2. Trang Quản lý Yêu thích (`/personal/favorites`)

Truy cập menu **"Yêu thích"** từ thanh điều hướng bên trái (Sidebar).

### A. Thống kê tiến độ đọc (Stats Cards)
Đầu trang hiển thị 4 thẻ thống kê tổng quan:
- **Tất cả yêu thích:** Tổng số tài liệu đang lưu trữ trong danh sách yêu thích.
- **Đọc sau (To Read):** Số tài liệu chưa bắt đầu đọc (màu vàng hổ phách - Amber).
- **Đang đọc (Reading):** Số tài liệu đang trong quá trình đọc (màu xanh dương - Blue).
- **Đã đọc (Completed):** Số tài liệu đã hoàn thành (màu xanh lá - Emerald).

> **Mẹo:** Bấm trực tiếp vào từng thẻ thống kê để lọc nhanh danh sách tài liệu theo trạng thái tương ứng.

### B. Tìm kiếm, Bộ lọc & Sắp xếp
- **Tìm kiếm:** Gõ từ khóa vào ô tìm kiếm để tra cứu theo **Tiêu đề tài liệu** hoặc **Nội dung ghi chú cá nhân**.
- **Chuyển chế độ xem:** Nút chuyển đổi góc phải hỗ trợ 2 chế độ:
  - **Dạng Lưới (Grid View):** Thẻ tài liệu đầy đủ kèm thông tin file, thumbnail, tiến độ đọc, ghi chú và thẻ.
  - **Dạng Danh sách (List View):** Xem dạng bảng thu gọn, hiển thị hàng loạt tài liệu.
- **Sắp xếp:**
  - *Mới yêu thích nhất* (mặc định)
  - *Cũ nhất*
  - *Tên tài liệu (A - Z)*
  - *Tên tài liệu (Z - A)*
- **Lọc theo thẻ (Tags Filter):** Bấm chọn một hoặc nhiều thẻ cá nhân để lọc tài liệu. Khi chọn từ 2 thẻ trở lên, bạn có thể chuyển chế độ:
  - *Chứa một trong số thẻ (Any)*
  - *Chứa tất cả thẻ (All)*

---

## 3. Quản lý Tiến độ đọc & Ghi chú cá nhân

### Đổi tiến độ đọc
Trên mỗi thẻ tài liệu ở chế độ Lưới:
1. Tìm phần **"Tiến độ đọc"** ở góc dưới thẻ.
2. Bấm vào menu chọn trạng thái để đổi nhanh:
   - **Đọc sau** (`to_read`)
   - **Đang đọc** (`reading`)
   - **Đã đọc** (`completed`)
3. Hệ thống tự động cập nhật ngay lập tức và đồng bộ số liệu thống kê trên đầu trang.

### Thêm & Chỉnh sửa Ghi chú
1. Bấm nút **"+ Ghi chú"** (hoặc nút **"Sửa"** nếu đã có ghi chú).
2. Hộp thoại ghi chú mở ra:
   - Nhập tóm tắt, ý chính hoặc lưu ý cần nhớ (hỗ trợ tối đa **5000 ký tự**).
   - Có bộ đếm ký tự thời gian thực.
3. Bấm **"Lưu ghi chú"**.
4. Để xóa ghi chú: Bấm **"Xóa ghi chú"** góc trái hộp thoại.

---

## 4. Quản lý Thẻ cá nhân (Tags)

### Gắn thẻ cho tài liệu
1. Bấm nút **"+ Gắn thẻ"** trên thẻ tài liệu yêu thích.
2. Trong hộp thoại:
   - **Chọn thẻ gợi ý:** Bấm vào các thẻ bạn đã từng dùng hiển thị bên dưới.
   - **Tạo thẻ mới:** Nhập tên thẻ vào ô tìm kiếm (vd: `AI`, `ToanCaoCap`), hệ thống tự bỏ tiền tố `#` nếu có, sau đó bấm **"+ Thêm"**.
3. Mỗi tài liệu yêu thích gắn được tối đa **10 thẻ**.

### Gỡ thẻ khỏi tài liệu
- Bấm vào dấu **$\times$** nhỏ bên cạnh tên thẻ trên thẻ tài liệu.
- **Lưu ý:** Thao tác này chỉ gỡ thẻ khỏi tài liệu yêu thích đó, **không xóa** thẻ khỏi danh mục thẻ cá nhân của bạn.
