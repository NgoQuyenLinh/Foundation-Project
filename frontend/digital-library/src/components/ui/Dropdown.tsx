import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";

export interface DropdownItem {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}

const Dropdown = ({ trigger, items, align = "right" }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Xử lý click ra ngoài để đóng menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Phải check cả dropdownRef (nút bấm) VÀ menuRef (menu portal) 
      // vì menu giờ đã nằm ngoài DOM của dropdownRef
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Tính toán vị trí hiển thị khi mở menu
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;

    const rect = dropdownRef.current.getBoundingClientRect();
    const menuWidth = 208; // Dựa trên min-w-[208px]
    
    // Mặc định canh trái
    let calculatedLeft = rect.left;
    
    // Nếu cài đặt canh phải hoặc bị tràn màn hình bên phải thì lật lại
    if (align === "right" || rect.left + menuWidth > window.innerWidth) {
      calculatedLeft = rect.right - menuWidth;
    }

    setCoords({
      top: rect.bottom + 8, // Cách nút bấm 8px (tương đương mt-2)
      left: calculatedLeft,
    });
  }, [isOpen, align]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          style={{
            top: coords.top,
            left: coords.left,
          }}
          className={cn(
            "fixed z-[9999] min-w-[208px] rounded-lg border border-gray-100 bg-white py-1 shadow-lg"
          )}
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-2 text-sm text-left transition-colors hover:bg-gray-50",
                item.danger
                  ? "text-red-500 border-t border-gray-100 mt-1 pt-2"
                  : "text-gray-700"
              )}
            >
              {item.icon && (
                <span className={cn("w-4 h-4", item.danger ? "text-red-500" : "text-gray-500")}>
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export { Dropdown };