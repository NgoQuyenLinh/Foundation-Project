// digital-library/src/components/shared/Sidebar.tsx

import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { type ElementType, useEffect, useRef, useState } from "react";
import {
  User,
  Users,
  BookOpen,
  GraduationCap,
  Building2,
  LayoutDashboard,
  FileText,
  Share2,
  Heart,
  Trash2,
  BarChart2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { groupService } from "@/services/groupService";

interface SidebarItem {
  icon: ElementType;
  label: string;
  to: string;
}

const SCOPE_ITEMS: SidebarItem[] = [
  { icon: User, label: "Cá nhân", to: "/personal" },
  { icon: Users, label: "Nhóm", to: "/groups" },
  { icon: BookOpen, label: "Lớp", to: "/class" },
  { icon: GraduationCap, label: "Khoa", to: "/faculty" },
  { icon: Building2, label: "Trường", to: "/school" },
  { icon: BookOpen, label: "Kho học liệu", to: "/library" },
];

const PERSONAL_ITEMS: SidebarItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/personal/dashboard" },
  { icon: FileText, label: "Tài liệu", to: "/personal/documents" },
  { icon: Share2, label: "Đã chia sẻ với tôi", to: "/personal/shared" },
  { icon: Heart, label: "Yêu thích", to: "/personal/favorites" },
  { icon: Trash2, label: "Thùng rác", to: "/personal/trash" },
];

const BOTTOM_ITEMS: SidebarItem[] = [
  { icon: BarChart2, label: "Thống kê", to: "/stats" },
  { icon: Settings, label: "Cài đặt hệ thống", to: "/settings" },
];

const MIN_WIDTH = 72;
const MAX_WIDTH = 260;
const COLLAPSE_THRESHOLD = 100;

export interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const [width, setWidth] = useState(MAX_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const { data: invitations = [] } = useQuery({
    queryKey: ["my-invitations"],
    queryFn: groupService.getMyInvitations,
    refetchInterval: 30000,
    retry: false,
  });
  const pendingInvitationCount = invitations.filter((invitation) => invitation.status === "pending").length;

  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(MAX_WIDTH);

  // =========================
  // LOAD SIDEBAR STATE
  // =========================

  useEffect(() => {
    const savedWidth = localStorage.getItem("digital-library-sidebar-width");
    const savedCollapsed = localStorage.getItem(
      "digital-library-sidebar-collapsed"
    );

    if (savedWidth) {
      const parsedWidth = Number(savedWidth);

      if (!Number.isNaN(parsedWidth)) {
        const safeWidth = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, parsedWidth)
        );

        setWidth(safeWidth);
      }
    }

    if (savedCollapsed === "true") {
      setIsCollapsed(true);
      setWidth(MIN_WIDTH);
    }
  }, []);

  // =========================
  // SAVE SIDEBAR STATE
  // =========================

  useEffect(() => {
    if (isResizing) return;

    localStorage.setItem(
      "digital-library-sidebar-width",
      String(width)
    );

    localStorage.setItem(
      "digital-library-sidebar-collapsed",
      String(isCollapsed)
    );
  }, [width, isCollapsed, isResizing]);

  // =========================
  // RESIZE
  // =========================

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      const delta = event.clientX - resizeStartX.current;

      let newWidth = resizeStartWidth.current + delta;

      newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, newWidth)
      );

      // Nếu kéo gần sát bên trái -> tự động thu nhỏ
      if (newWidth <= COLLAPSE_THRESHOLD) {
        newWidth = MIN_WIDTH;
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }

      setWidth(newWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  const handleResizeStart = (event: React.PointerEvent) => {
    event.preventDefault();

    resizeStartX.current = event.clientX;
    resizeStartWidth.current = width;

    setIsResizing(true);

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // =========================
  // TOGGLE
  // =========================

  const toggleSidebar = () => {
    if (isCollapsed) {
      setWidth(MAX_WIDTH);
      setIsCollapsed(false);
    } else {
      setWidth(MIN_WIDTH);
      setIsCollapsed(true);
    }
  };

  // =========================
  // NAV ITEM
  // =========================

  const renderItem = (item: SidebarItem) => {
    const Icon = item.icon;

    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        title={isCollapsed ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            "group flex h-10 items-center rounded-lg text-sm font-medium transition-colors",
            isCollapsed
              ? "justify-center px-0"
              : "gap-3 px-3",
            isActive
              ? "bg-primary-100 text-primary-600"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          )
        }
      >
        <Icon
          className={cn(
            "h-5 w-5 shrink-0",
            isCollapsed ? "h-5 w-5" : "h-5 w-5"
          )}
        />

        {!isCollapsed && (
          <span className="truncate">
            {item.label}
          </span>
        )}
        {!isCollapsed && item.to === "/groups" && pendingInvitationCount > 0 && (
          <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
            {pendingInvitationCount}
          </span>
        )}
        {isCollapsed && item.to === "/groups" && pendingInvitationCount > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </NavLink>
    );
  };

  // =========================
  // SECTION TITLE
  // =========================

  const renderSectionTitle = (title: string) => {
    if (isCollapsed) return null;

    return (
      <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </h2>
    );
  };

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white",
        !isResizing && "transition-[width] duration-200 ease-in-out"
      )}
      style={{
        width: `${width}px`,
      }}
    >
      {/* ======================================
          HEADER / TOGGLE BUTTON
      ====================================== */}

      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-gray-200",
          isCollapsed
            ? "justify-center px-2"
            : "justify-end px-3"
        )}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={
            isCollapsed
              ? "Mở rộng thanh bên"
              : "Thu nhỏ thanh bên"
          }
          aria-expanded={!isCollapsed}
          title={
            isCollapsed
              ? "Mở rộng thanh bên"
              : "Thu nhỏ thanh bên"
          }
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            "text-gray-500 transition-colors",
            "hover:bg-gray-100 hover:text-gray-900",
            "focus:outline-none focus:ring-2 focus:ring-primary-500"
          )}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* ======================================
          MAIN SIDEBAR CONTENT
      ====================================== */}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 py-4">

        {/* ================= SCOPE ================= */}

        <div className="mb-6">
          {renderSectionTitle("Phạm vi truy cập")}

          <nav className="space-y-1">
            {SCOPE_ITEMS.map(renderItem)}
          </nav>
        </div>

        {/* ================= PERSONAL ================= */}

        <div className="flex-1">
          {renderSectionTitle("Thư mục cá nhân")}

          <nav className="space-y-1">
            {PERSONAL_ITEMS.map(renderItem)}
          </nav>
        </div>
      </div>

      {/* ======================================
          BOTTOM MENU
      ====================================== */}

      <div
        className={cn(
          "shrink-0 border-t border-gray-200 px-3 py-3"
        )}
      >
        <nav className="space-y-1">
          {BOTTOM_ITEMS.map(renderItem)}
        </nav>
      </div>

      {/* ======================================
          RESIZE HANDLE
      ====================================== */}

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Thay đổi kích thước thanh bên"
        onPointerDown={handleResizeStart}
        className={cn(
          "absolute right-0 top-0 z-20 h-full w-1",
          "cursor-col-resize",
          "hover:bg-primary-400",
          isResizing && "bg-primary-500"
        )}
      />
    </aside>
  );
}
