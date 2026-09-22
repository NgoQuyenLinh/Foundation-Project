import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface TrashConfirmModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function TrashConfirmModal({
  isOpen,
  title = "Dọn sạch thùng rác?",
  description = "Tất cả tài liệu trong thùng rác sẽ bị xử lý. Hành động này không thể hoàn tác.",
  isLoading,
  onClose,
  onConfirm,
}: TrashConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm leading-5 text-gray-500">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" disabled={isLoading} onClick={onClose}>
            Hủy
          </Button>

          <Button
            variant="primary"
            disabled={isLoading}
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? "Đang xử lý..." : "Dọn sạch"}
          </Button>
        </div>
      </div>
    </div>
  );
}