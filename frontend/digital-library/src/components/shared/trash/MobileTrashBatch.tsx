import { ChevronDown, ChevronRight, FileText, RotateCcw } from "lucide-react";
import { cn } from "@/utils/cn";
import { getTrashSourceLabel } from "@/utils/trashUtils";
import type { TrashBatch } from "@/types/trash";

interface MobileTrashBatchProps {
  batch: TrashBatch;
  expanded: boolean;
  isRestoring?: boolean;
  onToggle: () => void;
  onRestore: () => void;
}

export function MobileTrashBatch({
  batch,
  expanded,
  isRestoring,
  onToggle,
  onRestore,
}: MobileTrashBatchProps) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <button type="button" onClick={onToggle} className="text-left">
            <p className="text-sm font-medium text-gray-800">
              Xóa ngày {batch.deletedAt.split(" ")[0]}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">{batch.deletedAt}</p>
            <p className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              {getTrashSourceLabel(batch.source, batch.groupName)}
            </p>
          </button>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-400">Tài liệu</p>
              <p className="text-xs text-gray-700">{batch.documentCount} tệp tin</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Dung lượng</p>
              <p className="text-xs text-gray-700">{batch.totalSize}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400">Tự động xóa</p>
              <p className="text-xs font-medium text-red-500">
                Còn {batch.remainingDays} ngày
              </p>
            </div>

            <button
              type="button"
              disabled={isRestoring}
              onClick={onRestore}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {isRestoring ? "Đang khôi phục..." : "Khôi phục"}
            </button>
          </div>

          {expanded && (
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {batch.documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0">
                      <p className="truncate text-xs text-gray-700">{document.name}</p>
                      <p className="truncate text-[10px] text-gray-400">
                        {getTrashSourceLabel(document.source, document.groupName)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-gray-400">
                    {document.size}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}