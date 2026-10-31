// frontend/digital-library/src/pages/personal/TrashPage.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArchiveRestore,
  ChevronsDownUp,
  ChevronsUpDown,
  FileText,
  HardDrive,
  RotateCcw,
  Search,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";

import { trashService } from "@/services/trashService";
import { formatSize } from "@/utils/formatSize";
import { groupDocsIntoBatches } from "@/utils/trashUtils";
import type { TrashDocument } from "@/types/trash";
import {
  TrashStatCard,
  TrashEmptyState,
  TrashConfirmModal,
  TrashBatchRow,
  MobileTrashBatch,
} from "@/components/shared/trash";
import {
  TrashPreviewModal,
  TrashDetailModal,
} from "@/components/shared/trash/TrashDocumentModals";

export default function TrashPage() {
  const queryClient = useQueryClient();

  // Cho phép mở rộng nhiều nhóm ngày cùng lúc
  const [expandedBatchIds, setExpandedBatchIds] = useState<number[]>([]);
  // Danh sách ID tài liệu đang được tích chọn
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  // Tìm kiếm & lọc nhanh
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUrgent, setFilterUrgent] = useState(false);

  // Trạng thái các Modal
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    mode: "empty" | "delete_selected";
    targetDocIds: number[];
  }>({ isOpen: false, mode: "empty", targetDocIds: [] });

  const [previewDoc, setPreviewDoc] = useState<TrashDocument | null>(null);
  const [inspectDoc, setInspectDoc] = useState<TrashDocument | null>(null);

  const { data: trashedDocs = [], isLoading } = useQuery({
    queryKey: ["trash"],
    queryFn: trashService.getAll,
  });

  // Lọc tài liệu theo từ khóa tìm kiếm hoặc sắp hết hạn
  const filteredDocs = useMemo(() => {
    return trashedDocs.filter((doc: any) => {
      const name = (doc.title || doc.file_name || doc.name || "").toLowerCase();
      const matchSearch =
        !searchQuery.trim() || name.includes(searchQuery.toLowerCase());
      const days = doc.remaining_days ?? doc.remainingDays ?? 30;
      const matchUrgent = !filterUrgent || days <= 7;
      return matchSearch && matchUrgent;
    });
  }, [trashedDocs, searchQuery, filterUrgent]);

  // Gom nhóm theo Ngày
  const batches = useMemo(
    () => groupDocsIntoBatches(filteredDocs),
    [filteredDocs]
  );

  const allVisibleDocIds = useMemo(
    () => batches.flatMap((b) => b.docIds),
    [batches]
  );

  // Mutation: Khôi phục 1 hoặc nhiều tài liệu
  const restoreMutation = useMutation({
    mutationFn: async (docIds: number[]) => {
      await Promise.all(docIds.map((id) => trashService.restore(id)));
    },
    onSuccess: (_, restoredIds) => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSelectedDocIds((prev) =>
        prev.filter((id) => !restoredIds.includes(id))
      );
    },
  });

  // Mutation: Xóa vĩnh viễn các tài liệu được chọn
  const permanentDeleteMutation = useMutation({
    mutationFn: async (docIds: number[]) => {
      if (typeof (trashService as any).permanentDelete === "function") {
        await Promise.all(
          docIds.map((id) => (trashService as any).permanentDelete(id))
        );
      } else {
        // Fallback nếu service dùng tên hàm delete
        await Promise.all(
          docIds.map((id) => (trashService as any).delete?.(id))
        );
      }
    },
    onSuccess: (_, deletedIds) => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      setSelectedDocIds((prev) =>
        prev.filter((id) => !deletedIds.includes(id))
      );
      setConfirmState({ isOpen: false, mode: "empty", targetDocIds: [] });
    },
  });

  // Mutation: Dọn sạch toàn bộ thùng rác
  const emptyTrashMutation = useMutation({
    mutationFn: trashService.emptyTrash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      setSelectedDocIds([]);
      setConfirmState({ isOpen: false, mode: "empty", targetDocIds: [] });
    },
  });

  // Xử lý đóng/mở 1 nhóm ngày
  const handleToggleExpand = (batchId: number) => {
    setExpandedBatchIds((prev) =>
      prev.includes(batchId)
        ? prev.filter((id) => id !== batchId)
        : [...prev, batchId]
    );
  };

  // Mở rộng / Thu gọn tất cả các ngày
  const isAllExpanded =
    batches.length > 0 && expandedBatchIds.length === batches.length;
  const handleToggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedBatchIds([]);
    } else {
      setExpandedBatchIds(batches.map((b) => b.id));
    }
  };

  // Chọn / Bỏ chọn tất cả tài liệu trong 1 ngày
  const handleToggleBatchSelect = (docIds: number[], shouldSelect: boolean) => {
    if (shouldSelect) {
      setSelectedDocIds((prev) => Array.from(new Set([...prev, ...docIds])));
    } else {
      setSelectedDocIds((prev) => prev.filter((id) => !docIds.includes(id)));
    }
  };

  // Chọn / Bỏ chọn 1 tài liệu lẻ
  const handleToggleDocSelect = (docId: number) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  };

  // Chọn tất cả ở Header bảng
  const isAllVisibleSelected =
    allVisibleDocIds.length > 0 &&
    allVisibleDocIds.every((id) => selectedDocIds.includes(id));

  const handleToggleSelectAllVisible = (checked: boolean) => {
    if (checked) {
      setSelectedDocIds(allVisibleDocIds);
    } else {
      setSelectedDocIds([]);
    }
  };

  const totalDocuments = trashedDocs.length;
  const totalStorageBytes = trashedDocs.reduce(
    (sum: number, d: any) => sum + (d.file_size ?? 0),
    0
  );

  const isProcessing =
    restoreMutation.isPending ||
    permanentDeleteMutation.isPending ||
    emptyTrashMutation.isPending;

  if (isLoading) {
    return <div className="h-64 rounded-xl bg-gray-200 animate-pulse" />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header + Cụm nút Bulk Actions phong cách Paperless-ngx */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Thùng rác</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tài liệu trong thùng rác được gom theo ngày xóa và sẽ tự động xóa
            vĩnh viễn sau 30 ngày.
          </p>
        </div>

        {/* Thanh Action Bar giống Ảnh 2 (Paperless-ngx) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={selectedDocIds.length === 0 || isProcessing}
            onClick={() => setSelectedDocIds([])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <XCircle className="h-4 w-4 text-gray-400" />
            Bỏ chọn {selectedDocIds.length > 0 && `(${selectedDocIds.length})`}
          </button>

          <button
            type="button"
            disabled={selectedDocIds.length === 0 || isProcessing}
            onClick={() => restoreMutation.mutate(selectedDocIds)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700 shadow-2xs transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            Khôi phục đã chọn
          </button>

          <button
            type="button"
            disabled={selectedDocIds.length === 0 || isProcessing}
            onClick={() =>
              setConfirmState({
                isOpen: true,
                mode: "delete_selected",
                targetDocIds: selectedDocIds,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 shadow-2xs transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            Xóa vĩnh viễn đã chọn
          </button>

          <button
            type="button"
            disabled={batches.length === 0 || isProcessing}
            onClick={() =>
              setConfirmState({
                isOpen: true,
                mode: "empty",
                targetDocIds: [],
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white shadow-2xs transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            Dọn sạch thùng rác
          </button>
        </div>
      </section>

      {/* Thẻ thống kê (Stats) */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <TrashStatCard
          icon={<ArchiveRestore className="h-5 w-5" />}
          iconClassName="bg-emerald-50 text-emerald-600"
          label="Ngày có tài liệu xóa"
          value={batches.length}
          description="Gom nhóm tự động theo ngày"
        />
        <TrashStatCard
          icon={<FileText className="h-5 w-5" />}
          iconClassName="bg-blue-50 text-blue-600"
          label="Tổng tài liệu"
          value={totalDocuments}
          description={
            selectedDocIds.length > 0
              ? `Đang chọn ${selectedDocIds.length} tài liệu`
              : "Tất cả tệp tin trong thùng rác"
          }
        />
        <TrashStatCard
          icon={<HardDrive className="h-5 w-5" />}
          iconClassName="bg-amber-50 text-amber-600"
          label="Dung lượng chiếm dụng"
          value={formatSize(totalStorageBytes)}
          description="Có thể giải phóng hoặc khôi phục"
        />
      </section>

      {/* Bảng Danh Sách Chính */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
        {/* Thanh tìm kiếm & Bộ lọc nhanh */}
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh tài liệu trong thùng rác..."
              className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-xs text-gray-800 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterUrgent((v) => !v)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                filterUrgent
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Sắp xóa vĩnh viễn (≤ 7 ngày)
            </button>

            {batches.length > 0 && (
              <button
                type="button"
                onClick={handleToggleExpandAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                {isAllExpanded ? (
                  <>
                    <ChevronsDownUp className="h-3.5 w-3.5" />
                    Thu gọn tất cả
                  </>
                ) : (
                  <>
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    Mở rộng tất cả
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {batches.length === 0 ? (
          <TrashEmptyState />
        ) : (
          <>
            {/* Bảng Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-xs font-semibold text-gray-600">
                    <th className="w-11 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isAllVisibleSelected}
                        onChange={(e) =>
                          handleToggleSelectAllVisible(e.target.checked)
                        }
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        title="Chọn tất cả"
                      />
                    </th>
                    <th className="px-3 py-3">Nhóm ngày xóa / Tên tài liệu</th>
                    <th className="px-4 py-3">Thời gian còn lại</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <TrashBatchRow
                      key={batch.id}
                      batch={batch}
                      expanded={expandedBatchIds.includes(batch.id)}
                      selectedDocIds={selectedDocIds}
                      isProcessing={isProcessing}
                      onToggleExpand={() => handleToggleExpand(batch.id)}
                      onToggleBatchSelect={handleToggleBatchSelect}
                      onToggleDocSelect={handleToggleDocSelect}
                      onRestoreDocs={(ids) => restoreMutation.mutate(ids)}
                      onDeleteDocs={(ids) =>
                        setConfirmState({
                          isOpen: true,
                          mode: "delete_selected",
                          targetDocIds: ids,
                        })
                      }
                      onPreviewDoc={(doc) => setPreviewDoc(doc)}
                      onInspectDoc={(doc) => setInspectDoc(doc)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Danh sách Mobile */}
            <div className="divide-y divide-gray-100 md:hidden">
              {batches.map((batch) => (
                <MobileTrashBatch
                  key={batch.id}
                  batch={batch}
                  expanded={expandedBatchIds.includes(batch.id)}
                  selectedDocIds={selectedDocIds}
                  isProcessing={isProcessing}
                  onToggleExpand={() => handleToggleExpand(batch.id)}
                  onToggleBatchSelect={handleToggleBatchSelect}
                  onToggleDocSelect={handleToggleDocSelect}
                  onRestoreDocs={(ids) => restoreMutation.mutate(ids)}
                  onDeleteDocs={(ids) =>
                    setConfirmState({
                      isOpen: true,
                      mode: "delete_selected",
                      targetDocIds: ids,
                    })
                  }
                  onPreviewDoc={(doc) => setPreviewDoc(doc)}
                  onInspectDoc={(doc) => setInspectDoc(doc)}
                />
              ))}
            </div>

            {/* Chân bảng tổng kết giống Paperless-ngx (Ảnh 2) */}
            <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50/60 px-4 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Tổng cộng <strong>{filteredDocs.length}</strong> tài liệu trong{" "}
                <strong>{batches.length}</strong> ngày{" "}
                {selectedDocIds.length > 0 && (
                  <span className="font-semibold text-emerald-700">
                    ({selectedDocIds.length} tài liệu đang được chọn)
                  </span>
                )}
              </span>
              <span>Tự động dọn sạch các mục quá 30 ngày</span>
            </div>
          </>
        )}
      </section>

      {/* Ghi chú Mẹo */}
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3">
        <Star className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-xs leading-5 text-emerald-800">
          <span className="font-semibold">Mẹo:</span> Tích chọn vào ô vuông ở
          hàng ngày (ví dụ <em>"Xóa ngày 25/10 — 5 tài liệu"</em>) để khôi phục
          hoặc xóa vĩnh viễn cả ngày, hoặc nhấn vào hàng đó để xổ danh sách chi
          tiết và chọn từng tài liệu riêng lẻ.
        </p>
      </div>

      {/* Modal Xác nhận Xóa vĩnh viễn / Dọn sạch */}
      <TrashConfirmModal
        isOpen={confirmState.isOpen}
        title={
          confirmState.mode === "empty"
            ? "Dọn sạch toàn bộ thùng rác?"
            : `Xóa vĩnh viễn ${confirmState.targetDocIds.length} tài liệu?`
        }
        description={
          confirmState.mode === "empty"
            ? "Tất cả tài liệu trong thùng rác sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
            : "Các tài liệu đã chọn sẽ bị xóa vĩnh viễn khỏi hệ thống và không thể khôi phục lại."
        }
        isLoading={
          emptyTrashMutation.isPending || permanentDeleteMutation.isPending
        }
        onClose={() =>
          setConfirmState({ isOpen: false, mode: "empty", targetDocIds: [] })
        }
        onConfirm={() => {
          if (confirmState.mode === "empty") {
            emptyTrashMutation.mutate();
          } else {
            permanentDeleteMutation.mutate(confirmState.targetDocIds);
          }
        }}
      />

      {/* Modal Xem trước tài liệu */}
      <TrashPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onRestore={(id) => restoreMutation.mutate([id])}
        onDelete={(id) =>
          setConfirmState({
            isOpen: true,
            mode: "delete_selected",
            targetDocIds: [id],
          })
        }
      />

      {/* Modal Xem chi tiết tài liệu */}
      <TrashDetailModal
        document={inspectDoc}
        onClose={() => setInspectDoc(null)}
        onRestore={(id) => restoreMutation.mutate([id])}
        onDelete={(id) =>
          setConfirmState({
            isOpen: true,
            mode: "delete_selected",
            targetDocIds: [id],
          })
        }
      />
    </div>
  );
}