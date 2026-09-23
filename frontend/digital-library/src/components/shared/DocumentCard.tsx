// src/components/shared/DocumentCard.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import { FileIcon, type FileTypeMap } from "@/components/shared/FileIcon";
import {
  DocumentContextMenu,
  type DocumentAction,
  type DocumentMenuItem,
} from "@/components/shared/DocumentContextMenu";

// ======================================================
// Helpers & File Type Themes
// ======================================================

const getFileExtension = (type: string) => {
  if (!type) return "";
  let cleanType = type.toLowerCase().trim();
  if (cleanType.startsWith(".")) cleanType = cleanType.substring(1);

  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
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

// Cấu hình màu sắc dịu nhẹ (Pastel) theo từng nhóm định dạng file
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

// ======================================================
// Types
// ======================================================

export interface DocumentTag {
  id: number;
  name: string;
}

export interface DocumentCardProps {
  document: {
    id: string;
    name: string;
    type: FileTypeMap | string;
    updatedAt: string;
    size: string;
    extension?: string;
    thumbnail_path?: string | null;
    tags?: DocumentTag[];
    is_bundle?: boolean;
    bundle_parent_id?: number | null;
    bundle_children_count?: number | null;
  };
  onAction: (action: DocumentAction | string, documentId: string) => void;
  basePath?: string;
  allowedActions?: DocumentAction[];
  extraItems?: DocumentMenuItem[];
}

// ======================================================
// Component
// ======================================================

export function DocumentCard({
  document,
  onAction,
  basePath = "/personal/documents",
  allowedActions,
  extraItems,
}: DocumentCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const isBundle = document.is_bundle === true;

  const getDocTargetUrl = (docId: string) => {
    if (isBundle) {
      if (basePath.startsWith("/groups/")) {
        return `${basePath.split("/documents")[0]}/bundle/${docId}`;
      }
      return `/personal/bundle/${docId}`;
    }
    return `${basePath}/${docId}`;
  };

  const handleAction = (action: DocumentAction | string, id: string) => {
    if (action === "view") navigate(getDocTargetUrl(id));
    else onAction(action, id);
  };

  const ext = getFileExtension(document.extension || document.type);
  const theme = FILE_TYPE_THEMES[ext] || DEFAULT_THEME;

  const thumbnailUrl =
    document.thumbnail_path && !imageError
      ? `${import.meta.env.VITE_API_URL}/${document.thumbnail_path}`
      : null;

  const tags = document.tags || [];

  return (
    <div
      id={`doc-${document.id}`}
      className={`group relative flex h-[280px] w-full flex-col rounded-xl border ${
        isBundle
          ? "border-purple-200 bg-purple-50/20"
          : "border-gray-200/80 bg-white"
      } shadow-xs transition-all duration-200 hover:z-30 hover:-translate-y-1 hover:shadow-md focus-within:z-30 ${
        isBundle ? "hover:border-purple-300" : theme.border
      }`}
    >
      {/* 1. KHUNG PREVIEW TÀI LIỆU */}
      <div
        className={`relative h-[135px] w-full shrink-0 cursor-pointer overflow-hidden rounded-t-xl transition-colors ${
          isBundle ? "bg-purple-100/40" : theme.bg
        } flex items-center justify-center`}
        onClick={() => navigate(getDocTargetUrl(document.id))}
      >
        {/* Badge định dạng ở góc trên bên trái */}
        <div className="absolute left-2.5 top-2.5 z-10">
          {isBundle ? (
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-xs bg-purple-100 text-purple-700">
              BUNDLE
            </span>
          ) : (
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-xs ${theme.badgeBg} ${theme.badgeText}`}
            >
              {ext || "FILE"}
            </span>
          )}
        </div>

        {/* Thumbnail hoặc Icon đại diện */}
        {isBundle ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="relative">
              <Package className="h-16 w-16 text-purple-500" />
              <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                {document.bundle_children_count ?? 0}
              </span>
            </div>
          </div>
        ) : thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={document.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <FileIcon type={document.type} className="h-14 w-14 drop-shadow-xs" />
          </div>
        )}
      </div>

      {/* 2. KHUNG THÔNG TIN TÀI LIỆU */}
      <div className="relative flex flex-1 flex-col justify-between p-3.5 rounded-b-xl bg-white">
        <div>
          {/* Tiêu đề & Menu thao tác */}
          <div className="flex items-start justify-between gap-1.5">
            <h3
              onClick={() => navigate(getDocTargetUrl(document.id))}
              className="line-clamp-2 flex-1 cursor-pointer text-sm font-semibold text-gray-800 transition-colors hover:text-primary-600 leading-snug"
              title={document.name}
            >
              {document.name}
            </h3>

            {/* Context Menu (Nổi lên trên cùng khi hover/focus) */}
            <div
              className="relative z-50 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <DocumentContextMenu
                onAction={(action) => handleAction(action, document.id)}
                allowedActions={allowedActions}
                extraItems={extraItems}
              />
            </div>
          </div>

          {isBundle && (
            <p className="text-xs text-purple-600 font-medium mt-0.5">
              {document.bundle_children_count ?? 0} tài liệu bên trong
            </p>
          )}

          {/* Dung lượng & Ngày cập nhật */}
          <p className="mt-1.5 text-[11px] font-medium text-gray-400 flex items-center gap-1.5">
            <span>{document.size}</span>
            <span className="h-1 w-1 rounded-full bg-gray-300" />
            <span>{document.updatedAt}</span>
          </p>
        </div>

        {/* 3. THẺ TAGS (Dạng Pill/Chip) */}
        <div className="mt-2.5 pt-2 border-t border-gray-100/80">
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1 max-h-[26px] overflow-hidden">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
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