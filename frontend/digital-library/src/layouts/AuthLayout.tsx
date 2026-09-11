// frontend/digital-library/src/layouts/AuthLayout.tsx
import { type ElementType } from "react";
import {
  Globe,
  Sun,
  ShieldCheck,
  Clock,
  Share2,
  Database,
  ChevronDown,
} from "lucide-react";
import { Outlet } from "react-router-dom";

const logoUrl = "/logo.png";

// Gợi ý: thay bằng ảnh rừng thông / cảnh quan Đại học Đà Lạt của bạn,
// đặt tại public/pineForest.jpg (ảnh ngang, tối thiểu ~1200x800)
const heroImageUrl = "/heroImage(3).png";

function FeatureItem({
  icon: Icon,
  title,
  desc,
}: {
  icon: ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-gray-900 leading-tight">
          {title}
        </h4>
        <p className="text-xs text-gray-500 mt-1">{desc}</p>
      </div>
    </div>
  );
}

export function AuthLayout() {
  return (
    <div className="flex min-h-screen w-full bg-[#F7FAF7]">
      {/* Left Column — hero / branding, hidden below lg */}
      <div className="relative hidden lg:flex lg:w-[55%] flex-col overflow-hidden bg-[#F1F6F1] p-12 xl:p-16">
        {/* Soft dotted texture accent, top-right */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-64 w-64 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #A9C9A9 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />

        {/* Logo and system name */}
        <div className="relative flex items-center gap-4">
          <img
            src={logoUrl}
            alt="Đại học Đà Lạt"
            className="h-16 w-16 shrink-0 rounded-full ring-4 ring-white"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary-700 leading-tight">
              HỆ THỐNG THƯ VIỆN SỐ
            </h1>
            <p className="text-xl font-bold tracking-tight text-primary-700 leading-tight">
              QUẢN LÝ TÀI LIỆU
            </p>
            <div className="mt-3 h-0.5 w-14 bg-primary-600" />
            <p className="text-base italic text-gray-600 mt-3">
              Trường Đại học Đà Lạt
            </p>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative mt-10">
          <p className="text-lg font-medium text-gray-700 leading-snug">
            Lưu trữ thông minh – Chia sẻ dễ dàng
          </p>
          <p className="text-lg font-medium text-gray-700 leading-snug">
            Kết nối tri thức – Lan tỏa giá trị
          </p>
        </div>

        {/* Hero illustration */}
        <div className="relative mt-10 flex-1 min-h-[280px] overflow-hidden rounded-2xl shadow-lg shadow-primary-900/10">
          <img
            src={heroImageUrl}
            alt="Rừng thông Đà Lạt"
            className="h-full w-full object-cover"
          />
          {/* subtle green wave overlay at the base, echoing brand color */}
          <svg
            className="absolute bottom-0 left-0 w-full text-primary-600/80"
            viewBox="0 0 400 40"
            preserveAspectRatio="none"
          >
            <path
              d="M0 24 C 80 4, 160 40, 240 20 C 300 6, 350 22, 400 12 L400 40 L0 40 Z"
              fill="currentColor"
              opacity="0.35"
            />
          </svg>
        </div>

        {/* Feature list */}
        <div className="relative mt-10 grid grid-cols-2 gap-x-8 gap-y-6">
          <FeatureItem
            icon={ShieldCheck}
            title="An toàn & bảo mật"
            desc="Dữ liệu được bảo vệ an toàn tuyệt đối"
          />
          <FeatureItem
            icon={Clock}
            title="Truy cập mọi lúc"
            desc="Truy cập tài liệu từ bất kỳ đâu, mọi lúc"
          />
          <FeatureItem
            icon={Share2}
            title="Chia sẻ dễ dàng"
            desc="Chia sẻ tài liệu nhanh chóng, tiện lợi"
          />
          <FeatureItem
            icon={Database}
            title="Lưu trữ không giới hạn"
            desc="Dung lượng lưu trữ lớn, không giới hạn"
          />
        </div>

        <p className="relative mt-10 text-xs text-gray-500">
          © 2024 Trường Đại học Đà Lạt. Tất cả quyền được bảo lưu.
        </p>
      </div>

      {/* Right Column — auth form */}
      <div className="relative flex flex-1 items-center justify-center bg-white p-6 lg:w-[45%] lg:p-12">
        {/* Top right toggles */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm transition-colors hover:bg-gray-50">
            <Globe className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Tiếng Việt
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900">
            <Sun className="h-4 w-4" />
          </button>
        </div>

        <div className="w-full max-w-[420px]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}