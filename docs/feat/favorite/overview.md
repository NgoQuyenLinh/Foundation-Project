# Tổng quan tính năng Yêu thích (Favourites Overview)

## Mục tiêu tính năng

Cho phép người dùng đánh dấu các tài liệu quan trọng để theo dõi tiến độ đọc cá nhân, ghi chú và phân loại bằng các thẻ riêng biệt mà không làm thay đổi hay ảnh hưởng đến dữ liệu gốc của tài liệu.

---

## Phạm vi triển khai

| Thành phần | Chi tiết thực hiện |
|---|---|
| **Backend** | Migration Alembic, ORM Model `Favorite` & `favorite_tags`, Pydantic Schemas, FastAPI Router `/favorites/` |
| **Frontend** | Zustand Store `useFavoriteStore`, API Service `favoriteService`, Giao diện `FavoritesPage` (1115 dòng), tích hợp đồng bộ `DocumentCard`, `DocumentContextMenu`, `DocumentListView` |
| **Database** | Bảng `favorites`, bảng liên kết `favorite_tags` (CASCADE), tích hợp bảng `tags` với `owner_id` |

---

## Kiến trúc hệ thống

```
┌────────────────────────────────────────────────────────────────────────┐
│  Frontend Layer (React + Vite + Zustand + TanStack Query)              │
│                                                                        │
│  useFavoriteStore (Zustand Global State)                               │
│  ├── favoriteIds: number[]      ← Nguồn sự thật trạng thái tim (♥)     │
│  ├── loadFavorites()            ← Khởi tạo khi đăng nhập/khôi phục     │
│  ├── toggleFavorite(docId)      ← Optimistic Update + Rollback nếu lỗi │
│  └── clearFavorites()           ← Dọn dẹp khi đăng xuất                │
│                                                                        │
│  favoriteService                ← API Client giao tiếp backend         │
│  FavoritesPage                  ← Giao diện trung tâm (Lưới/Danh sách) │
│  DocumentCard (File/Bundle)     ← Tim đỏ + viền rose khi yêu thích     │
│  DocumentContextMenu            ← Nhãn động "Yêu thích"/"Bỏ yêu thích" │
│  DocumentListView               ← Highlight hàng + Tim đỏ đồng bộ      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP Requests (Bearer JWT)
┌───────────────────────────────────▼────────────────────────────────────┐
│  Backend Layer (FastAPI + Pydantic v2 + SQLAlchemy Async)              │
│                                                                        │
│  Prefix: /favorites                                                    │
│  ├── GET    /stats              ← Thống kê tiến độ đọc (to_read...)    │
│  ├── GET    /tags               ← Danh sách thẻ & gợi ý tìm kiếm       │
│  ├── GET    /ids                ← Danh sách ID hợp lệ đã yêu thích     │
│  ├── GET    /                   ← Danh sách phân trang + lọc + sắp xếp │
│  ├── POST   /                   ← Thêm tài liệu vào yêu thích          │
│  ├── PATCH  /{document_id}      ← Cập nhật trạng thái / ghi chú / thẻ  │
│  ├── DELETE /{document_id}      ← Xóa khỏi yêu thích (Cascade thẻ)     │
│  ├── POST   /{document_id}/tags ← Gắn thẻ (tìm theo tên hoặc tạo mới)  │
│  └── DELETE /{document_id}/tags/{tag_id} ← Gỡ thẻ (giữ thẻ gốc)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Async Engine
┌───────────────────────────────────▼────────────────────────────────────┐
│  Database Layer (PostgreSQL)                                           │
│                                                                        │
│  ├── favorites (user_id, document_id, reading_status, notes...)        │
│  ├── favorite_tags (user_id, document_id, tag_id) [Index ix_tag_id]    │
│  └── tags (id, name, owner_id, workspace_id, color)                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Các quy tắc nghiệp vụ cốt lõi

1. **Trạng thái đọc (`reading_status`):**
   - Chỉ chấp nhận 3 giá trị: `'to_read'` (Đọc sau), `'reading'` (Đang đọc), `'completed'` (Đã đọc).
   - Kiểm soát nghiêm ngặt bởi CHECK constraint DB và Literal trong Pydantic schema / TypeScript types.
2. **Giới hạn số lượng thẻ:** Mỗi tài liệu yêu thích chỉ được gắn tối đa **10 thẻ**.
3. **Bảo toàn thẻ khi gỡ:** Gỡ thẻ khỏi tài liệu yêu thích chỉ xóa dòng liên kết trong `favorite_tags`, **không xóa** bản ghi trong bảng `tags`.
4. **Bảo mật quyền truy cập:** Thao tác trên tài liệu không thuộc quyền xem của người dùng luôn trả mã lỗi **404 Not Found** (không dùng 403 để tránh lộ ID tài liệu).
5. **Thẻ cá nhân:** Thẻ tạo từ trang yêu thích có `workspace_id IS NULL` và `owner_id = current_user.id`.
6. **Xử lý trùng tên thẻ:** Không ràng buộc Unique index toàn cục trên `tags.name`. Code tự động tìm thẻ cùng tên không phân biệt hoa thường (Case-insensitive) và ưu tiên thẻ có `id` nhỏ nhất trước khi quyết định tạo mới.
7. **Đồng bộ giao diện thời gian thực:** Trạng thái yêu thích sử dụng cơ chế **Optimistic Update** thông qua `useFavoriteStore`, phản hồi ngay trên UI mà không cần tải lại trang.

---

## Cấu trúc thư mục tài liệu

```
docs/feat/favorite/
├── README.md        # Mục lục và định hướng tra cứu tài liệu
├── overview.md      # Tổng quan kiến trúc, quy tắc nghiệp vụ và luồng dữ liệu
├── api.md           # Đặc tả chi tiết 9 RESTful endpoints kèm request/response
├── database.md      # Thiết kế cơ sở dữ liệu, quan hệ bảng và migration
├── user-guide.md    # Hướng dẫn thao tác người dùng cuối
└── testing.md       # 19 kịch bản kiểm thử tự động và ma trận bảo mật
```
