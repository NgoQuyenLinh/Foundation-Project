# DESIGN_SYSTEM.md — Tài liệu hóa giao diện hiện tại (Frontend)

> **Phạm vi tài liệu này:** Đây là bản **DOCUMENTATION** — mô tả *code hiện đang làm gì*,
> không phải thiết kế mới. Mọi giá trị below đều đọc trực tiếp từ source code trong
> `frontend/digital-library/src/` ở thời điểm tạo file.
> Nếu code thay đổi, tài liệu này phải được cập nhật theo.

---

## 1. Purpose

- Mô tả toàn bộ design tokens, layout shell, component inventory, interaction patterns,
  responsive breakpoints, iconography và routing **đang tồn tại trong code**.
- Làm **nguồn tham khảo duy nhất** khi AI/dev phát triển UI mới để UI mới khớp
  với UI đã có, tránh mỗi lần làm một kiểu khác.
- Ghi rõ các **mâu thuẫn đã biết** (Known Inconsistencies) để không vô tình nhân rộng
  pattern sai — nhưng **không tự sửa** ngoài phạm vi được yêu cầu.

---

## 2. Tech Stack (UI-related)

| Hạng mục | Giá trị thực tế |
|---|---|
| Framework | React 19 + Vite + TypeScript (strict) |
| CSS | **Tailwind CSS v4** qua plugin `@tailwindcss/vite`; theme chính khai báo trong `@theme` của `src/index.css` |
| Config song song | `tailwind.config.ts` (kiểu v3, **có thể không được load** vì không có `@config` trong index.css) — chứa cùng bảng primary màu |
| Router | `react-router-dom` v7 (`BrowserRouter`) |
| Server state | `@tanstack/react-query` |
| Client state | `zustand` (`authStore`, `toastStore`) |
| Icons | **`lucide-react` duy nhất** — không dùng thư viện icon khác |
| Charts | `recharts` (donut ProcessingDonut) |
| Class merge | `clsx` + `tailwind-merge` qua helper `cn()` (`src/utils/cn.ts`) |
| Variant helper | `cva` (Button) |
| Font | **Inter** — Google Fonts import trong `index.html` (weights 400–800), khai báo `--font-sans: "Inter", sans-serif` trong `@theme` |
| Path alias | `@` → `./src` (`vite.config.ts`) |

---

## 3. Design Tokens

Nguồn thật: `src/index.css` (`@theme` block + base layer). `tailwind.config.ts` chỉ là bản sao.

### 3.1 Color — Primary (Green, 5 cấp được khai báo)

| Token | Hex | Ghi chú |
|---|---|---|
| `primary-50` | `#EFF8F1` | nền nhạt (active nav, chip, icon tile) |
| `primary-100` | `#DCEFE0` | nền hover/active nhẹ (Sidebar active, Avatar bg) |
| `primary-500` | `#3A8348` | viền focus phụ, dot trạng thái, ProgressBar fill |
| `primary-600` | `#2F6B3C` | **màu chính**: Button primary, link hover, active tab, focus ring |
| `primary-700` | `#245530` | chữ trên nền primary-50 (tag text, scope pill) |

**Không được khai báo** nhưng code vẫn dùng (sẽ không sinh class → vô hiệu):
`primary-200`, `primary-300`, `primary-400`, `primary-800`, `primary-900`.
Gặp ở: App.tsx (`border-primary-200`), Sidebar (`hover:bg-primary-400`),
AuthLayout (`shadow-primary-900/10`), InviteModal (`border-primary-200`), GroupSwitcher (`primary-800`).

### 3.2 Color — Trung tính & semantic (dùng trực tiếp từ palette chuẩn Tailwind)

- Nền trung tính: `bg-white` (card/header/sidebar), `bg-gray-50` (`#f9fafb` — nền app,
  set trong base layer `body`), `bg-gray-100` (segmented control, divider nhẹ).
- Border: `border-gray-200` (mặc định), `border-gray-100` (menu/popover), `border-gray-300` (input).
- Text: `gray-900` (title), `gray-800` (card title), `gray-700` (nav/section title),
  `gray-600` (body/menu), `gray-500` (mô tả/meta), `gray-400` (placeholder/label yếu).
- Danger: `red-500` (badge, heart fill), `red-600` (nút danger, chữ destructive),
  `red-50` (bg cảnh báo nhẹ), text `red-500` (required marker).
- Semantic chart (donut `src/mocks/stats.ts`): primary `#3A8348`, các màu còn lại
  dùng hex Tailwind standard (amber/orange/slate/rose/blue/cyan…).
- Accent phụ dùng rải rác: `amber-*` (cảnh báo nhóm), `rose-500` (yêu thích/heart),
  `blue-500`/`cyan-500`/`purple-500` (bảng chọn màu thư mục/tag — hex Material:
  `#4CAF50 #2196F3 #F59E0B #9C27B0 #EF4444 #06B6D4 #F97316 #64748B`).

### 3.3 Typography

