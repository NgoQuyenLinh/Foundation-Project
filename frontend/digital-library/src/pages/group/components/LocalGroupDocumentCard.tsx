// frontend/digital-library/src/pages/group/components/LocalGroupDocumentCard.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileIcon } from "@/components/shared/FileIcon";
import { GroupDocumentContextMenu } from "@/pages/group/components/GroupDocumentContextMenu";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import { Avatar } from "@/components/ui/Avatar"; // <-- 1. Import Component Avatar
import type { LocalGroupDocumentCardProps } from "../types/groupSpace.types";

// ======================================================
// Helpers & File Type Themes (Giữ nguyên)
// ======================================================
const getFileExtension = (type: string, title?: string) => {
  if (!type && !title) return "";
  let cleanType = (type || "").toLowerCase().trim();
  if (cleanType.startsWith(".")) cleanType = cleanType.substring(1);

  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf", "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    "application/zip": "zip", "application/x-zip-compressed": "zip", "application/x-rar-compressed": "rar",
  };

  if (mimeMap[cleanType]) return mimeMap[cleanType];
  if (cleanType.includes("/")) return cleanType.split("/").pop() || cleanType;
  if (cleanType) return cleanType;
  if (title && title.includes(".")) return title.split(".").pop()?.toLowerCase() || "";
  return "";
};

const FILE_TYPE_THEMES: Record<string, { bg: string; badgeBg: string; badgeText: string; border: string }> = {
  pdf: { bg: "bg-rose-50/70 hover:bg-rose-50", badgeBg: "bg-rose-100/90", badgeText: "text-rose-700", border: "group-hover:border-rose-200" },
  doc: { bg: "bg-blue-50/70 hover:bg-blue-50", badgeBg: "bg-blue-100/90", badgeText: "text-blue-700", border: "group-hover:border-blue-200" },
  docx: { bg: "bg-blue-50/70 hover:bg-blue-50", badgeBg: "bg-blue-100/90", badgeText: "text-blue-700", border: "group-hover:border-blue-200" },
  xls: { bg: "bg-emerald-50/70 hover:bg-emerald-50", badgeBg: "bg-emerald-100/90", badgeText: "text-emerald-700", border: "group-hover:border-emerald-200" },
  xlsx: { bg: "bg-emerald-50/70 hover:bg-emerald-50", badgeBg: "bg-emerald-100/90", badgeText: "text-emerald-700", border: "group-hover:border-emerald-200" },
  ppt: { bg: "bg-amber-50/70 hover:bg-amber-50", badgeBg: "bg-amber-100/90", badgeText: "text-amber-700", border: "group-hover:border-amber-200" },
  pptx: { bg: "bg-amber-50/70 hover:bg-amber-50", badgeBg: "bg-amber-100/90", badgeText: "text-amber-700", border: "group-hover:border-amber-200" },
  jpg: { bg: "bg-purple-50/70 hover:bg-purple-50", badgeBg: "bg-purple-100/90", badgeText: "text-purple-700", border: "group-hover:border-purple-200" },
  png: { bg: "bg-purple-50/70 hover:bg-purple-50", badgeBg: "bg-purple-100/90", badgeText: "text-purple-700", border: "group-hover:border-purple-200" },
  zip: { bg: "bg-slate-100/70 hover:bg-slate-100", badgeBg: "bg-slate-200/90", badgeText: "text-slate-700", border: "group-hover:border-slate-300" },
  rar: { bg: "bg-slate-100/70 hover:bg-slate-100", badgeBg: "bg-slate-200/90", badgeText: "text-slate-700", border: "group-hover:border-slate-300" },
};

const DEFAULT_THEME = { bg: "bg-gray-50/70 hover:bg-gray-50", badgeBg: "bg-gray-200/80", badgeText: "text-gray-700", border: "group-hover:border-gray-300" };

// ======================================================
// Component
// ======================================================

