// frontend/digital-library/src/components/shared/Header.tsx

import { Bell, Menu, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { SearchBar } from "./SearchBar";

export interface HeaderProps {
  scopeLabel: string;
  notificationCount?: number;
  onMenuClick?: () => void;
}

export function Header({ scopeLabel, notificationCount = 0, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  
  // Lấy thông tin user và hàm logout trực tiếp từ Zustand Store
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Xác định Tên hiển thị (Ưu tiên full_name -> username -> Mặc định)
  const displayName = user?.full_name || user?.username || "Người dùng";
  
  // Format Role để hiển thị đẹp hơn trên UI (ví dụ: student/Sinh viên)
  const displayRole = user?.role === 'student' || user?.role === 'Sinh viên' 
    ? 'Sinh viên' 
    : (user?.role || 'Người dùng');

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left: Logo & System Name */}
      <div className="flex shrink-0 items-center gap-2 md:w-[212px]">
        <button
          type="button"
          className="mr-1 rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          onClick={onMenuClick}
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-lg">
          L
        </div>
        <span className="hidden text-lg font-bold text-gray-900 sm:inline">Digital Library</span>
      </div>

      {/* Center: Search */}
      <div className="hidden flex-1 justify-center px-6 sm:flex">
        <SearchBar />
      </div>

      {/* Right: Actions & User */}
      <div className="flex shrink-0 items-center gap-4">
        <div className="hidden items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 sm:flex">
          <div className="h-2 w-2 rounded-full bg-primary-500" />
          {scopeLabel}
        </div>

        <button className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
          <Avatar name={displayName} />
          <div className="hidden flex-col md:flex">
            <span className="text-sm font-semibold text-gray-900">{displayName}</span>
            <span className="text-xs text-gray-500">{displayRole}</span>
          </div>
          <button 
            onClick={handleLogout} 
            title="Đăng xuất" 
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}