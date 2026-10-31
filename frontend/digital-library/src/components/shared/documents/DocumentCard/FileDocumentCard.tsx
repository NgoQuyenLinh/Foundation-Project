// src/components/shared/FileDocumentCard.tsx

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Heart } from "lucide-react";
import { FileIcon } from "@/components/shared/documents/FileIcon";
import { DocumentContextMenu } from "@/components/shared/documents/DocumentContextMenu";
import { useFavoriteStore } from "@/stores/favoriteStore";
import { getCurrentFullPath } from "@/utils/bundleNavigation";
import type { DocumentCardProps } from "./DocumentCard";

// ======================================================
// Helpers & Themes
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
  const location = useLocation();
  const [imageError, setImageError] = useState(false);

  const targetUrl = `${basePath}/${document.id}`;

  const handleOpenDoc = () => {
    navigate(targetUrl, { state: { from: getCurrentFullPath(location) } });
  };

  const handleAction = (action: string) => {
    if (action === "view") handleOpenDoc();
    else onAction(action, document.id);
  };

  const ext = getFileExtension(document.extension || document.type);
  const theme = FILE_TYPE_THEMES[ext] || DEFAULT_THEME;

  const thumbnailUrl =
    document.thumbnail_path && !imageError
      ? `${import.meta.env.VITE_API_URL}/${document.thumbnail_path}`
      : null;

  const tags = document.tags || [];
  const docNumId = Number(document.id);
  const isFavorite = useFavoriteStore((state) => (isNaN(docNumId) ? false : state.isFavorite(docNumId)));
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isNaN(docNumId)) {
      await toggleFavorite(docNumId);
    }
  };

  return (
    <div
      id={`doc-${document.id}`}
      className={`group relative flex h-[280px] w-full flex-col rounded-xl border bg-white shadow-xs transition-all duration-200 hover:z-30 hover:-translate-y-1 hover:shadow-md focus-within:z-30 ${
        isFavorite
          ? "border-rose-300 ring-1 ring-rose-200 shadow-rose-50"
          : `border-gray-200/80 ${theme.border}`
      }`}
    >
      {/* Khung Preview */}
      <div
        className={`relative h-[135px] w-full shrink-0 cursor-pointer overflow-hidden rounded-t-xl transition-colors ${theme.bg} flex items-center justify-center`}
        onClick={handleOpenDoc}
      >
        <div className="absolute left-2.5 top-2.5 z-10">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-xs ${theme.badgeBg} ${theme.badgeText}`}
          >
            {ext || "FILE"}
          </span>
        </div>

        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={document.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <FileIcon
              type={document.type}
              className="h-14 w-14 drop-shadow-xs"
            />
          </div>
        )}
      </div>

      {/* Thông tin Chi tiết */}
      <div className="relative flex flex-1 flex-col justify-between p-3.5 rounded-b-xl bg-white">
        <div>
          <div className="flex items-start justify-between gap-1.5">
{/* 1. Bọc h3 và Tooltip trong một div có className "relative" */}
            <div className="relative flex-1 min-w-0">
              <h3
                onClick={handleOpenDoc}
                className="line-clamp-2 cursor-pointer text-sm font-semibold text-gray-800 transition-colors hover:text-primary-600 leading-snug"
                title={document.name}
              >
                {document.name}
              </h3>

              <div className="pointer-events-none absolute bottom-full left-0 mb-1.5 z-50 hidden max-w-xs rounded-md bg-gray-900/90 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100 whitespace-normal leading-tight">
                {document.name}
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={handleFavoriteClick}
                title={isFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
                className={`p-1 rounded-full transition-all duration-150 focus:outline-none ${
                  isFavorite
                    ? "opacity-100 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    : "opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 hover:bg-gray-100"
                }`}
              >
                <Heart
                  className={`h-4 w-4 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`}
                />
              </button>

              <div
                className="relative z-50 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <DocumentContextMenu
                  documentId={document.id}
                  onAction={handleAction}
                  allowedActions={allowedActions}
                  extraItems={extraItems}
                />
              </div>
            </div>
          </div>

          <p className="mt-1.5 text-[11px] font-medium text-gray-400 flex items-center gap-1.5">
            <span>{document.size}</span>
            <span className="h-1 w-1 rounded-full bg-gray-300" />
            <span>{document.updatedAt}</span>
          </p>
        </div>

        {/* Tags */}
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
            <span className="text-[11px] italic text-gray-300">
              Chưa có tag
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
