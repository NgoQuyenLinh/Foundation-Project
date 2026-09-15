// frontend/digital-library/src/components/shared/DocumentContextMenu.tsx
import { Dropdown } from "@/components/ui/Dropdown";
import { 
  Download, 
  Share2, 
  Heart, 
  Edit2, 
  FolderInput, 
  Trash2,
  MoreVertical,
  ExternalLink // <-- Import thêm Icon này
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export type DocumentAction = 
  | "view" 
  | "download" 
  | "share" 
  | "favorite" 
  | "rename" 
  | "move" 
  | "delete"
  | "save-to-personal";

export interface DocumentMenuItem {
  action: string;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}

export interface DocumentContextMenuProps {
  onAction: (action: DocumentAction | string) => void;
  allowedActions?: DocumentAction[];
  extraItems?: DocumentMenuItem[];
}

export function DocumentContextMenu({ onAction, allowedActions, extraItems = [] }: DocumentContextMenuProps) {
  const DEFAULT_ITEMS: DocumentMenuItem[] = [
    // Sửa icon và nhãn thành Mở trong thẻ mới
    { action: "view", icon: <ExternalLink className="h-4 w-4" />, label: "Mở trong thẻ mới" },
    { action: "download", icon: <Download className="h-4 w-4" />, label: "Tải xuống" },
    { action: "share", icon: <Share2 className="h-4 w-4" />, label: "Chia sẻ" },
    { action: "favorite", icon: <Heart className="h-4 w-4" />, label: "Thêm vào Yêu thích" },
    { action: "rename", icon: <Edit2 className="h-4 w-4" />, label: "Đổi tên" },
    { action: "move", icon: <FolderInput className="h-4 w-4" />, label: "Di chuyển" },
    { action: "delete", icon: <Trash2 className="h-4 w-4" />, label: "Xóa", danger: true },
  ];

  let displayItems = DEFAULT_ITEMS;
  if (allowedActions) {
    displayItems = displayItems.filter(item => allowedActions.includes(item.action as DocumentAction));
  }
  
  displayItems = [...displayItems, ...extraItems];

  const dropdownItems = displayItems.map(item => ({
    ...item,
    onClick: item.onClick || (() => onAction(item.action)),
  }));

  return (
    <div className="relative z-50">
      <Dropdown
        trigger={
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-full">
            <MoreVertical className="h-5 w-5" />
          </Button>
        }
        items={dropdownItems}
        align="right"
      />
    </div>
  );
}