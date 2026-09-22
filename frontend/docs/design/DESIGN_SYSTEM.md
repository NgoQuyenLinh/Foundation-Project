# Design System — trích xuất từ Figma

## Màu sắc (đưa vào tailwind.config.ts)

### Primary (xanh lá — thương hiệu)
- primary-50:  #EFF8F1   (nền badge trạng thái, hover nhẹ)
- primary-100: #DCEFE0   (nền sidebar item active)
- primary-500: #3A8348
- primary-600: #2F6B3C   (màu chính — logo, nút CTA, text active)
- primary-700: #245530   (hover của nút chính)

### Neutral (dùng bảng gray mặc định của Tailwind)
- Chữ tiêu đề: text-gray-900
- Chữ phụ/mô tả: text-gray-500
- Border mặc định: border-gray-200
- Nền trang: bg-gray-50
- Nền card: bg-white

### Màu theo loại file (icon badge)
- PDF:        bg-red-50    text-red-500   (icon FileText/FileType từ lucide)
- DOCX/DOC:   bg-blue-50   text-blue-500
- PPTX/PPT:   bg-orange-50 text-orange-500
- ZIP/nén:    bg-yellow-50 text-yellow-600
- Code/drawio: bg-cyan-50   text-cyan-600
- Mặc định:   bg-gray-100  text-gray-500

### Màu chức năng
- Success/xác nhận: green-600
- Danger/xóa: red-500 (chỉ dùng cho text/icon hành động xóa, KHÔNG dùng làm nền)
- Warning: yellow-500

## Typography
- Font: 'Inter', sans-serif (khai báo trong index.css qua Google Fonts hoặc self-host)
- Tiêu đề trang (H1): text-2xl font-bold text-gray-900
- Tiêu đề khối/card: text-lg font-semibold text-gray-900
- Body: text-sm text-gray-600
- Số liệu lớn (dashboard stat): text-3xl font-bold text-gray-900
- Label nhỏ/meta: text-xs text-gray-400

## Spacing & Radius
- Card padding: p-5 hoặc p-6
- Card radius: rounded-xl (12px)
- Button radius: rounded-lg (8px)
- Badge/pill radius: rounded-full
- Khoảng cách giữa các card trong grid: gap-4 hoặc gap-5
- Khoảng cách section: mb-6 / mb-8

## Shadow
- Card thường: shadow-sm border border-gray-200 (ưu tiên border hơn shadow đậm)
- Dropdown/context menu: shadow-lg border border-gray-100
- Modal: shadow-xl

## Component chuẩn nhận diện từ ảnh
- **Sidebar**: nền trắng, width cố định ~260px, item active có nền primary-100,
  text primary-600, bo góc rounded-lg, padding ngang.
- **Header/Topbar**: nền trắng, border-bottom gray-200, height ~64px, gồm:
  logo + tên hệ thống (trái), ô tìm kiếm (giữa, có phím tắt "Ctrl+K" hiện dạng
  pill bên phải input), badge phạm vi truy cập hiện tại (VD "● Cá nhân" — dot xanh
  + text, nền primary-50, bo tròn), chuông thông báo (có badge số đỏ), avatar + tên + role (phải).
- **Stat Card** (dashboard): icon vuông bo góc (bg màu nhạt riêng từng card:
  xanh lá/xanh dương/cam/vàng), số liệu lớn bên cạnh, label nhỏ + phụ chú bên dưới.
- **Document row/card**: icon file theo loại (màu theo mapping ở trên), tên file
  bold, dòng meta nhỏ (thời gian, dung lượng) màu xám, nút "..." mở context menu
  ở cuối hàng.
- **Context menu**: xuất hiện dạng dropdown nổi, danh sách action mỗi dòng có icon
  + text, hover bg-gray-50, dòng "Xóa" luôn màu đỏ và tách biệt (có thể có
  border-top ngăn cách với các action khác).
- **Progress bar nhỏ** (phân bổ tag): thanh ngang mảnh (h-1.5), bo tròn, nền
  gray-100, phần fill màu primary.
- **Donut chart** (xử lý tài liệu %): dùng recharts PieChart dạng donut, giữa
  hiển thị % lớn, chú thích màu bên cạnh.
- **Tag pill** (trang chi tiết tài liệu): nền primary-50, text primary-700,
  rounded-full, có nút "x" nhỏ để xóa tag, cuối cùng có nút "+" để thêm tag mới.