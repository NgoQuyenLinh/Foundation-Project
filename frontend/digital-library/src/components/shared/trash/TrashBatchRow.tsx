// frontend/digital-library/src/components/shared/trash/TrashBatchRow.tsx
import { useEffect, useRef } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  FolderOpen,
  Info,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { getTrashSourceLabel } from "@/utils/trashUtils";
import type { TrashBatch, TrashDocument } from "@/types/trash";

interface TrashBatchRowProps {
  batch: TrashBatch;
  expanded: boolean;
  selectedDocIds: number[];
  isProcessing?: boolean;
  onToggleExpand: () => void;
  onToggleBatchSelect: (docIds: number[], shouldSelect: boolean) => void;
  onToggleDocSelect: (docId: number) => void;
  onRestoreDocs: (docIds: number[]) => void;
  onDeleteDocs: (docIds: number[]) => void;
  onPreviewDoc: (doc: TrashDocument) => void;
  onInspectDoc: (doc: TrashDocument) => void;
  renderExtraMeta?: (batch: TrashBatch) => React.ReactNode;
}

export function TrashBatchRow({
  batch,
  expanded,
  selectedDocIds,
  isProcessing,
  onToggleExpand,
  onToggleBatchSelect,
  onToggleDocSelect,
  onRestoreDocs,
  onDeleteDocs,
  onPreviewDoc,
  onInspectDoc,
  renderExtraMeta,
}: TrashBatchRowProps) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  // Tính toán trạng thái chọn của cả nhóm ngày
  const selectedInBatchCount = batch.docIds.filter((id) =>
    selectedDocIds.includes(id)
  ).length;
  const isAllSelected =
    batch.docIds.length > 0 && selectedInBatchCount === batch.docIds.length;
  const isPartiallySelected =
    selectedInBatchCount > 0 && selectedInBatchCount < batch.docIds.length;

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);

  // Màu sắc cảnh báo theo số ngày còn lại
  const getRemainingBadgeStyle = (days: number) => {
    if (days <= 7) return "bg-red-50 text-red-700 border-red-200";
    if (days <= 14) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  return (
    <>
      {/* HÀNG GOM NHÓM THEO NGÀY */}
      <tr
        className={cn(
          "group border-b border-gray-100 transition-colors hover:bg-gray-50/90",
          expanded && "bg-emerald-50/20",
          isAllSelected && "bg-emerald-50/40"
        )}
      >
        {/* Cột Checkbox chọn cả nhóm */}
        <td className="w-11 px-4 py-3.5">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={isAllSelected}
            onChange={(e) =>
              onToggleBatchSelect(batch.docIds, e.target.checked)
            }
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            title="Chọn tất cả tài liệu trong ngày này"
          />
        </td>

        {/* Cột Tên nhóm ngày (Click để xổ/đóng danh sách chi tiết) */}
        <td className="px-3 py-3.5">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex w-full items-center gap-3 text-left"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-2xs transition-transform group-hover:border-gray-300">
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-emerald-600" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Calendar className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  Xóa ngày {batch.shortDate || batch.dateKey} —{" "}
                  <span className="text-emerald-700">
                    {batch.documentCount} tài liệu
                  </span>
                </span>

                {selectedInBatchCount > 0 && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                    Đã chọn {selectedInBatchCount}/{batch.documentCount}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span>Ngày {batch.dateKey}</span>
                <span>•</span>
                <span>Tổng dung lượng: {batch.totalSize}</span>
                <span>•</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                  {getTrashSourceLabel(batch.source, batch.groupName)}
                </span>
                {renderExtraMeta?.(batch)}
              </div>
            </div>
          </button>
        </td>

        {/* Cột Thời gian còn lại */}
        <td className="px-4 py-3.5 whitespace-nowrap">
          <div className="inline-flex flex-col">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                getRemainingBadgeStyle(batch.remainingDays)
              )}
            >
              <Clock className="h-3 w-3" />
              Còn {batch.remainingDays} ngày
            </span>
            {batch.expiresAt && (
              <span className="mt-1 text-[11px] text-gray-400">
                Hết hạn: {batch.expiresAt}
              </span>
            )}
          </div>
        </td>

        {/* Cột Thao tác nhanh cho cả nhóm (Phong cách Paperless-ngx) */}
        <td className="px-4 py-3.5 text-right whitespace-nowrap">
          <div className="inline-flex items-center justify-end gap-1.5">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onRestoreDocs(batch.docIds)}
              className="inline-flex items-center gap-1.5 rounded-l-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
              title="Khôi phục tất cả tài liệu trong ngày này"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Khôi phục 
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onDeleteDocs(batch.docIds)}
              className="inline-flex items-center gap-1.5 rounded-r-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              title="Xóa vĩnh viễn tất cả tài liệu trong ngày này"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa 
            </button>
          </div>
        </td>
      </tr>

      {/* DANH SÁCH TÀI LIỆU CHI TIẾT KHI XỔ XUỐNG (EXPANDED) */}
      {expanded && (
        <tr className="border-b border-gray-200 bg-gray-50/60">
          <td colSpan={4} className="p-0">
            <div className="border-l-4 border-emerald-500 bg-white/70 pl-6 pr-4 py-2">
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-2xs">
                {batch.documents.map((doc) => {
                  const isDocSelected = selectedDocIds.includes(doc.id);

                  return (
                    <div
                      key={doc.id}
                      className={cn(
                        "flex flex-col gap-3 px-4 py-2.5 transition-colors sm:flex-row sm:items-center sm:justify-between",
                        isDocSelected ? "bg-emerald-50/50" : "hover:bg-gray-50"
                      )}
                    >
                      {/* Trái: Checkbox + Icon + Tên file + Nút xem trước nhanh */}
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isDocSelected}
                          onChange={() => onToggleDocSelect(doc.id)}
                          className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                          <FileText className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onPreviewDoc(doc)}
                              className="truncate text-left text-xs font-medium text-gray-800 hover:text-emerald-600 hover:underline"
                            >
                              {doc.name}
                            </button>

                            {/* Nút con mắt xem trước ngay cạnh tên giống Paperless-ngx */}
                            <button
                              type="button"
                              onClick={() => onPreviewDoc(doc)}
                              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-emerald-600"
                              title="Xem trước tài liệu"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                            <span className="font-medium text-gray-500">
                              {doc.type}
                            </span>
                            <span>•</span>
                            <span>{doc.size}</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <FolderOpen className="h-3 w-3" />
                              {getTrashSourceLabel(doc.source, doc.groupName)}
                            </span>
                            {doc.deletedTime && (
                              <>
                                <span>•</span>
                                <span>Xóa lúc {doc.deletedTime}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Giữa: Số ngày còn lại của từng tài liệu */}
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            doc.remainingDays <= 7
                              ? "text-red-600"
                              : "text-gray-500"
                          )}
                        >
                          {doc.remainingDays} ngày còn lại
                        </span>

                        {/* Phải: Cụm nút tương tác nhanh trên từng tài liệu */}
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onPreviewDoc(doc)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            title="Xem trước"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Xem trước</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onInspectDoc(doc)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            title="Chi tiết tài liệu"
                          >
                            <Info className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Chi tiết</span>
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => onRestoreDocs([doc.id])}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            title="Khôi phục tài liệu này"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Khôi phục</span>
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => onDeleteDocs([doc.id])}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="Xóa vĩnh viễn tài liệu này"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}