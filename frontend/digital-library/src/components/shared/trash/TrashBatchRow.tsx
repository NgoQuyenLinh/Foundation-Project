import { ChevronDown, ChevronRight, FileText, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { getTrashSourceLabel } from "@/utils/trashUtils";
import type { TrashBatch } from "@/types/trash";

interface TrashBatchRowProps {
  batch: TrashBatch;
  expanded: boolean;
  isRestoring?: boolean;
  onToggle: () => void;
  onRestore: () => void;
  renderExtraMeta?: (batch: TrashBatch) => React.ReactNode; // Extension point cho Group
}

export function TrashBatchRow({
  batch,
  expanded,
  isRestoring,
  onToggle,
  onRestore,
  renderExtraMeta,
}: TrashBatchRowProps) {
  return (
    <>
      <tr
        className={cn(
          "border-b border-gray-100 transition-colors hover:bg-gray-50/70",
          expanded && "bg-gray-50/50"
        )}
      >
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="flex min-w-0 items-center gap-2 text-left"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
            )}

            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-orange-50 text-orange-500">
              <Trash2 className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-gray-800">
                Xóa ngày {batch.deletedAt.split(" ")[0]}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-gray-400">{batch.deletedAt}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    batch.source === "group_orphaned"
                      ? "bg-orange-50 text-orange-600"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {getTrashSourceLabel(batch.source, batch.groupName)}
                </span>
                {renderExtraMeta?.(batch)}
              </div>
            </div>
          </button>
        </td>

        <td className="px-4 py-3 text-xs text-gray-600">
          {batch.documentCount} tệp tin
        </td>

        <td className="px-4 py-3 text-xs text-gray-600">{batch.totalSize}</td>

        <td className="px-4 py-3">
          <div>
            <p
              className={cn(
                "text-xs font-medium",
                batch.remainingDays <= 7 ? "text-red-600" : "text-red-500"
              )}
            >
              Còn {batch.remainingDays} ngày
            </p>
            <p className="mt-0.5 text-[10px] text-gray-400">{batch.expiresAt}</p>
          </div>
        </td>

        <td className="px-4 py-3 text-right">
          <button
            type="button"
            disabled={isRestoring}
            onClick={onRestore}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 transition-colors hover:text-green-700 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {isRestoring ? "Đang khôi phục..." : "Khôi phục"}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50/50">
          <td colSpan={5} className="px-8 py-3">
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-3 py-2">
                <p className="text-xs font-semibold text-gray-700">
                  Tài liệu trong gói
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {batch.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="truncate text-xs text-gray-700">
                          {doc.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {doc.type} · {getTrashSourceLabel(doc.source, doc.groupName)}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-[10px] text-gray-400">
                      {doc.size}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}