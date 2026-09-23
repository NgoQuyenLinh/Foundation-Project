# Business Rules: Document Bundle

1. **Hierarchy (Cấp bậc)**
   - Hệ thống hiện tại chỉ hỗ trợ Bundle một cấp (Depth = 1).
   - Bundle không thể chứa một Bundle khác (Không có Sub-bundle).

2. **Dung lượng (File Size)**
   - Dung lượng `file_size` của Bundle Parent luôn là **tổng** dung lượng của các Children.
   - Bất cứ khi nào thêm/xoá/tách file khỏi bundle, tổng dung lượng này phải được tính toán lại trên DB (Backend).

3. **Tags Synchronization (Đồng bộ Tags)**
   - Bundle Parent đóng vai trò là container chính. Bất kỳ Tag nào gán cho Parent sẽ được tự động đồng bộ (ghi đè) lên tất cả Children.
   - Khi chỉnh sửa Tag trên Parent, hệ thống xoá tag cũ và ghi tag mới cho Parent cũng như toàn bộ Children của nó.
   - Khi Children mới được add vào Bundle, nó tự động kế thừa Tags từ Bundle Parent.

4. **Trạng thái Soft Delete**
   - Xóa một Bundle Parent sẽ đồng thời trigger xoá mềm (`is_deleted = True`) cho tất cả Children của nó.
   - Tuy nhiên, tính năng tách (Remove from bundle) chỉ gỡ liên kết `bundle_parent_id = None`, đưa tài liệu trở lại là tài liệu đơn lẻ trong kho cá nhân mà KHÔNG xoá mềm nó.

5. **Lưu trữ ZIP**
   - File ZIP được nén *on-the-fly* bằng in-memory buffer thông qua `io.BytesIO`. Không có file `.zip` thật sự nào được ghi xuống ổ đĩa, giúp tiết kiệm dung lượng lưu trữ dài hạn và giảm tải dọn dẹp (cleanup).
