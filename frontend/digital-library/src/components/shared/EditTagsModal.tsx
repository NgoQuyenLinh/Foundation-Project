// src/components/shared/EditTagsModal.tsx
// Modal để sửa tags cho Bundle — đồng bộ xuống tất cả children

import { useState } from "react";
import { X, Check, Plus, Search, Tag as TagIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { tagService, type Tag } from "@/services/tagService";
import { documentService } from "@/services/documentService";

const COLORS = [
  { hex: "#4CAF50", tw: "bg-green-500" },
  { hex: "#2196F3", tw: "bg-blue-500" },
  { hex: "#F59E0B", tw: "bg-amber-500" },
  { hex: "#9C27B0", tw: "bg-purple-500" },
  { hex: "#EF4444", tw: "bg-red-500" },
  { hex: "#06B6D4", tw: "bg-cyan-500" },
  { hex: "#F97316", tw: "bg-orange-500" },
  { hex: "#64748B", tw: "bg-slate-500" },
];

interface EditTagsModalProps {
  bundleId: number;
  bundleQueryKey: (string | number)[];
  childrenQueryKey: (string | number)[];
  currentTags?: Tag[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditTagsModal({
  bundleId,
  bundleQueryKey,
  childrenQueryKey,
  currentTags = [],
  onClose,
  onSuccess,
}: EditTagsModalProps) {
  const queryClient = useQueryClient();

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    currentTags.map((t) => t.id)
  );
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [newTagColor, setNewTagColor] = useState(COLORS[0].hex);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Fetch all tags
  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["all-tags"],
    queryFn: () => tagService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const filteredTags = allTags.filter((t) =>
    t.name.toLowerCase().includes(tagSearchQuery.toLowerCase().trim())
  );
  const isExactMatch = allTags.some(
    (t) => t.name.toLowerCase() === tagSearchQuery.toLowerCase().trim()
  );

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // Create new tag
  const handleCreateNewTag = async () => {
    const name = tagSearchQuery.trim();
    if (!name) return;
    setIsCreatingTag(true);
    try {
      const newTag = await tagService.create({ name, color: newTagColor });
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      setSelectedTagIds((prev) => [...prev, newTag.id]);
      setTagSearchQuery("");
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Save tags mutation — calls PATCH /documents/{bundleId}/tags
  const saveTagsMutation = useMutation({
    mutationFn: (tagIds: number[]) =>
      documentService.updateTags(bundleId, tagIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bundleQueryKey });
      queryClient.invalidateQueries({ queryKey: childrenQueryKey });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Không thể lưu nhãn dán. Vui lòng thử lại.";
      alert(message);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <TagIcon className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">Sửa nhãn dán (Tags)</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
            ⚡ Tags của gói sẽ tự động đồng bộ xuống tất cả tài liệu con bên trong.
          </p>

          {/* Tag search + list */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
              <span>Chọn nhãn dán</span>
              <span className="text-xs font-normal text-gray-400">
                Đã chọn {selectedTagIds.length}
              </span>
            </label>

            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
              {/* Search input */}
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  placeholder="Tìm hoặc tạo tag mới..."
                  className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Color picker for new tag */}
              {tagSearchQuery.trim() !== "" && !isExactMatch && (
                <div className="mb-3 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Màu sắc cho tag mới
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {COLORS.map((color) => {
                      const isSel = newTagColor === color.hex;
                      return (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => setNewTagColor(color.hex)}
                          className={cn(
                            `flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110 ${color.tw}`,
                            isSel ? "ring-2 ring-gray-900 ring-offset-1" : "ring-1 ring-black/10"
                          )}
                        >
                          {isSel && <Check className="h-3 w-3 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tag pills */}
              <div className="max-h-36 overflow-y-auto pr-1 flex flex-wrap gap-2">
                {tagSearchQuery.trim() !== "" && !isExactMatch && (
                  <button
                    type="button"
                    onClick={handleCreateNewTag}
                    disabled={isCreatingTag}
                    className="flex items-center gap-1 rounded-full border border-dashed border-purple-500 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-100 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isCreatingTag ? "Đang tạo..." : `Tạo mới "${tagSearchQuery.trim()}"`}
                  </button>
                )}

                {filteredTags.length > 0 ? (
                  filteredTags.map((tag) => {
                    const isSel = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                          isSel
                            ? "text-white shadow-sm ring-1 ring-purple-600"
                            : "bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600"
                        )}
                        style={isSel ? { backgroundColor: tag.color || "#7c3aed" } : {}}
                      >
                        {tag.name}
                        {isSel && <Check className="h-3 w-3" />}
                      </button>
                    );
                  })
                ) : tagSearchQuery.trim() === "" ? (
                  <div className="w-full text-center text-xs text-gray-400 py-3">
                    Chưa có nhãn dán nào. Nhập tên để tạo mới.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saveTagsMutation.isPending}>
            Hủy
          </Button>
          <Button
            variant="primary"
            disabled={saveTagsMutation.isPending}
            onClick={() => saveTagsMutation.mutate(selectedTagIds)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saveTagsMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </div>
    </div>
  );
}
