// src/components/shared/RenameDocumentModal.tsx
import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface RenameDocumentModalProps {
  isOpen: boolean;
  initialTitle: string;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (newTitle: string) => void | Promise<void>;
}

export function RenameDocumentModal({
  isOpen,
  initialTitle,
  isPending = false,
  onClose,
  onConfirm,
}: RenameDocumentModalProps) {
  const [title, setTitle] = useState(initialTitle);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (trimmed) {
      onConfirm(trimmed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Đổi tên tài liệu
        </h3>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onClose();
          }}
          autoFocus
          placeholder="Nhập tên mới..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 mb-5"
        />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button
            variant="primary"
            disabled={isPending || !title.trim()}
            onClick={handleSubmit}
          >
            {isPending ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </div>
    </div>
  );
}