export default function LocalGroupDocumentCard({
  document,
  permission,
  groupId,
  onSave,
  onDelete,
  onRename,
  
}: LocalGroupDocumentCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const handleViewDetail = () => {
    navigate(`/groups/${groupId}/documents/${document.id}`);
  };

  const handleAction = (action: string) => {
    switch (action) {
      case "view":
        handleViewDetail();
        break;
      case "download": {
        const downloadUrl = `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/groups/${groupId}/documents/${document.id}/download`;
        const link = window.document.createElement("a");
        link.href = downloadUrl;
        link.download = document.title;
        link.target = "_blank";
        link.rel = "noreferrer";
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        break;
      }
      case "save_personal":
      case "save":
        onSave?.(document.id);
        break;
      case "rename":
        onRename?.(document.id, document.title);
        break;
      case "delete":
        onDelete?.(document.id);
        break;
      default:
        break;
    }
  };

  const ext = getFileExtension(document.file_type, document.title);
  const theme = FILE_TYPE_THEMES[ext] || DEFAULT_THEME;

  const thumbnailUrl =
    document.thumbnail_path && !imageError
      ? `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/${document.thumbnail_path}`
      : null;

  const tags = document.tags || [];

  // 2. Trích xuất thông tin người Upload từ Object Document
  // Tùy theo response API mà lấy fullname, username hoặc trả về tên mặc định

  const uploaderName = document.owner?.full_name || document.owner?.username || "Thành viên";
  const uploaderAvatar = document.owner?.avatar_url || document.owner?.avatar || undefined;
  console.log("Dữ liệu Document từ API:", document);

  return (
    <div
      id={`doc-${document.id}`}
      // Thay đổi chiều cao từ h-[280px] lên h-[290px] để đủ chỗ cho Avatar
      className={`group relative flex h-[290px] w-full flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${theme.border}`}
    >
      {/* 1. KHUNG PREVIEW TÀI LIỆU */}
      <div
        className={`relative h-[135px] w-full shrink-0 cursor-pointer overflow-hidden transition-colors ${theme.bg} flex items-center justify-center`}
        onClick={handleViewDetail}
      >
        <div className="absolute left-2.5 top-2.5 z-10">
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-xs ${theme.badgeBg} ${theme.badgeText}`}>
            {ext || "FILE"}
          </span>
        </div>

        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={document.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <FileIcon type={document.file_type} className="h-14 w-14 drop-shadow-xs" iconClassName="h-7 w-7" />
          </div>
        )}
      </div>

      {/* 2. KHUNG THÔNG TIN TÀI LIỆU */}
      <div className="relative flex flex-1 flex-col justify-between p-3.5">
        <div>
          {/* Tiêu đề & Menu thao tác */}
          <div className="flex items-start justify-between gap-1.5">
            <h3
              onClick={handleViewDetail}
              className="line-clamp-2 flex-1 cursor-pointer text-sm font-semibold text-gray-800 transition-colors hover:text-primary-600 leading-snug"
              title={document.title}
            >
              {document.title}
            </h3>

            <div
              className="shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <GroupDocumentContextMenu onAction={handleAction} permission={permission} />
            </div>
          </div>

          {/* 3. KHỐI THÔNG TIN NGƯỜI UPLOAD (Thêm mới vào đây) */}
          <div className="mt-2.5 flex items-center gap-2">
            <Avatar 
              src={uploaderAvatar} 
              name={uploaderName} 
              size="sm"
              className="h-5 w-5 text-[9px]" // Ghi đè class để size nhỏ bé vừa vặn với thẻ card
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-medium text-gray-700 truncate leading-none">
                {uploaderName}
              </span>
              <span className="text-[10px] text-gray-400 leading-tight mt-0.5 flex items-center gap-1">
                {formatRelativeDate(document.created_at)}
                <span className="h-0.5 w-0.5 rounded-full bg-gray-300" />
                {formatSize(document.file_size)}
              </span>
            </div>
          </div>
        </div>

        {/* 4. THẺ TAGS */}
        <div className="mt-2.5 pt-2 border-t border-gray-100/80">
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1 max-h-[26px] overflow-hidden">
              {tags.slice(0, 3).map((tag: any, index: number) => (
                <span
                  key={tag.id || index}
                  className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-200/80"
                >
                  {tag.name}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="inline-flex items-center rounded-md bg-gray-50 px-1 py-0.5 text-[10px] font-medium text-gray-400">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] italic text-gray-300">Chưa có tag</span>
          )}
        </div>
      </div>
    </div>
  );
}