| Cấp | Class thường gặp | Dùng ở đâu |
|---|---|---|
| Page H1 | `text-2xl font-bold` / `text-xl font-semibold` | GroupList vs TrashPage/SettingsPage (**khác nhau — xem §14**) |
| Page desc | `text-sm text-gray-500` | dưới H1 |
| Section H2 | `text-sm font-semibold text-gray-700` | header block (Tài liệu, Thư mục…) |
| Card title | `text-base|lg font-semibold` | modal title, card lớn |
| Nav item | `text-sm font-medium` | Sidebar, dropdown item |
| Body | `text-sm` (`14px`) | đa số UI |
| Meta/xs | `text-xs`, `text-[11px]`, `text-[10px]`, `text-[8px]` | meta dòng dưới card, badge nhỏ |
| Section label | `text-[10px] uppercase font-medium text-gray-400` | tiêu đề nhóm trong Sidebar |
| Số liệu lớn | `text-3xl font-bold` | StatCard value |
| Icon text | `text-lg font-bold` | logo chữ "L" |

### 3.4 Spacing & layout rhythm

- Page padding (main): `p-6 md:p-8`.
- Header height: `h-16`.
- Khoảng cách stack trang chính: `flex flex-col gap-6`.
- Section separation: `mb-3` (title↔content), `mt-6` (pagination), `gap-4` (card grid),
  `gap-3` (list nhỏ), `gap-2/gap-1` (inline).
- Padding card: `p-5` (Card chuẩn), `p-6` (modal body), `p-3.5` (FolderCard).
- Padding nút: `px-4`, size sm `px-3`, icon button `p-2`.
- Giá trị spacing đặc biệt: `pb-70` (= 17.5rem) ở cuối section documents (dùng để chừa chỗ — pattern riêng của codebase).

### 3.5 Border radius (tần suất đo được trong src/)

| Class | Số lần | Dùng cho |
|---|---|---|
| `rounded-lg` | 81 | **radius mặc định**: button, input, nav item, menu item, filter, modals nhỏ |
| `rounded-xl` | 49 | **radius card**: Card, DocumentCard, FolderCard, EmptyState, context menu lớn |
| `rounded-full` | 47 | avatar, badge/tag pill, icon button tròn, dot |
| `rounded-md` | 16 | chip nhỏ, ext badge, nút icon hành động row |
| `rounded-2xl` | 6 | modal lớn (CreateFolder/Upload/Rename) |
| `rounded-sm` | 1 | hiếm |

→ Quy tắc: **input/button/nav = `rounded-lg`; card/popover/modal = `rounded-xl` (modal lớn `rounded-2xl`); pill = `rounded-full`.**

### 3.6 Shadow (tần suất đo được)

| Class | Số lần | Dùng cho |
|---|---|---|
| `shadow-sm` | 32 | Card mặc định, ViewToggle active, box nhẹ |
| `shadow-xl` | 15 | **modal overlay panel** |
| `shadow-xs` | 8 | DocumentCard mặc định (viền nhẹ trước khi hover) |
| `shadow-lg` | 7 | dropdown/popover menu |
| `shadow-md` | 6 | DocumentCard hover, FolderCard selected, mobile drawer |

### 3.7 Focus / interactive state

- Focus chuẩn (Input/Button): `focus:border-primary-500 focus:ring-1 focus:ring-primary-500`
  hoặc `focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2`.
- Hover card: `-translate-y-1 shadow-md` + border đổi sang `primary-300/50`.
- Disabled: `opacity-50 pointer-events-none`.
- Đang fetch grid: `opacity-60 pointer-events-none`.

### 3.8 Custom utilities (index.css)

- `.custom-scrollbar`: thanh cuộn `4px`, thumb `#cbd5e1`, rounded — dùng cho list tag.
- Base: `body { background: #f9fafb }`.
- Animations `animate-in fade-in zoom-in-95 slide-in-from-top-2` được dùng ở menu/modal
  **nhưng `tw-animate-css` không được import** → class có thể không sinh hiệu lực (xem §14).

---

## 4. Application Shell / Layout

### 4.1 MainLayout (`src/layouts/MainLayout.tsx`)

```
<div class="h-screen flex overflow-hidden bg-gray-50">
  ├─ Sidebar desktop: <aside class="hidden md:block h-full bg-white border-r border-gray-200">
  ├─ <div class="flex-1 flex flex-col min-w-0">
  │    ├─ <Header class="h-16 border-b border-gray-200 bg-white px-6">
  │    └─ <main class="flex-1 overflow-y-auto p-6 md:p-8">   ← cuộn ở đây
  └─ Mobile drawer: fixed inset-0 overlay bg-gray-900/40 + panel w-[260px] bg-white shadow-xl
```

- Sidebar desktop **ẩn dưới `md`**; mobile dùng hamburger (trong Header, `md:hidden`) mở drawer.
- Sidebar có 3 trạng thái: expanded `260px`, collapsed `72px`, mobile drawer `260px`.
  Trạng thái desktop **persist vào `localStorage`**; có resize handle (min 72 / max 300).
- Khối `<main>` là vùng scroll duy nhất; header/sidebar đứng yên.

### 4.2 AuthLayout (`src/layouts/AuthLayout.tsx`)

- 2 cột: hero trái (55%, ẩn `< lg`), form phải (`max-w-[420px]` căn giữa).
- Hero palette: `#F7FAF7` / `#F1F6F1`, texture chấm bi, logo + tagline + lưới feature 2 cột.
- Form bên phải: trắng, có nút ngôn ngữ + toggle theme góc trên phải.
- Không dùng MainLayout (không sidebar/header app).

### 4.3 Header (`src/components/shared/Header.tsx`)

- 3 vùng: **left** (hamburger mobile `md:hidden` + logo tile `h-8 w-8 rounded-lg bg-primary-600`
  chữ "L" + tên "Digital Library" ẩn `< sm`), **center** (SearchBar, ẩn `< sm`), **right**.
