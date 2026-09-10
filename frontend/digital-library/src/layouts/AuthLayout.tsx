import { type ElementType } from "react";
import { Globe, Sun, ShieldCheck, Clock, Share2, Database, ChevronDown } from "lucide-react";
import heroImage from "@/assets/hero.png";

const logoUrl = "/logo.png";

function FeatureItem({ icon: Icon, title, desc }: { icon: ElementType; title: string; desc: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary-600 shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-gray-900 leading-tight">{title}</h4>
        <p className="text-xs text-gray-500 mt-1">{desc}</p>
      </div>
    </div>
  );
}

import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen w-full bg-white relative">
      {/* Top right toggles */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-10">
        <div className="flex items-center gap-2 cursor-pointer rounded-lg bg-white px-3 py-2 border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
          <Globe className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Tiếng Việt</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm">
          <Sun className="h-4 w-4" />
        </button>
      </div>

      {/* Left Column (hidden on < 1024px) */}
      <div className="hidden lg:flex w-[45%] flex-col bg-gradient-to-br from-primary-50 via-white to-primary-100 p-10">
        {/* Logo and System Name */}
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Đại học Đà Lạt" className="h-16 w-16 shrink-0 rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-primary-700 leading-tight">
              HỆ THỐNG THƯ VIỆN SỐ
            </h1>
            <p className="text-xl font-bold text-primary-700 leading-tight">
              QUẢN LÝ TÀI LIỆU
            </p>
            <div className="mt-5 h-0.5 w-14 bg-primary-600" />
            <p className="text-base italic text-gray-600 mt-5">
              Trường Đại học Đà Lạt
            </p>
          </div>
        </div>

        {/* Tagline */}
        <div className="mt-10 mb-6">
          <p className="text-lg font-semibold text-gray-800">
            Lưu trữ thông minh - Chia sẻ dễ dàng
          </p>
          <p className="mt-2 text-lg font-semibold text-gray-800">
            Kết nối tri thức - Lan tỏa giá trị
          </p>
        </div>

        {/* Illustration */}
        <div className="flex-1 flex items-center justify-center p-8">
          <img
            src={heroImage} 
            alt="Trường Đại học Đà Lạt" 
            className="max-h-[360px] w-full object-contain drop-shadow-xl" 
          />
        </div>

        {/* Features Row */}
        <div className="mt-4 grid grid-cols-4 gap-4 rounded-xl border border-gray-100 bg-white/80 p-6 shadow-sm">
          <FeatureItem icon={ShieldCheck} title="An toàn & bảo mật" desc="Dữ liệu mã hóa" />
          <FeatureItem icon={Clock} title="Truy cập mọi lúc" desc="24/7 online" />
          <FeatureItem icon={Share2} title="Chia sẻ dễ dàng" desc="Đa nền tảng" />
          <FeatureItem icon={Database} title="Lưu trữ không giới hạn" desc="Tài liệu số" />
        </div>
        <p className="mt-8 text-xs text-gray-500">
          © 2024 Trường Đại học Đà Lạt. Tất cả quyền được bảo lưu.
        </p>
      </div>

      {/* Right Column */}
      <div className="flex flex-1 items-center justify-center p-6 lg:w-[55%] lg:p-12 relative overflow-y-auto">
        <div className="w-full max-w-[420px]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
