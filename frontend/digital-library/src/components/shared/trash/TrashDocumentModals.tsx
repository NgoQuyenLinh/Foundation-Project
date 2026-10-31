// frontend/digital-library/src/components/shared/trash/TrashDocumentModals.tsx
import {
  Calendar,
  Clock,
  FileText,
  FolderOpen,
  HardDrive,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getTrashSourceLabel } from "@/utils/trashUtils";
import type { TrashDocument } from "@/types/trash";

interface DocModalProps {
  document: TrashDocument | null;
  onClose: () => void;
  onRestore: (docId: number) => void;
  onDelete: (docId: number) => void;
}

/**
 * 1. Modal Xem Trước Nhanh (Quick Preview)
 */
export function TrashPreviewModal({
  document,
  onClose,
  onRestore,
  onDelete,
}: DocModalProps) {
  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <FileText className="h-5 w-5 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-gray-900">
                {document.name}
              </h3>
              <p className="text-xs text-gray-400">
                {document.type} • {document.size} • Tự động xóa sau{" "}
                {document.remainingDays} ngày
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nội dung Preview */}
        <div className="flex-1 overflow-auto bg-gray-100 p-6">
          {document.previewUrl ? (
            <iframe
              src={document.previewUrl}
              title={document.name}
              className="h-full w-full rounded-lg border border-gray-200 bg-white"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
              <FileText className="h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-700">
                Bản xem trước của "{document.name}"
              </p>
              <p className="mt-1 max-w-md text-xs text-gray-400">
                Tài liệu đang nằm trong thùng rác ({document.size}). Bạn có thể
                khôi phục tài liệu về vị trí cũ để chỉnh sửa hoặc tải xuống.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-3">
          <span className="text-xs text-gray-500">
            Nguồn: {getTrashSourceLabel(document.source, document.groupName)}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onDelete(document.id);
                onClose();
              }}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Xóa vĩnh viễn
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onRestore(document.id);
                onClose();
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Khôi phục ngay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. Modal Xem Thông Tin Chi Tiết (Document Info)
 */
export function TrashDetailModal({
  document,
  onClose,
  onRestore,
  onDelete,
}: DocModalProps) {
  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">
            Thông tin chi tiết tài liệu
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5 text-sm">
          <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 break-words">
                {document.name}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Định dạng: {document.type}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-gray-100 p-3">
              <span className="flex items-center gap-1.5 text-gray-400">
                <HardDrive className="h-3.5 w-3.5" /> Dung lượng
              </span>
              <p className="mt-1 font-semibold text-gray-800">{document.size}</p>
            </div>

            <div className="rounded-lg border border-gray-100 p-3">
              <span className="flex items-center gap-1.5 text-gray-400">
                <FolderOpen className="h-3.5 w-3.5" /> Vị trí gốc
              </span>
              <p className="mt-1 font-semibold text-gray-800">
                {getTrashSourceLabel(document.source, document.groupName)}
              </p>
            </div>

            <div className="rounded-lg border border-gray-100 p-3">
              <span className="flex items-center gap-1.5 text-gray-400">
                <Calendar className="h-3.5 w-3.5" /> Thời điểm xóa
              </span>
              <p className="mt-1 font-semibold text-gray-800">
                {document.deletedAt}
              </p>
            </div>

            <div className="rounded-lg border border-red-100 bg-red-50/40 p-3">
              <span className="flex items-center gap-1.5 text-red-500">
                <Clock className="h-3.5 w-3.5" /> Tự động xóa sau
              </span>
              <p className="mt-1 font-semibold text-red-600">
                Còn {document.remainingDays} ngày
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onDelete(document.id);
              onClose();
            }}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            Xóa vĩnh viễn
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onRestore(document.id);
              onClose();
            }}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Khôi phục
          </Button>
        </div>
      </div>
    </div>
  );
}