- Right: scope pill (`rounded-full bg-primary-50 px-3 py-1.5` + dot `h-2 w-2 bg-primary-500`
  + label `text-primary-700`), nút chuông (`Bell h-5`, badge đỏ `h-4 w-4 text-[10px]`,
  hiển thị `99+` nếu > 99), divider `border-l`, Avatar + tên/role (`text-sm font-semibold`
  / `text-xs text-gray-500`, ẩn tên `< md`), nút logout icon.
- `scopeLabel` và `notificationCount` được truyền từ MainLayout (hiện hardcode
  "Cá nhân" và `2`).

### 4.4 Sidebar (`src/components/shared/Sidebar.tsx`)

- 3 nhóm section, mỗi nhóm có label `text-[10px] uppercase`:
  1. **Phạm vi truy cập**: Cá nhân `/personal`, Nhóm `/groups`, Lớp `/class`,
     Khoa `/faculty`, Trường `/school` (icons: User, Users, BookOpen, GraduationCap, Building2).
  2. **Thư mục cá nhân**: Dashboard `/personal/dashboard`, Tài liệu `/personal/documents`,
     Đã chia sẻ với tôi `/personal/shared`, Yêu thích `/personal/favorites`,
     Thùng rác `/personal/trash`.
  3. **Cuối sidebar**: Thống kê `/stats`, Cài đặt hệ thống `/settings`.
- Nav item: `h-10 rounded-lg text-sm font-medium`; active = `bg-primary-100 text-primary-600`;
  hover = `bg-gray-100` (thực tế một số chỗ ghi `hover:bg-primary-400` — token không tồn tại).
- Badge đỏ dạng số ở mục có lời mời; mỗi item có `title` tooltip khi collapsed.
- Nút thu gọn sidebar (`ChevronLeft/ChevronRight`) ở khu vực section 3.

---

## 5. Component Inventory — `src/components/ui/` (nguyên tử)

| Component | File | API / Variants | Chi tiết style |
|---|---|---|---|
| **Button** | `Button.tsx` | `variant: primary \| outline \| ghost \| danger`, `size: default \| sm \| lg \| icon`, `asChild?`, `loading?` | primary: `bg-primary-600 text-white hover:bg-primary-700`; outline: `border-gray-300 bg-white hover:bg-gray-50`; ghost: `hover:bg-gray-100`; danger: `bg-red-600 hover:bg-red-700`. Cao: default `h-10`, sm `h-8`, lg `h-12`, icon `h-10 w-10`. Radius `rounded-lg`, font `text-sm font-medium`, focus `ring-primary-600`, disabled `opacity-50`. |
| **Card** | `Card.tsx` | `className?` | `rounded-xl border border-gray-200 bg-white p-5 shadow-sm` |
| **Input** | `Input.tsx` | `icon?`, chuẩn input | `h-10 rounded-lg border-gray-200 px-3 text-sm`; có icon → `pl-10`; focus `ring-primary-600 border-primary-500` |
| **Badge** | `Badge.tsx` | `variant: default \| primary \| success \| danger \| warning` | pill `rounded-full px-2 py-0.5 text-xs font-medium`; default bg `gray-100`/`gray-700`, primary 50/700, success green, danger red, warning amber |
| **Tag** | `Tag.tsx` | `label`, `onRemove?` | `rounded-full bg-primary-50 text-primary-700 px-3 py-1`, nút X delete |
| **Avatar** | `Avatar.tsx` | `name`, `src?`, `size: sm \| default \| lg` | `rounded-full bg-primary-100 text-primary-700 font-medium`, initials; cao `h-8` / `h-10` / `h-12` |
| **Dropdown** | `Dropdown.tsx` | `trigger`, `items[{icon,label,onClick,danger?}]` | panel `min-w-[208px] rounded-lg border-gray-100 bg-white shadow-lg py-1`; item `px-4 py-2 text-sm hover:bg-gray-50`; danger `text-red-600 hover:bg-red-50`, separator `border-t` |
| **ProgressBar** | `ProgressBar.tsx` | `value` 0–100, `color?` | track `h-1.5 rounded-full bg-gray-100`, fill `bg-primary-500 transition-all duration-300` |

> **Lưu ý tồn tại:** tồn tại file shadcn mồ côi `digital-library/@/components/ui/button.tsx`
> (dùng `@base-ui/react` + CSS vars không tồn tại) — **không được import ở đâu**, không phải
> Button của dự án.

---

## 6. Component Inventory — `src/components/shared/` (gắn nghiệp vụ)

