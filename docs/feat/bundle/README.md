# Document Bundle Feature

## Overview
Tính năng "Document Bundle" cho phép nhóm nhiều tài liệu (documents) lại thành một gói (bundle). Các tài liệu bên trong bundle có chung các siêu dữ liệu với bundle cha (như tags) và có thể được quản lý, xem, tải xuống dưới dạng một tập hợp. Gói tài liệu có thể được xử lý qua thao tác upload nhiều file cùng lúc (batch upload), thêm tài liệu sau, hoặc gom các tài liệu đã có ở kho cá nhân vào chung một gói.

## Key Features
- **Batch Upload**: Tải lên nhiều file cùng lúc, tự động tạo thành một bundle và gán các file làm children.
- **Tree-style List View**: Hiển thị thư mục con bên trong danh sách tài liệu với dạng tree expand/collapse (nút Chevron).
- **Tag Synchronization**: Quản lý tags ở cấp độ bundle và tự động đồng bộ (cascade) xuống tất cả các tài liệu con.
- **Bundle Modification**: Thêm file mới vào gói, thêm tài liệu cá nhân sẵn có vào gói, đổi tên gói, xóa gói (đồng thời chuyển children vào thùng rác), tách file ra khỏi gói.
- **Download ZIP**: Tải toàn bộ nội dung của gói tài liệu dưới dạng file nén ZIP.

## Document Structure
1. [DATABASE.md](./DATABASE.md) - Cấu trúc cơ sở dữ liệu và Model
2. [API.md](./API.md) - Chi tiết các RESTful API endpoints 
3. [FRONTEND.md](./FRONTEND.md) - Cấu trúc component và UI frontend
4. [BUSINESS_RULES.md](./BUSINESS_RULES.md) - Các quy tắc nghiệp vụ quan trọng
