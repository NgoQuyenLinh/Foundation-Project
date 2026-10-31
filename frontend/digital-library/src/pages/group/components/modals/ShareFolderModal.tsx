import { useState } from "react";
import { X, Search, Folder as FolderIcon, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { ShareFolderModalProps } from "../../types/groupSpace.types";

export default function ShareFolderModal({
  folders,
  isSharing = false,
  onClose,
  onShare,
}: ShareFolderModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <Card className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Chia sẻ cả thư mục
            </h2>
            <p className="text-xs text-gray-500">
              Tất cả tài liệu cá nhân mang nhãn (tags) của thư mục sẽ được chia sẻ vào nhóm
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSharing}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3">
          <Input
            icon={<Search className="h-4 w-4 text-gray-400" />}
            placeholder="Tìm thư mục cá nhân..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-white text-sm"
          />
        </div>

        {/* List */}
        <div className="flex-1 space-y-2 overflow-y-auto p-5 custom-scrollbar max-h-96">
          {filteredFolders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            return (
              <label
                key={folder.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                  isSelected
                    ? "border-primary-500 bg-primary-50/30"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <input
                    type="radio"
                    name="selectedFolder"
                    checked={isSelected}
                    onChange={() => setSelectedFolderId(folder.id)}
                    className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${folder.color || "#4CAF50"}20`,
                      color: folder.color || "#4CAF50",
                    }}
                  >
                    <FolderIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {folder.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{folder.document_count ?? 0} tài liệu</span>
                      {folder.tags && folder.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <TagIcon className="h-3 w-3" />
                            {folder.tags.length} nhãn
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </label>
            );
          })}

          {filteredFolders.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              {query
                ? "Không tìm thấy thư mục phù hợp."
                : "Kho cá nhân của bạn chưa có thư mục nào."}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3">
          <span className="text-xs text-gray-500">
            {selectedFolderId ? "Đã chọn 1 thư mục" : "Chưa chọn thư mục"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSharing}>
              Hủy
            </Button>
            <Button
              disabled={!selectedFolderId || isSharing}
              onClick={() => selectedFolderId && onShare(selectedFolderId)}
            >
              {isSharing ? "Đang chia sẻ..." : "Chia sẻ thư mục"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
