// src/components/shared/DocumentCard.tsx

import { useNavigate } from "react-router-dom";
import { FileIcon, type FileTypeMap } from "@/components/shared/FileIcon";
import {
  DocumentContextMenu,
  type DocumentAction,
} from "@/components/shared/DocumentContextMenu";

// ======================================================
// Helpers
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
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
  };

  return mimeMap[cleanType] || cleanType.split("/").pop() || cleanType;
};

// ======================================================
// Types
// ======================================================

export interface DocumentTag {
  id: number;
  name: string;
}

import { type DocumentMenuItem } from "@/components/shared/DocumentContextMenu";

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
  };
  onAction: (action: DocumentAction | string, documentId: string) => void;
  basePath?: string;
  allowedActions?: DocumentAction[];
  extraItems?: DocumentMenuItem[];
}

// ======================================================
// Component
// ======================================================

export function DocumentCard({ document, onAction, basePath = "/personal/documents", allowedActions, extraItems }: DocumentCardProps) {
  const navigate = useNavigate();

  const handleAction = (action: DocumentAction | string, id: string) => {
    if (action === "view") navigate(`${basePath}/${id}`);
    else onAction(action, id);
  };

  const ext = getFileExtension(document.extension || document.type);
  const formattedExt = ext ? `.${ext}` : "";
  const thumbnailUrl = document.thumbnail_path
    ? `${import.meta.env.VITE_API_URL}/${document.thumbnail_path}`
    : null;
    
  const tags = document.tags || [];

  return (
    <div id={`doc-${document.id}`} className="group relative flex min-h-[280px] flex-col cursor-pointer overflow-visible rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:z-10 hover:-translate-y-0.5 hover:shadow-md focus-within:z-20">
      
      {/* Preview */}
      <div
        className="relative h-[140px] w-full shrink-0 overflow-hidden rounded-t-xl bg-gray-50 flex items-center justify-center"
        onClick={() => navigate(`${basePath}/${document.id}`)}
      >
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={document.name}
            className="h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
        <div className={thumbnailUrl ? "hidden" : ""}>
          <FileIcon type={document.type} className="h-14 w-14" />
        </div>
      </div>

      {/* Information */}
      <div className="relative flex min-h-[140px] flex-1 items-start justify-between gap-2 rounded-b-xl bg-white px-3 py-3">
        <div
          className="min-w-0 flex-1"
          onClick={() => navigate(`${basePath}/${document.id}`)}
        >
          <h3
            className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900"
            title={document.name}
          >
            <span>{document.name}</span>
            {formattedExt && (
              <span className="ml-1 shrink-0 font-mono text-xs font-normal text-gray-400">
                ({formattedExt})
              </span>
            )}
          </h3>

          <p className="mt-1 text-xs leading-4 text-gray-400">
            {document.size} • {document.updatedAt}
          </p>

          {/* Tags */}
          {tags.length > 0 ? (
            <div
              className="mt-1 line-clamp-3 overflow-hidden text-xs italic leading-4 text-gray-400"
              title={tags.map((tag) => `#${tag.name}`).join(" ")}
            >
              {tags.map((tag, index) => (
                <span key={tag.id}>
                  #{tag.name}
                  {index < tags.length - 1 && " "}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs italic leading-4 text-gray-300">
              Chưa có tag
            </p>
          )}
        </div>

        {/* Context Menu */}
        <div
          className="absolute right-2 top-2 z-10 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <DocumentContextMenu 
            onAction={(action) => handleAction(action, document.id)} 
            allowedActions={allowedActions}
            extraItems={extraItems}
          />
        </div>
      </div>
    </div>
  );
}