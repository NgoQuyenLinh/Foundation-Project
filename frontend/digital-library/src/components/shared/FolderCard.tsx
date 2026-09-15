// frontend/digital-library/src/components/shared/FolderCard.tsx

import { Folder } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  FolderContextMenu,
  type FolderAction,
  type FolderMenuItem,
} from "./FolderContextMenu";

export interface FolderTag {
  id: number;
  name: string;
  color?: string | null;
}

export interface FolderCardProps {
  id: number;
  name: string;
  count: number;
  color?: string | null;
  tags?: FolderTag[];
  isSelected?: boolean; // <-- Bổ sung trạng thái active/selected
  onClick: () => void;
  onAction?: (action: FolderAction, folderId: number) => void;
  allowedActions?: string[];
  extraItems?: FolderMenuItem[];
}

export function FolderCard({
  id,
  name,
  count,
  color,
  tags = [],
  isSelected = false,
  onClick,
  onAction,
  allowedActions,
  extraItems,
}: FolderCardProps) {
  const folderColor = color || "#475569";

  return (
    <Card
      className={`
        group
        relative
        flex
        h-[96px]
        shrink-0
        cursor-pointer
        items-start
        gap-3
        rounded-xl
        border
        p-3.5
        transition-all
        duration-300
        ease-in-out
        ${
          isSelected
            ? "border-primary-500 bg-primary-50/20 shadow-md min-w-[320px] max-w-[480px]"
            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm flex-1 min-w-[210px] max-w-[300px]"
        }
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Folder Icon */}
      <div
        className="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-lg
          mt-0.5
        "
        style={{
          backgroundColor: `${folderColor}12`,
          color: folderColor,
        }}
      >
        <Folder className="h-5 w-5" fill="currentColor" fillOpacity={0.18} />
      </div>

      {/* Thông tin Folder */}
      <div className="min-w-0 flex-1 pr-5">
        {/* Tên Folder */}
        <h3
          className="truncate text-sm font-semibold text-gray-900 leading-tight"
          title={name}
        >
          {name}
        </h3>

        {/* Số lượng tài liệu */}
        <p className="mt-0.5 text-xs text-gray-400 font-medium">
          {count} tài liệu
        </p>

        {/* Khối hiển thị tối đa 2 hàng Tag */}
        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1 max-h-[38px] overflow-hidden">
            {tags.map((tag) => {
              const tagColor = tag.color || "#64748B";
              return (
                <span
                  key={tag.id}
                  className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none"
                  style={{
                    backgroundColor: `${tagColor}12`,
                    color: tagColor,
                  }}
                >
                  #{tag.name}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Context Menu (...) */}
      {onAction && (
        <div
          className="
            absolute
            right-2
            top-2
            z-10
            shrink-0
            opacity-0
            transition-opacity
            duration-150
            group-hover:opacity-100
            focus-within:opacity-100
          "
          onClick={(e) => e.stopPropagation()}
        >
          <FolderContextMenu
            onAction={(action) => onAction(action, id)}
            allowedActions={allowedActions}
            extraItems={extraItems}
          />
        </div>
      )}
    </Card>
  );
}