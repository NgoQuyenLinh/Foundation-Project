// src/components/shared/FileDocumentCard.tsx

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FileIcon } from "@/components/shared/documents/FileIcon";
import { DocumentContextMenu } from "@/components/shared/documents/DocumentContextMenu";
import type { DocumentCardProps } from "./DocumentCard";
import { getThumbnailUrl } from "@/utils/getThumbnailUrl";
import { useHoverExpand } from "@/hooks/useHoverExpand";
import { cn } from "@/utils/cn";
import { getActivityHeat } from "@/utils/activityHeat";

// ======================================================
// Helpers & Themes (giữ nguyên)
// ======================================================

const getFileExtension = (type: string) => {
  if (!type) return "";
  let cleanType = type.toLowerCase().trim();
  if (cleanType.startsWith(".")) cleanType = cleanType.substring(1);

  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "pptx",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
    "application/x-rar-compressed": "rar",
  };

  return mimeMap[cleanType] || cleanType.split("/").pop() || cleanType;
};

const FILE_TYPE_THEMES: Record<
  string,
  { bg: string; badgeBg: string; badgeText: string; border: string }
> = {
  pdf: {
    bg: "bg-rose-50/70 hover:bg-rose-50",
    badgeBg: "bg-rose-100/90",
    badgeText: "text-rose-700",
    border: "group-hover:border-rose-200",
  },
  doc: {
    bg: "bg-blue-50/70 hover:bg-blue-50",
    badgeBg: "bg-blue-100/90",
    badgeText: "text-blue-700",
    border: "group-hover:border-blue-200",
  },
  docx: {
    bg: "bg-blue-50/70 hover:bg-blue-50",
    badgeBg: "bg-blue-100/90",
    badgeText: "text-blue-700",
    border: "group-hover:border-blue-200",
  },
  xls: {
    bg: "bg-emerald-50/70 hover:bg-emerald-50",
    badgeBg: "bg-emerald-100/90",
    badgeText: "text-emerald-700",
    border: "group-hover:border-emerald-200",
  },
  xlsx: {
    bg: "bg-emerald-50/70 hover:bg-emerald-50",
    badgeBg: "bg-emerald-100/90",
    badgeText: "text-emerald-700",
    border: "group-hover:border-emerald-200",
  },
  ppt: {
    bg: "bg-amber-50/70 hover:bg-amber-50",
    badgeBg: "bg-amber-100/90",
    badgeText: "text-amber-700",
    border: "group-hover:border-amber-200",
  },
  pptx: {
    bg: "bg-amber-50/70 hover:bg-amber-50",
    badgeBg: "bg-amber-100/90",
    badgeText: "text-amber-700",
    border: "group-hover:border-amber-200",
  },
  jpg: {
    bg: "bg-purple-50/70 hover:bg-purple-50",
    badgeBg: "bg-purple-100/90",
    badgeText: "text-purple-700",
    border: "group-hover:border-purple-200",
  },
  png: {
    bg: "bg-purple-50/70 hover:bg-purple-50",
    badgeBg: "bg-purple-100/90",
    badgeText: "text-purple-700",
    border: "group-hover:border-purple-200",
  },
  zip: {
    bg: "bg-slate-100/70 hover:bg-slate-100",
    badgeBg: "bg-slate-200/90",
    badgeText: "text-slate-700",
    border: "group-hover:border-slate-300",
  },
  rar: {
    bg: "bg-slate-100/70 hover:bg-slate-100",
    badgeBg: "bg-slate-200/90",
    badgeText: "text-slate-700",
    border: "group-hover:border-slate-300",
  },
};

const DEFAULT_THEME = {
  bg: "bg-gray-50/70 hover:bg-gray-50",
  badgeBg: "bg-gray-200/80",
  badgeText: "text-gray-700",
  border: "group-hover:border-gray-300",
};

const CODE_EXTENSIONS = [
  ".py",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".cpp",
  ".c",
  ".h",
  ".java",
  ".cs",
  ".go",
  ".rs",
  ".php",
  ".rb",
  ".swift",
  ".kt",
  ".scala",
  ".r",
  ".m",
  ".sql",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".xml",
  ".csv",
  ".html",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".svelte",
  ".vue",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".bat",
  ".cmd",
  ".md",
  ".mdx",
  ".rst",
  ".tex",
  ".env",
  ".gitignore",
  ".dockerignore",
  ".makefile",
  ".mk",
  "dockerfile",
];

// ======================================================
// Component
// ======================================================

