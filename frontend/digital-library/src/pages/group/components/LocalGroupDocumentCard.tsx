// src/pages/group/components/LocalGroupDocumentCard.tsx

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
  onRename,
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
      case "rename":
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

  const tags = document.tags || [];

  return (
    <Card className="group relative flex flex-col p-0 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div 
        className="flex h-[130px] w-full items-center justify-center overflow-hidden rounded-t-xl bg-gray-50 cursor-pointer"
        onClick={() => navigate(`/groups/${groupId}/documents/${document.id}`)}
      >
        <FileIcon
          type={document.file_type}
          className="h-14 w-14"
          iconClassName="h-7 w-7"
        />
      </div>
      <div className="flex flex-1 items-start justify-between gap-2 px-3 py-3">
        <div 
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => navigate(`/groups/${groupId}/documents/${document.id}`)}
        >
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900" title={document.title}>
            {document.title}
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            {formatSize(document.file_size)} ·{" "}
            {formatRelativeDate(document.created_at)}
          </p>

          {/* --- HIỂN THỊ TAGS --- */}
          {tags.length > 0 ? (
            <div
              className="mt-1.5 line-clamp-2 overflow-hidden text-xs italic leading-4 text-gray-400"
              title={tags.map((tag: any) => `#${tag.name}`).join(" ")}
            >
              {tags.map((tag: any, index: number) => (
                <span key={tag.id || index}>
                  #{tag.name}
                  {index < tags.length - 1 && " "}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1.5 text-xs italic leading-4 text-gray-300">
              Chưa có tag
            </p>
          )}
        </div>

        <GroupDocumentContextMenu
          onAction={handleAction}
          permission={permission}
        />
      </div>
    </Card>
  );
}