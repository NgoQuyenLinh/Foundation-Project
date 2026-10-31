import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Lock,
  Shield,
  SlidersHorizontal,
  User,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { userService } from "@/services/userService";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { useSettingsStore } from "@/stores/settingsStore";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  student: { label: "Sinh viên", color: "bg-blue-50 text-blue-700" },
  teacher: { label: "Giảng viên", color: "bg-green-50 text-green-700" },
  faculty_admin: {
    label: "Quản trị Khoa",
    color: "bg-purple-50 text-purple-700",
  },
  school_admin: {
    label: "Quản trị Trường",
    color: "bg-orange-50 text-orange-700",
  },
  system_admin: { label: "Quản trị Hệ thống", color: "bg-red-50 text-red-700" },
};

function getRoleInfo(role: string) {
  return (
    ROLE_LABELS[role] ?? { label: role, color: "bg-gray-100 text-gray-600" }
  );
}

function getInitials(name?: string | null, username?: string) {
  const source = name || username || "?";
  return source
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Toast đơn giản ────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  type: "success" | "error";
}

function Toast({ message, type }: ToastProps) {
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg text-sm font-medium",
        type === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white",
      )}
    >
      {type === "success" ? (
        <CheckCircle className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      {message}
    </div>
  );
}

// ── ReadOnly field ────────────────────────────────────────────────────────────

