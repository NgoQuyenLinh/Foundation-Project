// src/pages/personal/components/DeleteFolderConfirmModal.tsx
import { Button } from "@/components/ui/Button";

interface DeleteFolderConfirmModalProps {
  folderName?: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteFolderConfirmModal({
  folderName,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteFolderConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Xóa thư mục?
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Bạn có chắc muốn xóa thư mục này không?
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm font-medium text-gray-800">
              {folderName || "Thư mục"}
            </p>
          </div>

          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
            <p className="text-xs leading-5 text-green-700">
              <span className="font-semibold">Lưu ý:</span> Xóa thư mục sẽ
              không xóa các tài liệu hoặc nhãn (tag) bên trong. Các tài liệu
              và tag vẫn được giữ nguyên.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Hủy
          </Button>

          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white border-transparent"
          >
            {isDeleting ? "Đang xóa..." : "Xóa thư mục"}
          </Button>
        </div>
      </div>
    </div>
  );
}