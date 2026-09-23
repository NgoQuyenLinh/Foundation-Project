// frontend/digital-library/src/pages/auth/LoginPage.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, EyeOff, Eye, LogIn, AlertCircle } from "lucide-react";
import axios from "axios";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/authService";

// Custom Google Icon SVG to match requirements without extra dependencies
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const roleRoutes: Record<string, string> = {
  student: '/personal',
  teacher: '/personal',
  faculty_admin: '/faculty',
  school_admin: '/school',
  system_admin: '/personal',
};

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nếu đã đăng nhập thì redirect ngay
  useEffect(() => {
    if (isAuthenticated) {
      const redirect = sessionStorage.getItem('redirect_after_login');
      if (redirect) {
        sessionStorage.removeItem('redirect_after_login');
        navigate(redirect, { replace: true });
      } else {
        navigate('/personal', { replace: true });
      }
    }
  }, [isAuthenticated, navigate]);

  const validate = (): string | null => {
    if (!identifier.trim())
      return 'Vui lòng nhập Mã số sinh viên hoặc Email';
    if (!password)
      return 'Vui lòng nhập mật khẩu';
    if (password.length < 6)
      return 'Mật khẩu phải có ít nhất 6 ký tự';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.login({ identifier, password });
      setAuth(data.access_token, data.user);
      const redirect = sessionStorage.getItem('redirect_after_login');
      if (redirect) {
        sessionStorage.removeItem('redirect_after_login');
        navigate(redirect, { replace: true });
      } else {
        navigate(roleRoutes[data.user.role] ?? '/personal', { replace: true });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail;
        if (status === 401) {
          setError(
            typeof detail === 'string'
              ? detail
              : 'Sai thông tin đăng nhập. Vui lòng kiểm tra lại.'
          );
        } else if (status === 422) {
          setError('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
        } else if (!err.response) {
          setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
        } else {
          setError('Đã xảy ra lỗi. Vui lòng thử lại.');
        }
      } else {
        setError('Đã xảy ra lỗi không xác định.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <Card className="w-full shadow-lg border-gray-100 p-8 sm:p-12">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Chào mừng bạn trở lại!
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Đăng nhập để tiếp tục sử dụng hệ thống
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Mã số sinh viên / Email
            </label>
            <Input
              type="text"
              placeholder="Nhập MSSV hoặc email"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
              icon={<User className="h-4 w-4" />}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              icon={<Lock className="h-4 w-4" />}
              disabled={isLoading}
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="hover:text-gray-700 focus:outline-none focus-visible:ring-2 rounded-sm"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600 cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700">
                Ghi nhớ đăng nhập
              </span>
            </label>
            <a
              href="#"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              Quên mật khẩu?
            </a>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full text-base py-3 h-auto"
            disabled={isLoading}
            icon={
              isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <LogIn className="h-5 w-5" />
              )
            }
          >
            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>

        <div className="mt-8 flex items-center gap-3">
          <div className="h-[1px] flex-1 bg-gray-200"></div>
          <span className="text-sm text-gray-400 font-medium">hoặc đăng nhập với</span>
          <div className="h-[1px] flex-1 bg-gray-200"></div>
        </div>

        <div className="mt-6">
          <Button
            type="button"
            variant="outline"
            className="w-full text-base py-2.5 h-auto"
            icon={<GoogleIcon />}
            disabled={isLoading}
            onClick={() => alert("Tính năng đăng nhập Google đang được phát triển.")}
          >
            Đăng nhập với Google
          </Button>
        </div>
      </Card>

      <p className="mt-8 text-sm text-gray-500">
        Bạn cần trợ giúp? <a href="#" className="font-medium text-primary-600 hover:underline">Liên hệ hỗ trợ</a>
      </p>
    </div>
  );
}