| Component | Vai trò | Style / pattern chính |
|---|---|---|
| `Header.tsx` | Thanh trên cùng | xem §4.3 |
| `Sidebar.tsx` | Điều hướng | xem §4.4 |
| `SearchBar.tsx` | Tìm kiếm header | `h-10 rounded-lg bg-gray-50 border`; focus → `bg-white ring-1 ring-primary-500`; **Ctrl/Cmd+K** focus全局; debounce 300ms; dropdown gợi ý `rounded-xl shadow-xl max-h-80`; footer CTA full-text search |
| `DocumentCard.tsx` | Card tài liệu (grid) | `w-full h-[280px] rounded-xl border border-gray-200/80 bg-white shadow-xs`; preview zone `h-[135px]` nền pastel theo loại file; ext badge góc trên-trái `rounded-md text-[10px] font-bold uppercase`; thumbnail hoặc `FileIcon h-14 w-14`; title `text-sm font-semibold text-gray-800` clamp 2 dòng, hover → `primary-600`; meta `text-[11px] text-gray-400` + dot separator; tag chips max 3 + `+N`; context menu **`opacity-0 group-hover:opacity-100`**; hover: `-translate-y-1 shadow-md border-primary-300/50` |
| `DocumentRow.tsx` | Dòng list | `flex items-center py-3 border-b border-gray-100 hover:bg-gray-50`; FileIcon + tên `text-sm font-semibold` + meta `text-xs text-gray-500`; cột owner `w-16 hidden sm:block`, size `w-20 text-right` |
| `DocumentListView.tsx` | List view đầy đủ | header cột `text-xs font-medium text-gray-400 border-b`; grid `grid-cols-12` (title 5 / type 2 / updated 2 / owner 1 / size 1 / actions 1); sort theo cột; hàng `group`; actions hiện khi hover (`opacity-0 group-hover:opacity-100`): Heart (chỉ workspace personal, filled `rose-500` khi đã thích) + Download + ContextMenu (personal → `DocumentContextMenu`, group → `GroupDocumentContextMenu`) |
| `DocumentContextMenu.tsx` | Menu hành động tài liệu | trigger `MoreVertical h-5 w-5` ghost; menu **portal** `fixed z-[9999] min-w-[180px] rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg animate-in`; item `rounded-lg px-3 py-2 text-xs font-medium` + icon; danger `text-red-600 hover:bg-red-50` có separator; đóng khi click-outside / scroll / resize |
| `FolderContextMenu.tsx` | Menu thư mục | cùng pattern; panel `min-w-[160px] rounded-lg py-1 text-sm` |
| `FolderCard.tsx` | Card thư mục | `h-[96px] rounded-xl p-3.5`; icon tile `h-10 w-10 rounded-lg` nền `color + "12"` (hex alpha), icon Folder `fill-current opacity-18`; count `text-xs text-gray-400`; tag chips `text-[10px]`; **selected**: `border-primary-500 bg-primary-50/20 shadow-md min-w-[320px] max-w-[480px]`, unselected `flex-1 min-w-[210px] max-w-[300px]`; keyboard `Enter/Space`, `role="button"` |
| `FileIcon.tsx` | Icon loại file | tile `h-10 w-10 rounded-lg`; mapping: pdf `red-50/red-500` FileText, doc `blue` FileText, ppt `orange` FileType, xlsx `primary-50/600` FileSpreadsheet, zip `yellow-50/yellow-600` FileArchive, image `blue-50` FileImage, code/drawio `cyan` FileCode, default `gray-100/gray-500` File |
| `EmptyState.tsx` | Trạng thái rỗng | `border border-dashed border-gray-300 rounded-xl p-12 text-center`; icon box `h-12 w-12 rounded-full bg-primary-50 text-primary-600`; title `text-base font-semibold`, desc `text-sm text-gray-500 max-w-sm mx-auto`; optional action Button |
| `CardSkeleton.tsx` | Skeleton | variant `folder` (tile `h-10 w-10` + line) / `document` (`aspect-[1/0.82]` block 60% + 2 line) — `bg-gray-100 animate-pulse rounded-lg` |
| `ViewToggle.tsx` | Chuyển grid/list | segmented `bg-gray-100 rounded-lg p-1`, 2 nút icon `rounded-md`, active `bg-white text-primary-600 shadow-sm`; lưu preference qua `useViewPreference` (localStorage) |
| `DocumentTypeTabs.tsx` | Tabs loại file | underline: `flex gap-6 border-b border-gray-200`; item `pb-3 text-sm`, active `border-b-2 border-primary-600 text-primary-600 font-semibold`, inactive `text-gray-600 hover:text-gray-900` |
| `DocumentFilterBar.tsx` | Thanh filter | search `flex-1 min-w-[240px]` + cụm `DynamicFilterDropdown` + nút Upload (`ml-auto`) |
| `DynamicFilterDropdown.tsx` | Dropdown 1 filter | trigger `rounded-lg border px-3 py-2 text-sm`; active `border-primary-500 bg-primary-50 text-primary-700`; menu `w-48 max-h-60 rounded-lg shadow-lg`, item check `text-primary-600` |
| `CreateFolderModal.tsx` | Tạo/sửa thư mục | overlay `fixed inset-0 z-50 bg-black/40 backdrop-blur-sm`; panel `max-w-md rounded-2xl bg-white shadow-xl animate-in`; header `border-b px-6 py-4` + step "1 / 3" + X tròn; form `px-6 py-5 gap-5`; input `rounded-lg border-gray-300 focus:ring-1 focus:ring-primary-500`; **bảng 8 màu** (Material hex, xem §3.2); tag picker: search + chip chọn (`bg-primary-600 text-white` khi selected) + "Tạo mới" dashed; footer `justify-end gap-3` Hủy(outline)/Tiếp theo(primary) |
| `UploadModal.tsx` | Tải file lên | shell giống trên nhưng `max-w-md rounded-2xl`; dropzone `border-2 border-dashed rounded-xl p-6`, hover `border-primary-400 bg-primary-50`; preview file, lỗi `bg-red-50`, form metadata + tag chips; footer Hủy/Tải lên |
| `RenameDocumentModal.tsx` | Đổi tên | `max-w-sm rounded-2xl p-6`; **Enter submit / Escape đóng** |
| `DeleteFolderConfirmModal.tsx` | Xác nhận xóa | overlay `bg-black/30`, panel `rounded-xl`; ghi chú nền xanh; nút destructive override `bg-red-600` |
| `DocumentDetail.tsx` | Trang chi tiết (widget) | back link (ArrowLeft); grid `lg:grid-cols-[1fr_320px] gap-6`; trái: Card + tabs (Chi tiết/Nội dung/Mô tả/Ghi chú/Hoạt động) + iframe preview `h-[700px]`; phải: Card info (Table 2 cột), tag pills, stats (`Download/Eye/Heart`), Card hành động (list nút) — Xóa dùng `window.confirm` + variant danger; 4 chỗ dùng `alert()/confirm` |
| `ProcessingDonut.tsx` | Donut chart | recharts `Pie` outer 60 / inner 45 / `paddingAngle=2`, viewBox 128, center % `text-xl font-bold`; legend rows dot + label + count |
| `StatCard.tsx` | Stat card | `rounded-xl bg-white p-5 shadow-sm flex gap-4`; icon tile `h-12 w-12 rounded-xl` (inline style bg); label `text-sm text-gray-500`, value `text-3xl font-bold`, sublabel `text-xs text-gray-400` |
| `TagDistribution.tsx` | Phân bổ tag | rows: tên + count + ProgressBar primary |
| `ProtectedRoute.tsx` | Guard route | chưa login → redirect `/login` |
| `trash/*` | Bộ thùng rác | `TrashStatCard`, `TrashEmptyState`, `TrashConfirmModal` (overlay `bg-black/30 backdrop-blur-sm`, panel `rounded-xl max-w-md shadow-xl`), `TrashBatchRow`, `MobileTrashBatch` (chỉ `md:hidden`), `index.ts` re-export |
| `group/NotificationCard.tsx` | Card thông báo nhóm | border-left theo type; **hiện chưa trang nào import** |