export function FileDocumentCard({
  document,
  onAction,
  basePath = "/personal/documents",
  allowedActions,
  extraItems,
}: DocumentCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  // State kiểm tra xem nội dung preview khi phóng to có dài vượt khung để cuộn hay không
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [hasEnteredZoomed, setHasEnteredZoomed] = useState(false);

  const {
    containerRef,
    isExpanded,
    isZoomed,
    handleMouseEnter,
    handleMouseLeave,
    expandedStyle,
    originStyle,
  } = useHoverExpand({ delay: 2000, scale: 1.9 });

  const targetUrl = `${basePath}/${document.id}`;

  const handleAction = (action: string) => {
    if (action === "view") navigate(targetUrl);
    else onAction(action, document.id);
  };

  const ext = getFileExtension(document.extension || document.type);
  const theme = FILE_TYPE_THEMES[ext] || DEFAULT_THEME;

  const viewCount = document.personal_view_count ?? document.view_count ?? 0;
  const heat = getActivityHeat(viewCount);

  const thumbnailUrl = !imageError
    ? getThumbnailUrl(document.thumbnail_path)
    : null;

  const isCode =
    document.type?.startsWith("text/") ||
    CODE_EXTENSIONS.some((e) => document.name?.toLowerCase().endsWith(e)) ||
    document.name?.toLowerCase().includes("dockerfile");

  const tags = document.tags || [];

  // Kiểm tra xem khi mở Quick Look (isExpanded) ảnh/code có dài hơn khung nhìn không
  const checkScrollable = () => {
    const el = scrollContainerRef.current;
    if (!el || !isExpanded) {
      setCanScrollMore(false);
      return;
    }
    const isOverflowing = el.scrollHeight > el.clientHeight + 8;
    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 12;
    setCanScrollMore(isOverflowing && !isAtBottom);
  };

  useEffect(() => {
    if (isExpanded) {
      setHasScrolled(false);
      setHasEnteredZoomed(false); // Reset khi bắt đầu mở zoom
      const timer = setTimeout(checkScrollable, 60);
      return () => clearTimeout(timer);
    } else {
      setCanScrollMore(false);
      setHasEnteredZoomed(false);
    }
  }, [isExpanded, thumbnailUrl]);

  const handlePreviewScroll = () => {
    if (!hasScrolled) setHasScrolled(true);
    checkScrollable();
  };

  // ======================================================
  // Nội dung Card (dùng chung cho cả trạng thái bình thường & phóng to)
  // ======================================================
  const cardContent = (
    <div
      className={cn(
        "group flex h-full w-full flex-col overflow-hidden rounded-xl border transition-all duration-300",
        heat.cardBg,
        isExpanded
          ? "border-gray-200 shadow-2xl"
          : `${heat.level > 0 ? heat.border : "border-gray-200/80"} shadow-xs hover:shadow-md ${heat.level === 0 ? theme.border : ""}`,
      )}
    >
      {/* Khung Preview ngoài (Cố định vị trí Badge & Hint) */}
      <div
        className={cn(
          "relative w-full shrink-0 overflow-hidden rounded-t-xl transition-colors",
          isExpanded ? "h-[68%] cursor-ns-resize" : "h-[190px] cursor-pointer",
          theme.bg,
        )}
        onClick={() => !isExpanded && navigate(targetUrl)}
      >
        {/* Badge loại file luôn ghim cố định ở góc trên trái */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-20">
          <span
            className={cn(
              "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-2xs backdrop-blur-xs",
              theme.badgeBg,
              theme.badgeText,
            )}
          >
            {ext || "FILE"}
          </span>
        </div>

        {/* Badge nhiệt độ hoạt động (view count) ở góc trên phải */}
        {heat.badgeText && (
          <div className="pointer-events-none absolute right-2.5 top-2.5 z-20">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] shadow-2xs backdrop-blur-xs",
                heat.badgeClass,
              )}
            >
              {heat.badgeText}
            </span>
          </div>
        )}

        {/* Lớp cuộn nội dung (macOS Quick Look style khi isExpanded = true) */}
        <div
          ref={isExpanded ? scrollContainerRef : undefined}
          onScroll={isExpanded ? handlePreviewScroll : undefined}
          onWheel={(e) => {
            // Ngăn sự kiện lăn chuột làm trôi trang nền phía sau khi đang xem trước
            if (isExpanded) e.stopPropagation();
          }}
          className={cn(
            "h-full w-full",
            isExpanded
              ? "overflow-y-auto overscroll-contain scroll-smooth"
              : "overflow-hidden flex items-center justify-center",
          )}
        >
          {thumbnailUrl ? (
            isExpanded ? (
              /* Chế độ Quick Look: giữ nguyên tỉ lệ ngang, cho phép dài tự nhiên để lăn chuột */
              <div className="flex min-h-full w-full items-center justify-center bg-gray-900/5">
                <img
                  src={thumbnailUrl}
                  alt={document.name}
                  onLoad={checkScrollable}
                  onError={() => setImageError(true)}
                  className="block h-auto w-full select-none object-contain"
                />
              </div>
            ) : (
              /* Chế độ Card bình thường: ép vào khung cố định và cắt phần dư phía dưới */
              <img
                src={thumbnailUrl}
                alt={document.name}
                className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
              />
            )
          ) : isCode && (document as any).content ? (
            <div
              className={cn(
                "w-full bg-gray-900 text-green-400 p-3 pt-9 font-mono leading-snug text-left transition-opacity",
                isExpanded
                  ? "min-h-full text-[11px] opacity-100"
                  : "h-full text-[9px] overflow-hidden opacity-90 group-hover:opacity-100",
              )}
            >
              <pre className="whitespace-pre-wrap break-words">
                {(document as any).content
                  .split("\n")
                  .slice(0, isExpanded ? 120 : 6)
                  .join("\n")}
              </pre>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center transition-transform duration-200 group-hover:scale-110">
              <FileIcon
                type={document.type}
                className={cn(
                  "drop-shadow-xs",
                  isExpanded ? "h-24 w-24" : "h-14 w-14",
                )}
              />
            </div>
          )}
        </div>

        {/* Hiệu ứng mờ dần ở đáy + Gợi ý "Lăn chuột để xem tiếp" khi ảnh dài */}
        {isExpanded && canScrollMore && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center justify-end bg-gradient-to-t from-black/45 via-black/15 to-transparent pb-2.5 pt-8 transition-opacity duration-300">
            {!hasScrolled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur-xs animate-bounce">
                Lăn chuột để xem thêm ↓
              </span>
            )}
          </div>
        )}
      </div>

      {/* Thông tin Chi tiết */}
      <div className={cn("relative flex flex-1 flex-col justify-between rounded-b-xl p-4 transition-colors", heat.cardBg)}>
        <div>
          <div className="flex items-start justify-between gap-1.5">
            <div className="relative min-w-0 flex-1">
              <h3
                onClick={() => navigate(targetUrl)}
                className={cn(
                  "cursor-pointer font-semibold leading-snug text-gray-800 transition-colors hover:text-primary-600",
                  isExpanded
                    ? "line-clamp-2 text-base"
                    : "line-clamp-2 text-sm",
                )}
                title={document.name}
              >
                {document.name}
              </h3>
            </div>

            {!isExpanded && (
              <div
                className="relative z-50 shrink-0 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <DocumentContextMenu
                  markdownPath={document.markdownPath || document.markdown_path}
                  onAction={handleAction}
                  allowedActions={allowedActions}
                  extraItems={extraItems}
                />
              </div>
            )}
          </div>

          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
            <span>{document.size}</span>
            <span className="h-1 w-1 rounded-full bg-gray-300" />
            <span>{document.updatedAt}</span>
          </p>
        </div>

        {/* Tags */}
        <div className="mt-2.5 border-t border-gray-100/80 pt-2">
          {tags.length > 0 ? (
            <div
              className={cn(
                "flex flex-wrap gap-1 overflow-hidden",
                isExpanded ? "max-h-[48px]" : "max-h-[26px]",
              )}
            >
              {tags.slice(0, isExpanded ? tags.length : 3).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-200/80"
                >
                  {tag.name}
                </span>
              ))}
              {!isExpanded && tags.length > 3 && (
                <span className="inline-flex items-center rounded-md bg-gray-50 px-1 py-0.5 text-[10px] font-medium text-gray-400">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] italic text-gray-300">
              Chưa có tag
            </span>
          )}
        </div>

        {/* Nút mở nhanh khi đang phóng to */}
        {/* Nút đóng Quick Look chuẩn macOS ở góc trên phải */}
        {isExpanded && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleMouseLeave();
            }}
            className="absolute right-3 top-3 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all hover:bg-black/75 hover:scale-110 active:scale-95"
            title="Đóng (ESC)"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Placeholder giữ chỗ trong grid */}
      <div
        ref={containerRef}
        id={`doc-${document.id}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={isExpanded ? undefined : handleMouseLeave}
        className="h-[340px] w-full"
        style={isExpanded ? { visibility: "hidden" } : undefined}
      >
        {!isExpanded && cardContent}
      </div>

      {/* Card phóng to (Quick Look Modal), render qua Portal */}
      {isExpanded &&
        createPortal(
          <>
            {/* Overlay nền mờ tối: click vào nền để đóng ngay */}
            <div
              className={cn(
                "fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ease-out",
                isZoomed ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              onClick={handleMouseLeave}
            />

            {/* Card Quick Look */}
            <div
              style={{
                ...(isZoomed ? expandedStyle() : originStyle()),
                transition: "all 350ms cubic-bezier(0.16, 1, 0.3, 1)",
                willChange: "top, left, width, height",
              }}
              // 1. Khi chuột di chuyển vào card ở giữa màn hình -> đánh dấu đã vào
              onMouseEnter={() => {
                if (isZoomed) setHasEnteredZoomed(true);
              }}
              // 2. CHỈ đóng khi chuột đã từng vào card phóng to rồi sau đó mới rời ra ngoài
              onMouseLeave={() => {
                if (hasEnteredZoomed) {
                  handleMouseLeave();
                }
              }}
              className="select-none"
            >
              {cardContent}
            </div>
          </>,
          window.document.body
        )}
    </>
  );
}
