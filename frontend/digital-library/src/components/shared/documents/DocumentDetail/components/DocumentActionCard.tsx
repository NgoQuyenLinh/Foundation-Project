// src/components/shared/documents/DocumentDetail/components/DocumentActionCard.tsx

import { useState, useRef, useEffect } from "react";
import {
  Download,
  ChevronDown,
  ExternalLink,
  Share2,
  Star,
  FolderInput,
  Edit2,
  Trash2,
  Image as ImageIcon, // <-- Thêm icon Image từ lucide-react
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";
import { activityService } from "@/services/activityService";

interface DocumentActionCardProps {
  documentId?: number;
  fileTitle: string;
  fileDownloadUrl: string;
  markdownDownloadUrl: string | null;
  fileTypeLabel: string;
  canEdit: boolean;
  canDelete: boolean;
  isRenamePending: boolean;
  isDeletePending: boolean;
  onStartRename: () => void;
  onDelete: () => void;
  onSetCover: () => void; // <-- Thêm prop để xử lý khi bấm nút "Cài ảnh bìa"
  onDownloadSuccess?: () => void;
}

export function DocumentActionCard({
  documentId,
  fileTitle,
  fileDownloadUrl,
  markdownDownloadUrl,
  fileTypeLabel,
  canEdit,
  canDelete,
  isRenamePending,
  isDeletePending,
  onStartRename,
  onDelete,
  onSetCover, // <-- Nhận prop
  onDownloadSuccess,
}: DocumentActionCardProps) {
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDownloadMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(e.target as Node)
      ) {
        setIsDownloadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDownloadMenuOpen]);

  const handleDownloadOriginal = async () => {
    if (documentId) {
      try {
        await activityService.downloadDocumentFile(documentId, fileTitle);
        onDownloadSuccess?.();
        return;
      } catch (err) {
        console.error("Lỗi khi tải file qua API, dùng fallback link:", err);
      }
    }
    const link = window.document.createElement("a");
    link.href = fileDownloadUrl;
    link.download = fileTitle;
    link.target = "_blank";
    link.click();
    onDownloadSuccess?.();
  };

  const handleDeleteClick = () => {
    if (
      window.confirm(
        "Xóa tài liệu này? Bạn có thể khôi phục trong thùng rác.",
      )
    ) {
      onDelete();
    }
  };

  return (
    <Card className="flex flex-col gap-3 min-w-0 overflow-hidden">
      {/* Nút Tải xuống có lựa chọn định dạng */}
      <div className="relative w-full" ref={downloadMenuRef}>
        {markdownDownloadUrl ? (
          <div className="flex w-full rounded-lg shadow-xs overflow-hidden border border-primary-600 bg-primary-600">
            <button
              type="button"
              onClick={handleDownloadOriginal}
              className="flex-1 min-w-0 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors focus:outline-none"
              title="Tải xuống tài liệu bản gốc"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="truncate">Tải xuống</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDownloadMenuOpen((prev) => !prev)}
              aria-expanded={isDownloadMenuOpen}
              aria-label="Tùy chọn định dạng tải xuống"
              title="Tùy chọn tải xuống"
              className={cn(
                "flex-shrink-0 flex items-center justify-center gap-1 px-2.5 border-l border-primary-500/50 bg-primary-700 hover:bg-primary-800 text-white text-xs font-medium transition-colors focus:outline-none",
                isDownloadMenuOpen && "bg-primary-800"
              )}
            >
              <span className="text-[11px] font-medium hidden xs:inline">Tùy chọn</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  isDownloadMenuOpen && "rotate-180"
                )}
              />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDownloadOriginal}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors shadow-xs focus:outline-none"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span className="truncate">Tải xuống tài liệu</span>
          </button>
        )}

        {/* Menu chọn định dạng tải về */}
        {isDownloadMenuOpen && markdownDownloadUrl && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                setIsDownloadMenuOpen(false);
                handleDownloadOriginal();
              }}
              className="w-full text-left flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span>Tải về bản gốc</span>
              <span className="text-xs text-gray-400 uppercase">
                {fileTypeLabel.split(" ")[0]}
              </span>
            </button>

            <a
              href={markdownDownloadUrl}
              download={`${fileTitle}.md`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsDownloadMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border-t border-gray-100"
            >
              <span>Tải về định dạng Markdown</span>
              <span className="text-xs font-bold bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                .MD
              </span>
            </a>
          </div>
        )}
      </div>

      {/* Danh sách hành động khác */}
      <div className="flex flex-col mt-1">
        {[
          {
            icon: ExternalLink,
            label: "Mở trong thẻ mới",
            onClick: () => window.open(fileDownloadUrl, "_blank"),
            show: true,
          },
          {
            icon: Share2,
            label: "Chia sẻ tài liệu",
            onClick: () => console.log("Chia sẻ"),
            show: true,
          },
          {
            icon: Star,
            label: "Thêm vào yêu thích",
            onClick: () => console.log("Yêu thích"),
            show: true,
          },
          {
            icon: FolderInput,
            label: "Di chuyển tệp",
            onClick: () => console.log("Di chuyển"),
            show: true,
          },
          ...(canEdit
            ? [
                {
                  icon: Edit2,
                  label: isRenamePending ? "Đang lưu..." : "Đổi tên tệp",
                  onClick: onStartRename,
                  disabled: isRenamePending,
                  show: true,
                },
                {
                  icon: ImageIcon,  
                  label: "Cập nhật ảnh bìa", 
                  onClick: onSetCover,  
                  disabled: false,
                  show: true,
                },
              ]
            : []),
        ]
          .filter((item) => item.show)
          .map(({ icon: Icon, label, onClick, disabled }) => (
            <button
              key={label}
              type="button"
              disabled={disabled}
              className="flex items-center gap-3 px-1 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              onClick={onClick}
            >
              <Icon className="h-4 w-4 text-gray-500 shrink-0" />
              {label}
            </button>
          ))}

        {canDelete && (
          <div className="border-t border-gray-200 mt-1 pt-1">
            <button
              type="button"
              disabled={isDeletePending}
              onClick={handleDeleteClick}
              className="flex items-center gap-3 px-1 py-2.5 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              {isDeletePending ? "Đang xóa..." : "Xóa tài liệu"}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}