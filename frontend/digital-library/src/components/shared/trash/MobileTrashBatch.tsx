// frontend/digital-library/src/components/shared/trash/MobileTrashBatch.tsx
import {
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Info,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { getTrashSourceLabel } from "@/utils/trashUtils";
import type { TrashBatch, TrashDocument } from "@/types/trash";

interface MobileTrashBatchProps {
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
}

export function MobileTrashBatch({
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
}: MobileTrashBatchProps) {
  const selectedInBatchCount = batch.docIds.filter((id) =>
    selectedDocIds.includes(id)
  ).length;
  const isAllSelected =
    batch.docIds.length > 0 && selectedInBatchCount === batch.docIds.length;

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={(e) => onToggleBatchSelect(batch.docIds, e.target.checked)}
          className="mt-2 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onToggleExpand}
              className="flex items-center gap-2 text-left"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded bg-orange-50 text-orange-600">
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                Xóa ngày {batch.shortDate || batch.dateKey} —{" "}
                {batch.documentCount} tài liệu
              </span>
            </button>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>{batch.totalSize}</span>
            <span>•</span>
            <span className="text-red-600 font-medium">
              Còn {batch.remainingDays} ngày
            </span>
            <span>•</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px]">
              {getTrashSourceLabel(batch.source, batch.groupName)}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onRestoreDocs(batch.docIds)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/50 px-2.5 py-1 text-xs font-medium text-emerald-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Khôi phục 
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onDeleteDocs(batch.docIds)}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50/50 px-2.5 py-1 text-xs font-medium text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa 
            </button>
          </div>

          {expanded && (
            <div className="mt-3 divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {batch.documents.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <div key={doc.id} className="p-2.5">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleDocSelect(doc.id)}
                        className="h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600"
                      />
                      <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-gray-800">
                          {doc.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {doc.type} • {doc.size} • Còn {doc.remainingDays} ngày
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onPreviewDoc(doc)}
                        className="rounded border border-gray-200 bg-white p-1 text-gray-600"
                        title="Xem trước"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onInspectDoc(doc)}
                        className="rounded border border-gray-200 bg-white p-1 text-gray-600"
                        title="Chi tiết"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRestoreDocs([doc.id])}
                        className="rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] font-medium text-emerald-700"
                      >
                        Khôi phục
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDocs([doc.id])}
                        className="rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-600"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}