> File **rỗng (0 byte)** — tồn tại nhưng chưa có UI: `PermissionBadge.tsx`,
> `NotificationDropdown.tsx`.

---

## 7. Component Inventory — Page-level (`src/pages/**/components/`)

### Personal (`pages/personal/`)

| Component | Ghi chú |
|---|---|
| `PersonalFoldersSection` | Row thư mục **ngang scroll** (`overflow-x-auto`), card `h-96px` + card dashed "Tạo thư mục" |
| `PersonalDocumentsSection` | Header (H2 + ViewToggle); **grid** `grid-cols-2 sm:2 md:3 lg:4 xl:5 gap-4` (10 skeleton khi loading); list → `DocumentListView`; **pagination** `mt-6 flex justify-between border-t border-gray-200 pt-4 text-sm` — trái "Trang X / Y • Tổng N tài liệu", phải 2 nút outline sm (Trước/Sau) — hiện chỉ render nếu `total_pages > 1`. ⚠️ Hàm `toListItem` bị **định nghĩa 2 lần** trong cùng component (bug, chưa sửa) |
| `PersonalUploadModal` / `PersonalFolderModalContainer` | Bọc `UploadModal` / `CreateFolderModal` + logic API personal |
| `DeleteFolderConfirmModal` | Xác nhận xóa thư mục (dùng modal style §6) |

### Group (`pages/group/components/`)

| Component | Ghi chú |
|---|---|
| `GroupSwitcher` | Avatar tile `h-14 w-14 rounded-xl` + tên `text-xl font-bold` (truncate) + chevron; dropdown panel `w-[420px] rounded-2xl shadow-xl` chứa search + list nhóm + role chip |
| `GroupDocumentsSection` | Folder row (giống personal) + `ViewToggle` + grid 2→5 cột; link "Tất cả tài liệu" quay về list nhóm |
| `GroupDocumentCard` | Bọc `DocumentCard` shared; ⚠️ `basePath` trỏ `/group/...` (**sai route** `/groups`) |
| `LocalGroupDocumentCard` | **Duplicate** markup DocumentCard với chiều cao `290px` + avatar người upload |
| `DocumentsTab` | Tương tự personal: filter + folder + grid + list (có cột Owner) |
| `MembersTab` | Bảng `min-w-[760px]`, thead `bg-gray-50 text-xs`; badge vai trò (Admin/Member…); dropdown settings per-row; hành động "Xóa" dạng text đỏ; mobile dùng card `md:hidden` |
| `RequestsTab` | Card grid `lg:grid-cols-2`; nút Chấp nhận (primary sm) / Từ chối (outline sm) |
| `SettingsTab` | Grid `lg:grid-cols-[1fr_360px]`; form bên trái; **Danger Zone** Card: `border-red-200 bg-red-50/30`, title `text-red-600`, nút danger giải thể nhóm |
| `TrashTab` | Dùng lại bộ `components/shared/trash/*` |
| `NotificationCard` | Card thông báo unread: `bg-primary-50/30 border-primary-500` |
| `GroupDocumentContextMenu` | Menu theo quyền (`permission` prop) |
| `InviteModal` | Nhập email + vai trò; hiện `alert()` kết quả |
| `SimpleShareModal` | Chia sẻ nhanh link/quyền |
| `GroupUploadModal` / `GroupFolderModalContainer` | Bọc modal chung + API nhóm |
| `groupSpace.types` | Types tab/group |

### Khác

