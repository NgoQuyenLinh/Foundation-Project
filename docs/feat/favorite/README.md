# Tài liệu Tính năng Yêu thích (Favourites Feature Documentation)

Thư mục này chứa toàn bộ tài liệu kỹ thuật, thiết kế dữ liệu, API và hướng dẫn sử dụng cho tính năng **Yêu thích tài liệu (Favourites)** của Hệ thống Thư viện số.

---

## Danh mục tài liệu

| Tên file | Nội dung tóm tắt |
|---|---|
| [**overview.md**](file:///c:/Users/Admin/Downloads/Foundation-Project/docs/feat/favorite/overview.md) | **Tổng quan tính năng:** Kiến trúc hệ thống, phạm vi, luồng đồng bộ Optimistic và các quy tắc nghiệp vụ quan trọng. |
| [**api.md**](file:///c:/Users/Admin/Downloads/Foundation-Project/docs/feat/favorite/api.md) | **Đặc tả API:** Chi tiết 9 endpoints của backend FastAPI (`/favorites/*`), cấu trúc Request/Response, Query params và mã lỗi. |
| [**database.md**](file:///c:/Users/Admin/Downloads/Foundation-Project/docs/feat/favorite/database.md) | **Cơ sở dữ liệu:** Lược đồ bảng `favorites`, `favorite_tags`, `tags`, cấu hình CASCADE, Indexes và Alembic migrations. |
| [**user-guide.md**](file:///c:/Users/Admin/Downloads/Foundation-Project/docs/feat/favorite/user-guide.md) | **Hướng dẫn sử dụng:** Thao tác thả tim, quản lý tiến độ đọc, ghi chú cá nhân, gắn thẻ và chuyển đổi chế độ xem Grid/List. |
| [**testing.md**](file:///c:/Users/Admin/Downloads/Foundation-Project/docs/feat/favorite/testing.md) | **Kiểm thử:** Bảng kết quả 19 kịch bản kiểm thử tự động Pytest, kiểm tra build TypeScript và ma trận kiểm soát quyền hạn. |

---

## Tóm tắt nhanh về công nghệ

- **Backend:** FastAPI, SQLAlchemy 2.0 (Async), Pydantic v2, PostgreSQL (Alembic).
- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Zustand (Global state), TanStack Query v5.
- **Store Quản lý tim:** `useFavoriteStore` (`src/stores/favoriteStore.ts`).
- **Giao diện trung tâm:** `FavoritesPage.tsx` (`src/pages/personal/FavoritesPage.tsx`).
