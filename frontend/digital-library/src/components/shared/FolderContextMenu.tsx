// src/components/shared/FolderContextMenu.tsx

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Edit2, Share2, Trash2 } from "lucide-react";

export type FolderAction = "edit" | "share" | "delete" | string;

export interface FolderMenuItem {
  action: string;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}

interface FolderContextMenuProps {
  onAction: (action: FolderAction) => void;
  allowedActions?: string[];
  extraItems?: FolderMenuItem[];
}

export function FolderContextMenu({
  onAction,
  allowedActions,
  extraItems = [],
}: FolderContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Tính toán tọa độ vị trí thực tế của nút 3 chấm trên màn hình
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

  // Đóng menu khi click ra ngoài, cuộn trang hoặc đổi kích thước màn hình
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

  const handleAction = (e: React.MouseEvent, action: FolderAction) => {
    e.stopPropagation();
    setIsOpen(false);
    onAction(action);
  };

  const DEFAULT_ITEMS: FolderMenuItem[] = [
    { action: "edit", icon: <Edit2 className="h-4 w-4" />, label: "Sửa" },
    { action: "share", icon: <Share2 className="h-4 w-4" />, label: "Chia sẻ" },
    { action: "delete", icon: <Trash2 className="h-4 w-4" />, label: "Xoá", danger: true },
  ];

  let displayItems = DEFAULT_ITEMS;
  if (allowedActions) {
    displayItems = displayItems.filter((item) => allowedActions.includes(item.action));
  }

  displayItems = [...displayItems, ...extraItems];

  if (displayItems.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {/* Render Menu trực tiếp ra document.body */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              right: `${coords.right}px`,
            }}
            className="z-[9999] min-w-[160px] rounded-lg border border-gray-100 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {displayItems.map((item, index) => {
              const isDanger = item.danger;
              return (
                <div key={item.action}>
                  {isDanger && index > 0 && <div className="my-1 h-px bg-gray-100" />}
                  <button
                    type="button"
                    onClick={(e) => handleAction(e, item.action)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      isDanger
                        ? "text-red-600 hover:bg-red-50"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {item.icon}
                    {item.label}
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