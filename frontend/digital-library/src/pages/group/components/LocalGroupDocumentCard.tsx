// frontend/digital-library/src/pages/group/components/LocalGroupDocumentCard.tsx

import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { FileIcon } from "@/components/shared/FileIcon";
import { GroupDocumentContextMenu } from "@/pages/group/components/GroupDocumentContextMenu";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import type { LocalGroupDocumentCardProps } from "../types/groupSpace.types";

export default function LocalGroupDocumentCard({
  document,
  permission,
  groupId,
  onSave,
  onDelete,
  onRename, // <-- 1. Nhận thêm prop onRename
}: LocalGroupDocumentCardProps) {
  const navigate = useNavigate();

  const handleAction = async (action: string) => {
    switch (action) {
      case "view":
        navigate(`/groups/${groupId}/documents/${document.id}`);
        break;
      case "download":
        console.log("Download", document.id);
        break;
      case "save-to-personal":
        await onSave?.(document.id);
        break;
      case "rename": // <-- 2. Bổ sung case xử lý đổi tên
        onRename?.(document.id, document.title);
        break;
      case "delete":
        if (
          window.confirm("Bạn có chắc chắn muốn xóa tài liệu này khỏi nhóm?")
        ) {
          await onDelete?.(document.id);
        }
        break;
      default:
        console.log("Action not handled in LocalGroupDocumentCard:", action);
    }
  };

  return (
    <Card className="group relative flex aspect-[1/0.82] flex-col p-0 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-[0_0_60%] items-center justify-center overflow-hidden rounded-t-xl bg-gray-50">
        <FileIcon
          type={document.file_type}
          className="h-16 w-16"
          iconClassName="h-8 w-8"
        />
      </div>
      <div className="flex flex-1 items-start gap-2 px-3 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
            {document.title}
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            {formatSize(document.file_size)} ·{" "}
            {formatRelativeDate(document.created_at)}
          </p>
        </div>
        <GroupDocumentContextMenu
          onAction={handleAction}
          permission={permission}
        />
      </div>
    </Card>
  );
}