// src/components/shared/AddToBundleModal.tsx
// Modal để thêm tài liệu từ kho cá nhân vào bundle

import { useState } from "react";
import { X, Search, FolderInput, FileText, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { documentService } from "@/services/documentService";
import { formatSize } from "@/utils/formatSize";
import { cn } from "@/utils/cn";

interface AddToBundleModalProps {
  bundleId: number;
  bundleName: string;
  childrenQueryKey: (string | number)[];
  bundleQueryKey: (string | number)[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddToBundleModal({
  bundleId,
  bundleName,
  childrenQueryKey,
  bundleQueryKey,
  onClose,
  onSuccess,
}: AddToBundleModalProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Fetch personal documents that are not in any bundle
  const { data: docsData, isLoading } = useQuery({
    queryKey: ["personal-documents-no-bundle"],
    queryFn: () =>
      documentService.getAll({ page_size: 100 }).then((data) => {
        // Filter out bundles and documents already in a bundle
        return data.items.filter((d) => !d.is_bundle && !d.bundle_parent_id);
      }),
    staleTime: 30 * 1000,
  });

  const documents = docsData ?? [];

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addMutation = useMutation({
    mutationFn: (docIds: number[]) =>
      documentService.addFromPersonal(bundleId, docIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: childrenQueryKey });
      queryClient.invalidateQueries({ queryKey: bundleQueryKey });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["personal-documents-no-bundle"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Không thể thêm tài liệu. Vui lòng thử lại.";
      alert(msg);
    },
  });

  const getMimeExt = (mimeType?: string) => {
    const m: Record<string, string> = {
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
      "application/vnd.ms-powerpoint": "ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
      "image/jpeg": "jpg",
      "image/png": "png",
    };
    return m[mimeType ?? ""] ?? (mimeType?.split("/")[1] ?? "file");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <FolderInput className="h-5 w-5 text-purple-600" />
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Thêm từ kho cá nhân
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Thêm vào gói: <span className="font-medium text-purple-600">{bundleName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm tài liệu theo tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0">
          {isLoading ? (
            <div className="flex flex-col gap-2 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FileText className="h-8 w-8 mb-2" />
              <p className="text-sm">
                {searchQuery
                  ? "Không tìm thấy tài liệu phù hợp"
                  : "Không có tài liệu nào có thể thêm"}
              </p>
              <p className="text-xs mt-1">
                (Chỉ hiện tài liệu chưa thuộc gói nào)
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {filteredDocs.map((doc) => {
                const isSel = selectedIds.includes(doc.id);
                const ext = getMimeExt(doc.file_type);
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => toggleSelect(doc.id)}
                    className={cn(
                      "flex items-center gap-3 py-2.5 px-2 rounded-lg text-left transition-colors",
                      isSel ? "bg-purple-50" : "hover:bg-gray-50"
                    )}
                  >
                    {/* Checkbox */}
                    <div
                      className={cn(
                        "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        isSel
                          ? "border-purple-600 bg-purple-600"
                          : "border-gray-300 bg-white"
                      )}
                    >
                      {isSel && <Check className="h-3 w-3 text-white" />}
                    </div>

                    {/* Icon */}
                    <div className="h-8 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-gray-500" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {ext.toUpperCase()} · {formatSize(doc.file_size ?? 0)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 shrink-0">
          <span className="text-sm text-gray-500">
            {selectedIds.length > 0 ? (
              <span className="font-medium text-purple-700">
                Đã chọn {selectedIds.length} tài liệu
              </span>
            ) : (
              "Chưa chọn tài liệu nào"
            )}
          </span>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={addMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={selectedIds.length === 0 || addMutation.isPending}
              onClick={() => addMutation.mutate(selectedIds)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {addMutation.isPending
                ? "Đang thêm..."
                : `Thêm ${selectedIds.length > 0 ? selectedIds.length + " " : ""}tài liệu`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