function ReadOnlyField({
  label,
  value,
  hint,
}: {
  label: string;
  value?: string | null;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <span className="flex-1 text-sm text-gray-500">{value || "—"}</span>
        <span title={hint} className="inline-flex items-center">
          <Lock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        </span>
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ── Tab: Thông tin cá nhân ────────────────────────────────────────────────────

function ProfileTab() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<ToastProps | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: userService.getMe,
  });

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Khởi tạo form khi data load xong
  const [initialized, setInitialized] = useState(false);
  if (user && !initialized) {
    setFullName(user.full_name ?? "");
    setUsername(user.username ?? "");
    setInitialized(true);
  }

  const mutation = useMutation({
    mutationFn: () =>
      userService.updateProfile({
        full_name: fullName.trim() || undefined,
        username: username.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setIsDirty(false);
      showToast("Cập nhật thông tin thành công", "success");
    },
    onError: () => {
      showToast("Cập nhật thất bại, vui lòng thử lại", "error");
    },
  });

  const handleCancel = () => {
    if (!user) return;
    setFullName(user.full_name ?? "");
    setUsername(user.username ?? "");
    setIsDirty(false);
  };

  const roleInfo = getRoleInfo(user?.role ?? "");

  // Xác định field nào được phép sửa theo role
  const canEditClassId = false; // sinh viên: không sửa
  const canEditFacultyId = user?.role === "system_admin";
  const canEditRole = user?.role === "system_admin";

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avatar + tên + thành viên từ */}
      <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xl font-bold text-white">
          {getInitials(user?.full_name, user?.username)}
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">
            {user?.full_name || user?.username}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                roleInfo.color,
              )}
            >
              {roleInfo.label}
            </span>
            {user?.student_code && (
              <span className="text-xs text-gray-400">
                MSSV: {user.student_code}
              </span>
            )}
            <span className="text-xs text-gray-400">
              Thành viên từ {formatDate(user?.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Họ và tên — có thể sửa */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Họ và tên
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Nhập họ và tên..."
            maxLength={150}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Username — có thể sửa */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tên đăng nhập
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setIsDirty(true);
            }}
            minLength={3}
            maxLength={150}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <p className="mt-1 text-xs text-gray-400">Tối thiểu 3 ký tự</p>
        </div>

        {/* Email — không cho sửa */}
        <ReadOnlyField
          label="Email"
          value={user?.email}
          hint="Email không thể thay đổi sau khi đăng ký"
        />

        {/* MSSV — không cho sửa */}
        {user?.student_code !== undefined && (
          <ReadOnlyField
            label="Mã số sinh viên"
            value={user?.student_code || "Chưa có"}
            hint="Mã số sinh viên do hệ thống cấp, không thể thay đổi"
          />
        )}

        {/* Role */}
        {canEditRole ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Vai trò
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              value={user?.role}
              onChange={() => {}} // mở rộng sau
            >
              {Object.entries(ROLE_LABELS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <ReadOnlyField
            label="Vai trò"
            value={roleInfo.label}
            hint="Vai trò được cấp bởi quản trị viên"
          />
        )}

        {/* class_id + faculty_id — readonly với sinh viên/giảng viên */}
        {user?.class_id != null && (
          <ReadOnlyField
            label="Mã lớp"
            value={String(user.class_id)}
            hint={canEditClassId ? undefined : "Lớp học được gán bởi hệ thống"}
          />
        )}

        {user?.faculty_id != null && (
          <ReadOnlyField
            label="Mã khoa"
            value={String(user.faculty_id)}
            hint={canEditFacultyId ? undefined : "Khoa được gán bởi hệ thống"}
          />
        )}
      </div>

      {/* Validation warning */}
      {isDirty && username.trim().length < 3 && (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Tên đăng nhập phải có ít nhất 3 ký tự
        </div>
      )}

      {/* Footer buttons */}
      {isDirty && (
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button variant="outline" onClick={handleCancel}>
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            disabled={mutation.isPending || username.trim().length < 3}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

// ── Tab: Bảo mật tài khoản ────────────────────────────────────────────────────

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const isValid =
    currentPassword.length >= 0 &&
    newPassword.length >= 6 &&
    newPassword === confirmPassword;

  const mutation = useMutation({
    mutationFn: () =>
      userService.updatePassword({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Đổi mật khẩu thành công", "success");
    },
    onError: (error: any) => {
      const errorMsg =
        error?.response?.data?.detail || "Đổi mật khẩu thất bại, vui lòng thử lại";
      showToast(errorMsg, "error");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && !mutation.isPending) {
      mutation.mutate();
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Đổi mật khẩu
        </h3>
        <div className="space-y-4">
          {/* Mật khẩu hiện tại */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Mật khẩu hiện tại
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại..."
              className={inputClass}
            />
          </div>

          {/* Mật khẩu mới */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Mật khẩu mới
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự..."
              className={inputClass}
            />
            {/* Helper text hướng dẫn số ký tự */}
            {newPassword.length > 0 && newPassword.length < 8 ? (
              <p className="mt-1 text-xs text-amber-600 font-medium">
                Mật khẩu mới phải có tối thiểu 8 ký tự (Hiện tại: {newPassword.length}/8)
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">
                Mật khẩu phải chứa ít nhất 8 ký tự.
              </p>
            )}
          </div>

          {/* Xác nhận mật khẩu mới */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Xác nhận mật khẩu mới
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới..."
              className={inputClass}
            />
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                Mật khẩu xác nhận không khớp
              </p>
            )}
            {confirmPassword.length > 0 && newPassword === confirmPassword && newPassword.length >= 8 && (
              <p className="mt-1 text-xs text-green-600 font-medium">
                Mật khẩu xác nhận đã khớp
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
              className="rounded"
            />
            Hiện mật khẩu
          </label>
        </div>
      </div>

      <div className="flex justify-end border-t border-gray-100 pt-4">
        <Button
          type="submit"
          variant="primary"
          disabled={!isValid || mutation.isPending}
        >
          {mutation.isPending ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
        </Button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </form>
  );
}

// ── Tab: Tuỳ chọn ─────────────────────────────────────────────────────────────

function PreferencesTab() {
  const { defaultPreviewMode, setDefaultPreviewMode } = useSettingsStore();
  const [language, setLanguage] = useState("vi");
  const [theme, setTheme] = useState("light");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyApp, setNotifyApp] = useState(true);

  return (
    <div className="space-y-6 max-w-md">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Ngôn ngữ
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Giao diện hiển thị
          </label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          >
            <option value="light">Sáng (Light Mode)</option>
            <option value="dark">Tối (Dark Mode)</option>
            <option value="system">Theo hệ thống</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Chế độ xem tài liệu mặc định
          </label>
          <select
            value={defaultPreviewMode}
            onChange={(e) =>
              setDefaultPreviewMode(e.target.value as "original" | "markdown")
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          >
            <option value="original">Bản gốc (PDF, Ảnh, Word)</option>
            <option value="markdown">Văn bản Markdown (Nếu có)</option>
          </select>
          <p className="mt-1 text-xs text-gray-400">
            Chỉ áp dụng khi tài liệu có file Markdown đi kèm.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Kênh nhận thông báo
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Nhận qua Email</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyApp}
                onChange={(e) => setNotifyApp(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Nhận trong ứng dụng</span>
            </label>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 italic">
        * Tuỳ chọn hiện được lưu trên trình duyệt này. Chức năng đồng bộ đa
        thiết bị sẽ có trong phiên bản sau.
      </p>

      <div className="flex justify-end border-t border-gray-100 pt-4">
        <Button
          variant="primary"
          onClick={() => {
            localStorage.setItem(
              "app_preferences",
              JSON.stringify({ language, theme, notifyEmail, notifyApp }),
            );
            alert("Đã lưu tuỳ chọn");
          }}
        >
          Lưu tuỳ chọn
        </Button>
      </div>
    </div>
  );
}


// ── Main SettingsPage ─────────────────────────────────────────────────────────

type TabKey = "profile" | "security" | "preferences";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: "profile",
    label: "Thông tin cá nhân",
    icon: <User className="h-4 w-4" />,
  },
  {
    key: "security",
    label: "Bảo mật tài khoản",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    key: "preferences",
    label: "Tuỳ chọn",
    icon: <SlidersHorizontal className="h-4 w-4" />,
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Cài đặt tài khoản
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý thông tin cá nhân và tuỳ chọn hệ thống
        </p>
      </div>

      <Card>
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 -mx-5 px-5 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 pb-3 text-sm font-medium transition-colors focus:outline-none",
                activeTab === tab.key
                  ? "border-b-2 border-primary-600 text-primary-600"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "profile" && <ProfileTab />}
        {activeTab === "security" && <SecurityTab />}
        {activeTab === "preferences" && <PreferencesTab />}
      </Card>
    </div>
  );
}
