import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, FileText, HardDrive, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { trashService } from "@/services/trashService";
import { formatSize } from "@/utils/formatSize";
import { groupDocsIntoBatches } from "@/utils/trashUtils";
import {
  TrashStatCard,
  TrashEmptyState,
  TrashConfirmModal,
  TrashBatchRow,
  MobileTrashBatch,
} from "@/components/shared/trash";

export default function TrashPage() {
  const queryClient = useQueryClient();
  const [expandedBatchId, setExpandedBatchId] = useState<number | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  const { data: trashedDocs = [], isLoading } = useQuery({
    queryKey: ["trash"],
    queryFn: trashService.getAll,
  });

  const batches = useMemo(() => groupDocsIntoBatches(trashedDocs), [trashedDocs]);

  const restoreMutation = useMutation({
    mutationFn: async (docIds: number[]) => {
      await Promise.all(docIds.map((id) => trashService.restore(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setExpandedBatchId(null);
    },
  });

  const emptyTrashMutation = useMutation({
    mutationFn: trashService.emptyTrash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      setShowEmptyConfirm(false);
    },
  });

  const totalDocuments = trashedDocs.length;
  const totalStorageBytes = trashedDocs.reduce(
    (sum: number, d: any) => sum + (d.file_size ?? 0),
    0
  );

  if (isLoading) {
    return <div className="h-64 rounded-xl bg-gray-200 animate-pulse" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-xl font-semibold text-gray-900">Thùng rác</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tài liệu trong thùng rác sẽ bị xóa vĩnh viễn sau 30 ngày.
        </p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <TrashStatCard
          icon={<ArchiveRestore className="h-5 w-5" />}
          iconClassName="bg-green-50 text-green-600"
          label="Gói xóa"
          value={batches.length}
          description="Gói lưu trữ tạm thời"
        />
        <TrashStatCard
          icon={<FileText className="h-5 w-5" />}
          iconClassName="bg-blue-50 text-blue-600"
          label="Tài liệu"
          value={totalDocuments}
          description="Tổng số tệp tin"
        />
        <TrashStatCard
          icon={<HardDrive className="h-5 w-5" />}
          iconClassName="bg-yellow-50 text-yellow-600"
          label="Dung lượng"
          value={formatSize(totalStorageBytes)}
          description="Khả năng phục hồi tối đa"
        />
      </section>

      {/* Main Table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Các gói xóa gần đây</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Các tài liệu được xóa theo từng đợt.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<Trash2 className="h-4 w-4" />}
            disabled={batches.length === 0 || emptyTrashMutation.isPending}
            onClick={() => setShowEmptyConfirm(true)}
            className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            Dọn sạch thùng rác
          </Button>
        </div>

        {batches.length === 0 ? (
          <TrashEmptyState />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-left text-xs text-gray-500">
                    <th className="px-4 py-3 font-medium">Tên gói xóa</th>
                    <th className="px-4 py-3 font-medium">Số tài liệu</th>
                    <th className="px-4 py-3 font-medium">Dung lượng</th>
                    <th className="px-4 py-3 font-medium">Tự động xóa sau</th>
                    <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <TrashBatchRow
                      key={batch.id}
                      batch={batch}
                      expanded={expandedBatchId === batch.id}
                      isRestoring={restoreMutation.isPending}
                      onToggle={() =>
                        setExpandedBatchId((c) => (c === batch.id ? null : batch.id))
                      }
                      onRestore={() => restoreMutation.mutate(batch.docIds)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-100 md:hidden">
              {batches.map((batch) => (
                <MobileTrashBatch
                  key={batch.id}
                  batch={batch}
                  expanded={expandedBatchId === batch.id}
                  isRestoring={restoreMutation.isPending}
                  onToggle={() =>
                    setExpandedBatchId((c) => (c === batch.id ? null : batch.id))
                  }
                  onRestore={() => restoreMutation.mutate(batch.docIds)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Tip Note */}
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <Star className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        <p className="text-xs leading-5 text-green-700">
          <span className="font-semibold">Mẹo:</span> Bạn có thể khôi phục cả gói
          hoặc xem chi tiết từng tài liệu để chọn khôi phục riêng.
        </p>
      </div>

      <TrashConfirmModal
        isOpen={showEmptyConfirm}
        isLoading={emptyTrashMutation.isPending}
        onClose={() => setShowEmptyConfirm(false)}
        onConfirm={() => emptyTrashMutation.mutate()}
      />
    </div>
  );
}