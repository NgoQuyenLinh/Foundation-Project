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
}

export interface FolderCardProps {
  id: number;
  name: string;
  count: number;
  color?: string | null;
  tags?: FolderTag[];
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
  onClick,
  onAction,
  allowedActions,
  extraItems,
}: FolderCardProps) {
  // Màu mặc định nếu folder chưa có màu
  const folderColor = color || "#2F7D46";

  return (
    <Card
      className="
        group
        relative
        flex
        min-h-[108px]
        cursor-pointer
        items-center
        gap-3
        rounded-xl
        border
        border-gray-200
        bg-white
        p-4
        transition-all
        duration-150
        hover:border-primary-300
        hover:bg-primary-50
        hover:shadow-sm
      "
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
      {/* =========================
          Folder icon
      ========================== */}

      <div
        className="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-lg
        "
        style={{
          backgroundColor: `${folderColor}12`,
          color: folderColor,
        }}
      >
        <Folder
          className="h-6 w-6"
          fill="currentColor"
          fillOpacity={0.18}
        />
      </div>

      {/* =========================
          Folder information
      ========================== */}

      <div className="min-w-0 flex-1 pr-1">
        {/* Folder name */}
        <h3
          className="
            truncate
            text-sm
            font-semibold
            leading-5
            text-gray-900
          "
          title={name}
        >
          {name}
        </h3>

        {/* Document count */}
        <p className="mt-0.5 text-xs leading-4 text-gray-400">
          {count} {count === 1 ? "tài liệu" : "tài liệu"}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div
            className="
              mt-0.5
              line-clamp-3
              overflow-hidden
              text-xs
              italic
              leading-4
              text-gray-400
            "
            title={tags.map((tag) => `#${tag.name}`).join(" ")}
          >
            {tags.map((tag, index) => (
              <span key={tag.id}>
                #{tag.name}
                {index < tags.length - 1 && " "}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* =========================
          Context menu
      ========================== */}

      {onAction && (
        <div
          className="
            absolute
            right-3
            top-3
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