- `pages/shared/DocumentBrowser.tsx`: shell duyệt tài liệu — tabs underline **inline** (tự viết lại, không dùng `DocumentTypeTabs`), folder grid `sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3`.
- `pages/settings/SettingsPage.tsx`: header `text-xl font-semibold`; Card + tabs underline có icon; form `max-w-md`; input style local `inputClass` (không dùng `Input` component); validation inline `text-red-500 text-xs`; **Toast cục bộ** `fixed bottom-6 right-6 rounded-xl px-4 py-3 shadow-lg` bg `green-600|red-600` text white; bảng `ROLE_LABELS`.
- `pages/group/GroupList.tsx`: H1 `text-2xl font-bold` + nút "Tạo nhóm" primary; icon tabs; search `max-w-md`; list card row (`h-12 w-12 rounded-xl bg-primary-50` icon) + role badge + nút outline "Vào không gian"; skeleton/empty; `CreateGroupModal` với radio cards.
- `pages/group/GroupSpace.tsx`: back link; header Card (GroupSwitcher + Dropdown "+ Thêm tài liệu"); warning amber giải thể; **pill tab bar** `bg-gray-100/80 p-1.5 rounded-xl` — active `bg-white text-primary-700 shadow-sm ring-1 ring-gray-200`, inactive `text-gray-500 hover:text-gray-700`; tabs điều khiển `?tab=documents|members|requests|settings|trash` (settings/trash owner-only).
- `pages/search/SearchPage.tsx`: `max-w-4xl mx-auto`; input `h-12` + nút sm inline; card kết quả `rounded-xl border shadow-sm`, hover lift.
- `pages/personal/PersonalDashboard.tsx`: mock data; stack `StatCard` (grid 4) + Card "Tài liệu gần đây" (`DocumentRow`) + Card ProcessingDonut + Card TagDistribution.
- Placeholder "Trang đang xây dựng" (EmptyState-style text): `PersonalHome`, `SharedWithMe`, `FavoritesPage`, `StatsPage`, `ClassSpace`, `FacultySpace`, `SchoolSpace`.
- `pages/trash/TrashPage.tsx`: **toàn bộ bị comment** — trang thùng rác thật là `pages/personal/TrashPage.tsx`.

---

## 8. Patterns: Modal, Menu, Toast, Confirm

### Modal (chung)
```
fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4
  └─ panel: w-full max-w-* rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95
       ├─ header: border-b border-gray-100 px-6 py-4 + X tròn
       ├─ body:   px-6 py-5 flex flex-col gap-5
       └─ footer: flex justify-end gap-3 (outline Hủy | primary Chính)
```
- Biến thể: overlay `bg-black/30` (confirm), panel `rounded-xl` (confirm/rename nhỏ),
  `max-w-md` (folder/upload), `max-w-sm` (rename), `max-w-[560px]` (group create).
- Đóng: click X / nút Hủy; `RenameDocumentModal` & `GroupSwitcher` hỗ trợ **Escape**.

### Context menu
- Render qua **portal** (`createPortal` → document.body), `position: fixed`, `z-[9999]`.
- Vị trí = tọa độ click; đóng khi click-outside, scroll, resize.
- Item có icon (theo `docs/SCREENS.md`: **chốt dùng bản có icon**).
- Hover-reveal trigger: `opacity-0 group-hover:opacity-100 transition-opacity`.

### Toast / Confirm hiện có (đang dùng)
| Cơ chế | Nơi dùng |
|---|---|
| `window.confirm()` | DocumentDetail (xóa), DocumentBrowser |
| `alert()` | lỗi tag (Upload/CreateFolder), kết quả InviteModal, ImportErrorsDialog |
| Toast cục bộ SettingsPage | `fixed bottom-6 right-6` — **không tái sử dụng được** |
| Modal confirm (`TrashConfirmModal`, `DeleteFolderConfirmModal`) | thùng rác, thư mục |
| `toastStore.ts` (zustand) | **không component nào dùng** (chưa nối) |

---

## 9. Interaction & Behavior

- **Keyboard**: `Ctrl/Cmd+K` → focus search (SearchBar); `Enter`/`Space` chọn FolderCard;
  `Enter` submit modal Rename; `Escape` đóng modal Rename / GroupSwitcher.
- **Hover reveal**: mọi nút hành động trên card/row đều ẩn và hiện khi hover group.
- **Focus**: input/nút dùng `ring-primary-600` theo chuẩn `focus-visible`.
- **Search**: debounce 300ms; gợi ý dropdown; footer chuyển sang chế độ full-text.
- **Pagination**: resets `page=1` khi đổi filter/search (`PersonalDocuments.tsx`);
  hiện "Trang X / Y • Tổng N" + 2 nút Trước/Sau (`outline`, `size=sm`).
- **View mode**: grid/list lưu trong localStorage qua `useViewPreference`.
- **Fetching state**: grid `opacity-60 pointer-events-none`; skeleton thay content.
- **Highlight tìm kiếm**: `useHighlightElement` — `ring-4 ring-primary-400` trong ~3s
  (dùng cho trỏ tới doc từ search).
- **Sidebar resize**: handle kéo, clamp 72–300px, persist localStorage.
- **Context menu nhóm** phân quyền theo prop `permission`.

---

## 10. Responsive Breakpoints

