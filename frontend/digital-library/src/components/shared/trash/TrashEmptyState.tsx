import { Trash2 } from "lucide-react";

interface TrashEmptyStateProps {
  title?: string;
  description?: string;
}

export function TrashEmptyState({
  title = "Thùng rác đang trống",
  description = "Các tài liệu bạn xóa sẽ xuất hiện ở đây và được giữ trong 30 ngày trước khi xóa vĩnh viễn.",
}: TrashEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <Trash2 className="h-7 w-7" />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-gray-800">{title}</h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-gray-400">
        {description}
      </p>
    </div>
  );
}