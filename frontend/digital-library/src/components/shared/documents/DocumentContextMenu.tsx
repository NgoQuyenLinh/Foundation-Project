// frontend/digital-library/src/components/shared/DocumentContextMenu.tsx
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Download, 
  Share2, 
  Heart, 
  Edit2, 
  FolderInput, 
  Trash2,
  MoreVertical,
  ExternalLink,
  Upload,
  FileText // Thêm icon cho markdown nếu muốn
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";

export type DocumentAction = 
  | "view" 
  | "download" 
  | "download-markdown" // Thêm action mới
  | "share" 
  | "favorite" 
  | "rename" 
  | "move" 
  | "delete"
  | "contribute"
  | "save-to-personal"
  | string;

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
  markdownPath?: string | null; // <-- Bổ sung prop này
}

export function DocumentContextMenu({
  onAction,
  allowedActions,
  extraItems = [],
  markdownPath,
}: DocumentContextMenuProps) {
  const { isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const DEFAULT_ITEMS: DocumentMenuItem[] = [
    { action: "view", icon: <ExternalLink className="h-4 w-4" />, label: "Mở trong thẻ mới" },
    { action: "download", icon: <Download className="h-4 w-4" />, label: "Tải xuống bản gốc" },
    // Nếu tài liệu có markdown_path, tự động hiển thị thêm tùy chọn này
    ...(markdownPath 
      ? [{ action: "download-markdown", icon: <FileText className="h-4 w-4 text-primary-600" />, label: "Tải xuống Markdown (.md)" }] 
      : []),
    { action: "share", icon: <Share2 className="h-4 w-4" />, label: "Chia sẻ" },
    { action: "favorite", icon: <Heart className="h-4 w-4" />, label: "Thêm vào Yêu thích" },
    { action: "rename", icon: <Edit2 className="h-4 w-4" />, label: "Đổi tên" },
    { action: "move", icon: <FolderInput className="h-4 w-4" />, label: "Di chuyển" },
    { action: "delete", icon: <Trash2 className="h-4 w-4" />, label: "Xóa", danger: true },
    ...(isAuthenticated
      ? [
          {
            action: "contribute",
            icon: <Upload className="h-4 w-4 text-primary-600" />,
            label: "Đóng góp vào kho học liệu",
          },
        ]
      : []),
  ];

  let displayItems = DEFAULT_ITEMS;
  if (allowedActions) {
    displayItems = displayItems.filter(item => allowedActions.includes(item.action as DocumentAction));
  }
  
  displayItems = [...displayItems, ...extraItems];

  if (displayItems.length === 0) return null;

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-full focus:outline-none"
      >
        <MoreVertical className="h-5 w-5" />
      </Button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              right: `${coords.right}px`,
            }}
            className="z-[9999] min-w-[210px] rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {displayItems.map((item, index) => {
              const isDanger = item.danger;
              const isContribute = item.action === "contribute";
              const isMarkdownDownload = item.action === "download-markdown";
              return (
                <div key={item.action}>
                  {((isDanger && index > 0) || (isContribute && index > 0) || (isMarkdownDownload && index > 0)) && (
                    <div className="my-1 h-px bg-gray-100" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      if (item.onClick) {
                        item.onClick();
                      } else {
                        onAction(item.action);
                      }
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      isDanger
                        ? "text-red-600 hover:bg-red-50"
                        : isContribute || isMarkdownDownload
                        ? "text-primary-700 hover:bg-primary-50"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}