| Breakpoint | Thay đổi |
|---|---|
| `< sm` (640) | Ẩn tên app, search center, scope pill, tên user; grid tài liệu 2 cột; row ẩn cột owner |
| `≥ sm` | Hiện search header, scope pill; grid `sm:grid-cols-2` (documents) / `sm:grid-cols-3` (folders) |
| `< md` (768) | **Sidebar desktop ẩn** → hamburger + drawer overlay; header padding; bảng members → card |
| `≥ md` | Sidebar `260px` cố định; grid documents `md:grid-cols-3`; main `p-8`; hiện tên user |
| `< lg` (1024) | AuthLayout ẩn hero; DocumentDetail 1 cột |
| `≥ lg` | Grid `lg:grid-cols-4`; Detail `lg:grid-cols-[1fr_320px]`; tab settings `lg:grid-cols-[1fr_360px]`; requests `lg:grid-cols-2` |
| `≥ xl` (1280) | Grid documents/folders `xl:grid-cols-5` |

**Grid documents chuẩn (dùng ở personal + group):**
`grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4`
**Grid folders:** `sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3` (personal dùng row ngang).

---

## 11. Iconography

- **`lucide-react` duy nhất** — không dùng icon font/hay thư viện khác.
- Kích thước chuẩn: `h-5 w-5` (header/nav/button icon), `h-4 w-4` (inline/label),
  `h-3.5 w-3.5` (trong menu/chip), `h-6 w-6` (EmptyState nhỏ), `h-14 w-14` (FileIcon card).
- File type icons: `FileText, FileSpreadsheet, FileType, FileArchive, FileImage,
  FileCode, File` (xem mapping `FileIcon.tsx` §6).
- Nav icons: User, Users, BookOpen, GraduationCap, Building2, LayoutDashboard,
  FileText, Share2, Heart, Trash2, BarChart2, Settings.
- Action icons: MoreVertical (menu), Download, Eye, Share2, Star, Pencil, FolderInput,
  Trash2, Bell, LogOut, Menu, Search, Plus, X, Check, ChevronLeft/Right/Down, ArrowLeft.
- Icon "X đỏ" trong ảnh design-reference là **lỗi export Figma**, không phải design.

---

## 12. Routing & Screen Map

Từ `src/App.tsx`:

| Route | Page | Layout |
|---|---|---|
| `/login` | LoginPage | AuthLayout |
| `/personal` | PersonalHome (placeholder) | MainLayout |
| `/personal/dashboard` | PersonalDashboard | MainLayout |
| `/personal/documents` | PersonalDocuments | MainLayout |
| `/personal/documents/:id` | DocumentDetail | MainLayout |
| `/personal/shared` | SharedWithMe (placeholder) | MainLayout |
| `/personal/favorites` | FavoritesPage (placeholder) | MainLayout |
| `/personal/trash` | TrashPage | MainLayout |
| `/groups` | GroupList | MainLayout |
| `/groups/:id` | GroupSpace (`?tab=`) | MainLayout |
| `/groups/:id/documents/:docId` | GroupDocumentDetailPage | MainLayout (ProtectedRoute role) |
| `/class` | ClassSpace (placeholder) | MainLayout |
| `/faculty` | FacultySpace (placeholder) | MainLayout (role guard) |
| `/school` | SchoolSpace (placeholder) | MainLayout (role guard) |
| `/search` | SearchPage | MainLayout |
| `/stats` | StatsPage (placeholder) | MainLayout |
| `/settings` | SettingsPage | MainLayout |
| `/` | → `/personal` | — |
| `*` | → `/login` | — |

Bọc: `ProtectedRoute` → `MainLayout`. Faculty/School có thêm `ProtectedRoute` role con.

---

## 13. Rules for Future UI Development

1. **Color**: chỉ dùng 5 cấp primary đã khai báo (`50/100/500/600/700`) — **không dùng
   `primary-200/300/400/800/900`** (không tồn tại). Semantic dùng palette Tailwind standard.
2. **Không hardcode hex trong className** — nếu cần màu lạ, thêm vào `@theme` của
   `src/index.css` (nguồn token thật) trước khi dùng.
3. **Radius**: input/button/nav = `rounded-lg`; card/popover = `rounded-xl`;
   modal lớn = `rounded-2xl`; pill = `rounded-full`.
4. **Shadow**: card = `shadow-sm` (hoặc `shadow-xs`→`shadow-md` khi hover); menu = `shadow-lg`;
   modal = `shadow-xl`.
5. **Typography**: body `text-sm`; meta `text-xs`/`text-[11px]`; H1 trang thống nhất
   `text-2xl font-bold` (đang có lệch — sửa dần về chuẩn này); section label
   `text-sm font-semibold text-gray-700`.
6. **Component reuse trước, viết mới sau**: kiểm tra `docs/COMPONENTS.md` +
   `src/components/ui|shared/` — nếu đã có, import, không viết lại
   (tránh thêm bản duplicate như `LocalGroupDocumentCard`, `DocumentBrowser` tabs).
7. **Context menu**: portal + `z-[9999]` + icon mỗi item + hover-reveal + đóng
   click-outside/scroll/resize.
8. **Modal**: theo shell §8; dùng modal confirm thay `window.confirm/alert` khi mở rộng
   (hiện alert/confirm là legacy — không nhân rộng).
9. **Icon**: chỉ `lucide-react`; size theo §11.
10. **Responsive**: grid documents/folders theo bảng §10; sidebar `md`; bảng dài
    phải có mobile card variant.
