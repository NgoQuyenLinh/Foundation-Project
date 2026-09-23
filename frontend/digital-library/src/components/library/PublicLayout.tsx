// frontend/digital-library/src/components/library/PublicLayout.tsx

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, LogOut, Home, BookOpen, ChevronDown, Shield } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth();
    setDropdownOpen(false);
    navigate("/library");
  };

  const isAdmin = user && ["faculty_admin", "school_admin", "system_admin"].includes(user.role);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-30 h-16 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <Link to="/library" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-lg shadow-sm group-hover:bg-primary-700 transition-colors">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors leading-tight">
                Kho Học Liệu Cộng Đồng
              </span>
              <span className="text-[11px] text-gray-500 leading-tight">
                Thư viện số · Đại học Đà Lạt
              </span>
            </div>
          </Link>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none"
                >
                  <Avatar name={user.full_name || user.username} size="sm" />
                  <span className="text-sm font-semibold text-gray-800 hidden sm:inline-block max-w-[140px] truncate">
                    {user.full_name || user.username}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400 mr-1" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-gray-100 mb-1">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {user.full_name || user.username}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>

                    <Link
                      to="/personal"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Home className="h-4 w-4 text-gray-500" />
                      <span>Về trang chủ của tôi</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/library/admin/submissions"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-50 transition-colors"
                      >
                        <Shield className="h-4 w-4 text-primary-600" />
                        <span>Quản lý duyệt tài liệu</span>
                      </Link>
                    )}

                    <div className="my-1 h-px bg-gray-100" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  sessionStorage.setItem("redirect_after_login", window.location.pathname);
                  navigate("/login");
                }}
                icon={<LogIn className="h-4 w-4 text-primary-600" />}
                className="font-medium text-gray-700 hover:text-primary-600 border-gray-300 hover:border-primary-500"
              >
                Đăng nhập
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
        <p>© Hệ thống Thư viện số — Đại học Đà Lạt</p>
      </footer>
    </div>
  );
}

export default PublicLayout;
