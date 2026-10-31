// src/components/shared/documents/DocumentDetail/components/DocumentCoverSelector.tsx

import React, { useState, useEffect } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

// ==========================================
// 1. PROPS INTERFACES
// ==========================================

export interface PageCoverSelectorProps {
  totalPages?: number;
  initialPage?: number;
  onSetPageCover: (page: number) => void | Promise<void>;
  isUpdating?: boolean;
  label?: string;
  className?: string;
}

export interface UploadCoverSelectorProps {
  onUploadCover: (base64Thumbnail: string) => void | Promise<void>;
  isUpdating?: boolean;
  label?: string;
  accept?: string;
  className?: string;
}

export interface DocumentCoverSelectorProps {
  variant?: "page" | "upload" | "combined";
  // Props dành cho chế độ Page
  totalPages?: number;
  initialPage?: number;
  onSetPageCover?: (page: number) => void | Promise<void>;
  // Props dành cho chế độ Upload
  onUploadCover?: (base64Thumbnail: string) => void | Promise<void>;
  // Props dùng chung
  isUpdating?: boolean;
  className?: string;
}

// ==========================================
// 2. SUB-COMPONENT: Chọn trang làm ảnh bìa
// ==========================================
export function PageCoverSelector({
  totalPages,
  initialPage = 1,
  onSetPageCover,
  isUpdating = false,
  label = "Chọn trang bìa:",
  className,
}: PageCoverSelectorProps) {
  const [selectedPage, setSelectedPage] = useState<number>(initialPage);

  useEffect(() => {
    setSelectedPage(initialPage);
  }, [initialPage]);

  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = Number.parseInt(e.target.value, 10);
    if (!Number.isNaN(page)) {
      const maxPage = totalPages ?? Number.MAX_SAFE_INTEGER;
      setSelectedPage(Math.max(1, Math.min(page, maxPage)));
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <label className="text-xs text-gray-500 font-medium">{label}</label>
      )}
      <input
        type="number"
        min={1}
        max={totalPages}
        value={selectedPage}
        onChange={handlePageChange}
        className="w-16 px-2 py-1 text-center text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 font-semibold"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onSetPageCover(selectedPage)}
        disabled={isUpdating}
        className="h-8 text-xs flex items-center gap-1.5 border-primary-500 text-primary-600 hover:bg-primary-50"
      >
        {isUpdating ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Đang lưu...</span>
          </>
        ) : (
          <>
            <Camera className="h-3.5 w-3.5" />
            <span>Đặt trang {selectedPage} làm ảnh bìa</span>
          </>
        )}
      </Button>
    </div>
  );
}

// ==========================================
// 3. SUB-COMPONENT: Tải ảnh bìa từ máy tính
// ==========================================
export function UploadCoverSelector({
  onUploadCover,
  isUpdating = false,
  label = "Ảnh bìa:",
  accept = "image/*",
  className,
}: UploadCoverSelectorProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          onUploadCover(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <label className="text-xs text-gray-500 font-medium">{label}</label>
      )}
      <label className="cursor-pointer">
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
          disabled={isUpdating}
        />
        <span className="inline-flex items-center gap-1.5 h-8 px-3 text-xs border border-primary-500 text-primary-600 rounded-md hover:bg-primary-50 transition-colors">
          {isUpdating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
          {isUpdating ? "Đang lưu..." : "Tải lên ảnh bìa"}
        </span>
      </label>
    </div>
  );
}

// ==========================================
// 4. MAIN COMPONENT (Unified Interface)
// ==========================================
export function DocumentCoverSelector({
  variant = "page",
  totalPages,
  initialPage = 1,
  onSetPageCover,
  onUploadCover,
  isUpdating = false,
  className,
}: DocumentCoverSelectorProps) {
  if (variant === "page" && onSetPageCover) {
    return (
      <PageCoverSelector
        totalPages={totalPages}
        initialPage={initialPage}
        onSetPageCover={onSetPageCover}
        isUpdating={isUpdating}
        className={className}
      />
    );
  }

  if (variant === "upload" && onUploadCover) {
    return (
      <UploadCoverSelector
        onUploadCover={onUploadCover}
        isUpdating={isUpdating}
        className={className}
      />
    );
  }

  if (variant === "combined") {
    return (
      <div className={cn("flex flex-wrap items-center gap-4", className)}>
        {onSetPageCover && (
          <PageCoverSelector
            totalPages={totalPages}
            initialPage={initialPage}
            onSetPageCover={onSetPageCover}
            isUpdating={isUpdating}
          />
        )}
        {onSetPageCover && onUploadCover && (
          <div className="h-4 w-px bg-gray-300" />
        )}
        {onUploadCover && (
          <UploadCoverSelector
            onUploadCover={onUploadCover}
            isUpdating={isUpdating}
          />
        )}
      </div>
    );
  }

  return null;
}