11. **State**: loading → skeleton (`CardSkeleton`), empty → `EmptyState`, fetching →
    `opacity-60 pointer-events-none` trên grid.
12. **Không dùng `any`**; props interface ngay trong file; 1 component 1 file PascalCase
    export default/named theo pattern hiện có; className động dùng `cn()`.
13. **Tailwind v4**: theme khai báo trong `src/index.css` `@theme` — file
    `tailwind.config.ts` không phải nguồn chủ đạo; nếu thêm token hãy thêm vào `@theme`.
14. **Không import** các artifact mồ côi: `@/components/ui/button.tsx` (shadcn/base-ui),
    `App.css`, `components.json`.

---

## 14. Known Inconsistencies

> Các điểm code **đang lệch nhau** — được ghi nhận để không nhân rộng; sửa thuộc
> phạm vi task riêng, không tự ý sửa khi đang làm task khác.

1. **Animation `animate-in …` có thể không hoạt động**: class được dùng ở 12 chỗ
   (menu/modal) nhưng `tw-animate-css` (có trong package.json) **không được import**
   trong `index.css`.
2. **Token primary thiếu cấp màu**: code dùng `primary-200/300/400/800/900` nhưng
   `@theme` chỉ có 50/100/500/600/700 → class sinh rỗng (vd sidebar `hover:bg-primary-400`).
3. **3 bảng màu loại file khác nhau**: `DocumentCard.FILE_TYPE_THEMES` (rose/emerald/
   amber/slate), `FileIcon` (red/orange/primary/yellow), `constants/fileTypeStyles.ts`
   (`FILE_TYPE_STYLES` — **dead code**, không file nào import).
4. **2 bảng màu folder/tag**: hex Material `#4CAF50…` (CreateFolderModal/UploadModal)
   vs hex 700-shade `#2E7D32…` (DocumentDetail stats area).
5. **H1 trang không thống nhất**: GroupList `text-2xl font-bold` vs TrashPage/Settings
   `text-xl font-semibold`.
6. **Confirm/alert rời rạc**: `window.confirm` (DocumentDetail, DocumentBrowser),
   `alert()` (tag errors, InviteModal) — trong khi `toastStore` tồn tại **không dùng**,
   và SettingsPage có Toast cục bộ không tái sử dụng.
7. **File rỗng 0 byte**: `shared/PermissionBadge.tsx`, `shared/NotificationDropdown.tsx`,
   `pages/auth/RegisterPage.tsx`, `constants/permissions.ts`, `utils/fileIcon.ts`,
   `stores/notificationStore.ts` — import vào sẽ crash.
8. **Shadcn artifact mồ côi**: thư mục `digital-library/@/` (button base-ui + lib/utils),
   `components.json`, deps `@base-ui/react`, `shadcn`, `@fontsource-variable/geist`
   — không dùng trong `src/`.
9. **`App.css`** (scaffold Vite) không được import ở đâu — dead file.
10. **Duplicate code**: `LocalGroupDocumentCard` copy lại gần toàn bộ `DocumentCard`;
    `PersonalDocumentsSection` định nghĩa `toListItem` **2 lần** (bug tên trùng);
    `DocumentBrowser` tự viết tabs underline thay vì dùng `DocumentTypeTabs`.
11. **Bug route**: `GroupDocumentCard` dùng `basePath` `/group/...` — route thật là `/groups/...`.
12. **`NotificationCard`** (group/components) chưa trang nào import.
13. **Header hardcode**: `scopeLabel="Cá nhân"`, `notificationCount={2}` truyền từ
    MainLayout — chưa theo scope route thực tế.
14. **Double config**: `tailwind.config.ts` (v3, có thể không load) song song `@theme`
    — dễ sửa nhầm chỗ khi thêm token.
15. **Input style 2 kiểu**: component `Input` (shared) vs `inputClass` local
    SettingsPage vs input inline trong modals — focus ring hơi khác nhau
    (`ring-offset` vs không).
16. **`pages/trash/TrashPage.tsx` bị comment toàn bộ** — dễ vào nhầm file khi search "TrashPage".

---

## 15. Source of Truth

| Thứ tự | Nguồn | Vai trò |
|---|---|---|
| 1 | **Code trong `digital-library/src/`** | Sự thật tuyệt đối — tài liệu này mô tả code |
| 2 | `src/index.css` (`@theme`) | Design tokens (color, font, radius…) |
| 3 | `docs/DESIGN_SYSTEM.md` (file này) | Bản đồ tổng hợp để AI/dev tra cứu |
| 4 | `docs/COMPONENTS.md` | Danh mục component phải dùng lại |
| 5 | `docs/SCREENS.md` | Map route ↔ file ↔ ảnh tham chiếu |
| 6 | `docs/GROUP_LOGIC.md`, `docs/API_CONTRACTS.md` | Logic nghiệp vụ & API |
| 7 | `docs/design-reference/*.png` | Ảnh Figma — bám bố cục, **ưu tiên code hơn** khi xung đột |
| 8 | `tailwind.config.ts` | **Không phải nguồn chủ đạo** (xem §14.14) |

**Quy tắc khi xung đột:** code > tài liệu này > ảnh design-reference.
Tài liệu này chỉ được cập nhật theo code, không được biến thành yêu cầu thiết kế mới.

---

*Cập nhật lần cuối: 22/09/2026 — tổng hợp từ source code hiện tại, DOCUMENTATION ONLY.*
