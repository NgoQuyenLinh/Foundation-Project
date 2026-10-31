import { useState } from "react";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FileIcon } from "@/components/shared/documents/FileIcon";
import { formatSize } from "@/utils/formatSize";
import type { SimpleShareModalProps } from "../../types/groupSpace.types";

export default function SimpleShareModal({
  title,
  documents,
  isSharing = false,
  onClose,
  onShare,
}: SimpleShareModalProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [query, setQuery] = useState("");

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(query.toLowerCase().trim())
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredDocs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDocs.map((d) => d.id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <Card className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500">
              Chọn các tài liệu từ kho cá nhân của bạn để chia sẻ vào nhóm
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

        {/* Search & Actions */}
        <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-3">
          <div className="flex-1">
            <Input
              icon={<Search className="h-4 w-4 text-gray-400" />}
              placeholder="Tìm tài liệu cá nhân..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-white text-sm"
            />
          </div>
          {filteredDocs.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-medium text-primary-600 hover:underline shrink-0"
            >
              {selectedIds.length === filteredDocs.length
                ? "Bỏ chọn tất cả"
                : "Chọn tất cả"}
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 space-y-2 overflow-y-auto p-5 custom-scrollbar max-h-96">
          {filteredDocs.map((doc) => {
            const isChecked = selectedIds.includes(doc.id);
            return (
              <label
                key={doc.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                  isChecked
                    ? "border-primary-500 bg-primary-50/30"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelect(doc.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <FileIcon type={doc.file_type} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {doc.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatSize(doc.file_size || 0)}
                    </p>
                  </div>
                </div>
              </label>
            );
          })}

          {filteredDocs.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              {query
                ? "Không tìm thấy tài liệu phù hợp."
                : "Kho cá nhân của bạn chưa có tài liệu nào để chia sẻ."}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3">
          <span className="text-xs text-gray-500">
            Đã chọn {selectedIds.length} tài liệu
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSharing}>
              Hủy
            </Button>
            <Button
              disabled={selectedIds.length === 0 || isSharing}
              onClick={() => onShare?.(selectedIds)}
            >
              {isSharing ? "Đang chia sẻ..." : "Chia sẻ"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
