// src/components/shared/documents/DocumentDetail/components/DocumentTagSection.tsx

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { COLORS, type TagType } from "../DocumentDetail.types";

interface DocumentTagSectionProps {
  tags: TagType[];
  canManageTags: boolean;
  allTags: TagType[];
  isLoadingTags: boolean;
  onSaveTags: (tagIds: number[]) => void;
  isSavingTags: boolean;
  onCreateTag: (newTag: { name: string; color: string }, onCreated?: (tag: TagType) => void) => void;
  isCreatingTag: boolean;
  onRemoveTag: (tagId: number) => void;
  isRemovingTag: boolean;
}

export function DocumentTagSection({
  tags,
  canManageTags,
  allTags,
  isLoadingTags,
  onSaveTags,
  isSavingTags,
  onCreateTag,
  isCreatingTag,
  onRemoveTag,
  isRemovingTag,
}: DocumentTagSectionProps) {
  const [selectedTags, setSelectedTags] = useState<TagType[]>(tags);
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].hex);

  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSelectedTags(tags);
  }, [tags]);

  // Tính toán tọa độ bằng fixed position tương tự Dropdown
  useEffect(() => {
    if (!isTagEditorOpen || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const popupWidth = 320; // w-80 tương đương 320px
    
    let calculatedLeft = rect.left;
    
    // Nếu popup bị tràn màn hình bên phải thì canh lề phải của popup bằng lề phải của nút
    if (rect.left + popupWidth > window.innerWidth) {
      calculatedLeft = rect.right - popupWidth;
    }

    setPopoverCoords({
      top: rect.bottom + 8, // Cách nút cộng 8px
      left: calculatedLeft,
    });
  }, [isTagEditorOpen]);

  const handleTogglePopover = () => {
    if (!isTagEditorOpen) {
      setSelectedTags([...tags]);
      setTagSearchQuery("");
      setSelectedColor(COLORS[0].hex);
    }
    setIsTagEditorOpen((prev) => !prev);
  };

  const toggleTag = (tag: TagType) => {
    setSelectedTags((prev) => {
      const exists = prev.some((item) => item.id === tag.id);
      if (exists) return prev.filter((item) => item.id !== tag.id);
      return [...prev, tag];
    });
  };

  const handleCreateNewTag = () => {
    const trimmed = tagSearchQuery.trim();
    if (!trimmed) return;

    onCreateTag(
      { name: trimmed, color: selectedColor },
      (createdTag) => {
        setSelectedTags((prev) => {
          if (prev.some((t) => t.id === createdTag.id)) return prev;
          return [...prev, createdTag];
        });
        setTagSearchQuery("");
        setSelectedColor(COLORS[0].hex);
      },
    );
  };

  const handleSave = () => {
    const tagIds = selectedTags
      .map((tag) => Number(tag.id))
      .filter((tagId) => Number.isInteger(tagId));
    onSaveTags(tagIds);
    setIsTagEditorOpen(false);
    setTagSearchQuery("");
  };

  const handleCancel = () => {
    setSelectedTags(tags);
    setTagSearchQuery("");
    setSelectedColor(COLORS[0].hex);
    setIsTagEditorOpen(false);
  };

  const selectedTagIds = selectedTags.map((t) => t.id);
  const filteredTags = allTags.filter((t) =>
    t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()),
  );
  const isExactMatch = allTags.some(
    (t) => t.name.toLowerCase() === tagSearchQuery.toLowerCase().trim(),
  );

  return (
    <div className="mt-5 relative">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Nhãn dán</h3>

      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => {
          const baseColor = tag.color || "#2E7D32";
          return (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{
                color: baseColor,
                backgroundColor: `${baseColor}1A`,
                borderColor: `${baseColor}40`,
              }}
            >
              {tag.name}
              {canManageTags && (
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag.id)}
                  disabled={isRemovingTag}
                  className="opacity-60 hover:opacity-100 transition-opacity focus:outline-none disabled:opacity-30"
                  title="Xóa tag khỏi tài liệu"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}

        {canManageTags && (
          <button
            ref={buttonRef}
            type="button"
            onClick={handleTogglePopover}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed text-gray-400 transition-colors",
              isTagEditorOpen
                ? "border-primary-500 text-primary-600 bg-primary-50"
                : "border-gray-300 hover:border-primary-500 hover:text-primary-600",
            )}
            title="Quản lý nhãn dán"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {isTagEditorOpen &&
        canManageTags &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-transparent"
            onClick={() => setIsTagEditorOpen(false)}
          >
            <div
              className="fixed w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-4 animate-in fade-in zoom-in-95"
              style={{
                top: popoverCoords.top,
                left: popoverCoords.left,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4">
                <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                  <span>Gắn nhãn dán (Tags)</span>
                  <span className="text-xs font-normal text-gray-400">
                    Đã chọn {selectedTagIds.length}
                  </span>
                </label>
              </div>

              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50/50 p-3">
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
                  {isLoadingTags ? (
                    <div className="w-full text-center text-xs text-gray-500 py-2">
                      Đang tải nhãn dán...
                    </div>
                  ) : tagSearchQuery.trim() !== "" && !isExactMatch ? (
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
                  ) : null}

                  {filteredTags.length > 0
                    ? filteredTags.map((tag) => {
                        const isSelected = selectedTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                              isSelected
                                ? "bg-primary-600 text-white shadow-sm ring-1 ring-primary-600"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600",
                            )}
                          >
                            {tag.name}
                            {isSelected && <Check className="h-3 w-3" />}
                          </button>
                        );
                      })
                    : (isExactMatch || tagSearchQuery.trim() === "") &&
                      !isLoadingTags && (
                        <div className="w-full text-center text-xs text-gray-500 py-2">
                          Không tìm thấy tag phù hợp.
                        </div>
                      )}
                </div>
              </div>

              {tagSearchQuery.trim() !== "" && !isExactMatch && (
                <div className="mb-4 pt-2 border-t border-gray-100">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Màu sắc tag mới
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
                            `flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110 ${color.tw}`,
                            isSelected
                              ? "ring-2 ring-gray-900 ring-offset-2"
                              : "ring-1 ring-black/10",
                          )}
                        >
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Huỷ bỏ
                </button>
                <Button
                  variant="primary"
                  className="h-8 text-xs px-4"
                  onClick={handleSave}
                  disabled={isSavingTags || isCreatingTag}
                >
                  {isSavingTags ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}