// src/pages/personal/components/CreateFolderModal.tsx

import { useState, useEffect } from "react";
import { X, Check, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

export interface FolderInitialData {
  id: number;
  name: string;
  color: string;
  tagIds: number[] | string[];
}

export interface FolderSubmitData {
  id?: number;
  name: string;
  color: string;
  tagIds: number[];
}

interface CreateFolderModalProps {
  onClose: () => void;
  initialData?: FolderInitialData | null;
  availableTags: { id: number; name: string }[];
  onCreateTag?: (name: string) => Promise<{ id: number; name: string }>;
  onSubmitData: (data: FolderSubmitData) => Promise<void>;
  isSubmitting: boolean;
}

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

export function CreateFolderModal({ onClose, initialData, availableTags, onCreateTag, onSubmitData, isSubmitting }: CreateFolderModalProps) {
  const isEditMode = !!initialData;

  const [folderName, setFolderName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].hex);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Load dữ liệu ban đầu khi ở chế độ Chỉnh Sửa
  useEffect(() => {
    if (initialData) {
      setFolderName(initialData.name || "");
      
      const matchedColor = COLORS.find(
        (c) => c.tw === initialData.color || c.hex === initialData.color
      );
      setSelectedColor(matchedColor?.hex || COLORS[0].hex);

      const ids = (initialData.tagIds || []).map((id) => Number(id));
      setSelectedTagIds(ids);
    } else {
      setFolderName("");
      setSelectedColor(COLORS[0].hex);
      setSelectedTagIds([]);
    }
  }, [initialData]);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const filteredTags = availableTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  const isExactMatch = availableTags.some(
    (tag) => tag.name.toLowerCase() === tagSearchQuery.toLowerCase().trim()
  );

  const handleCreateNewTag = async () => {
    const name = tagSearchQuery.trim();
    if (!name || !onCreateTag) return;
    setIsCreatingTag(true);
    try {
      const newTag = await onCreateTag(name);
      setSelectedTagIds((prev) => [...prev, newTag.id]);
      setTagSearchQuery("");
    } finally {
      setIsCreatingTag(false);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    // Thêm await để đợi Mutation xử lý xong từ API
    await onSubmitData({
      id: initialData?.id,
      name: folderName.trim() || "Chưa có tên",
      color: selectedColor,
      tagIds: selectedTagIds,
    });
    // Sau khi xử lý xong mới tự động đóng Modal
    onClose();
  } catch (error) {
    console.error("Lỗi khi lưu thư mục:", error);
  }
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">
              {isEditMode ? "Chỉnh sửa thư mục" : "Tạo thư mục mới"}
            </h2>
            {!isEditMode && (
              <span className="text-sm font-medium text-gray-400">1 / 3</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
          {/* Tên thư mục */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Tên thư mục <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="VD: Tài liệu tham khảo..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-gray-400"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
              <span>Gắn nhãn dán (Tags)</span>
              <span className="text-xs font-normal text-gray-400">
                Đã chọn {selectedTagIds.length}
              </span>
            </label>

            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  placeholder="Tìm hoặc tạo tag mới..."
                  className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="max-h-36 overflow-y-auto pr-1 flex flex-wrap gap-2 custom-scrollbar">
                {tagSearchQuery.trim() !== "" && !isExactMatch && onCreateTag && (
                  <button
                    type="button"
                    onClick={handleCreateNewTag}
                    disabled={isCreatingTag}
                    className="flex items-center gap-1 rounded-full border border-dashed border-primary-500 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-100 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isCreatingTag
                      ? "Đang tạo..."
                      : `Tạo mới "${tagSearchQuery.trim()}"`}
                  </button>
                )}

                {filteredTags.length > 0 ? (
                  filteredTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                          isSelected
                            ? "bg-primary-600 text-white shadow-sm ring-1 ring-primary-600"
                            : "bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                        )}
                      >
                        {tag.name}
                        {isSelected && <Check className="h-3 w-3" />}
                      </button>
                    );
                  })
                ) : (
                  isExactMatch || tagSearchQuery.trim() === "" ? null : (
                    <div className="w-full text-center text-xs text-gray-500 py-2">
                      Không tìm thấy tag phù hợp.
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Chọn màu sắc */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Màu sắc
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {COLORS.map((color) => {
                const isSelected = selectedColor === color.hex;
                return (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setSelectedColor(color.hex)}
                    className={cn(
                      `flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110 ${color.tw}`,
                      isSelected
                        ? "ring-2 ring-gray-900 ring-offset-2"
                        : "ring-1 ring-black/10"
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-5"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="px-6 py-2"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? isEditMode
                  ? "Đang cập nhật..."
                  : "Đang tạo..."
                : isEditMode
                ? "Lưu thay đổi"
                : "Tiếp theo"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
