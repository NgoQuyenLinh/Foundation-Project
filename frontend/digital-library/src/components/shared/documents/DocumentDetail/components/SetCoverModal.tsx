// src/components/shared/documents/DocumentDetail/components/SetCoverModal.tsx

import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, Loader2, X, Image as ImageIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

export interface SetCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasPages: boolean;
  totalPages?: number;
  initialPage?: number;
  onSetPageCover: (page: number) => void | Promise<void>;
  onUploadCover: (base64Thumbnail: string) => void | Promise<void>;
  isUpdating?: boolean;
}

export function SetCoverModal({
  isOpen,
  onClose,
  hasPages,
  totalPages,
  initialPage = 1,
  onSetPageCover,
  onUploadCover,
  isUpdating = false,
}: SetCoverModalProps) {
  const [activeTab, setActiveTab] = useState<"page" | "upload">(
    hasPages ? "page" : "upload",
  );
  const [selectedPage, setSelectedPage] = useState<number>(initialPage);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(hasPages ? "page" : "upload");
      setSelectedPage(initialPage);
      setPreviewImage(null);
    }
  }, [isOpen, hasPages, initialPage]);

  if (!isOpen) return null;

  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseInt(e.target.value, 10);
    if (!Number.isNaN(val)) {
      const maxPage = totalPages ?? Number.MAX_SAFE_INTEGER;
      setSelectedPage(Math.max(1, Math.min(val, maxPage)));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPreviewImage(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPageCover = async () => {
    try {
      await onSetPageCover(selectedPage);
      onClose();
    } catch (err) {
      console.error("Lỗi cập nhật ảnh bìa trang:", err);
    }
  };

  const handleSubmitUploadCover = async () => {
    if (!previewImage) return;
    try {
      await onUploadCover(previewImage);
      onClose();
    } catch (err) {
      console.error("Lỗi tải ảnh bìa lên:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-5 border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                Cập nhật ảnh bìa tài liệu
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {hasPages
                  ? "Chọn trang tài liệu hoặc tải ảnh từ máy tính"
                  : "Tải ảnh từ máy tính để làm ảnh bìa đại diện"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUpdating}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab navigation (nếu file có trang) */}
        {hasPages && (
          <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("page")}
              className={cn(
                "flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all",
                activeTab === "page"
                  ? "bg-white text-primary-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900",
              )}
            >
              <FileText className="h-4 w-4" />
              <span>Chọn theo trang</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={cn(
                "flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all",
                activeTab === "upload"
                  ? "bg-white text-primary-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900",
              )}
            >
              <Upload className="h-4 w-4" />
              <span>Tải ảnh từ máy</span>
            </button>
          </div>
        )}

        {/* Tab 1: Chọn theo trang */}
        {hasPages && activeTab === "page" && (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">
                Nhập số trang muốn đặt làm ảnh bìa:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={selectedPage}
                  onChange={handlePageChange}
                  className="w-24 px-3 py-2 text-center text-sm font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {totalPages && (
                  <span className="text-xs text-gray-500">
                    / Tổng cộng <strong>{totalPages}</strong> trang
                  </span>
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 leading-relaxed">
              Trang số <strong>{selectedPage}</strong> sẽ được trích xuất và hiển thị làm ảnh bìa chính của tài liệu này trong toàn hệ thống.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isUpdating}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSubmitPageCover}
                disabled={isUpdating}
                className="gap-2"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    <span>Đặt trang {selectedPage} làm ảnh bìa</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Tải ảnh từ máy */}
        {(!hasPages || activeTab === "upload") && (
          <div className="flex flex-col gap-4 py-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUpdating}
            />

            {previewImage ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-full h-44 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={previewImage}
                    alt="Xem trước ảnh bìa"
                    className="max-h-full max-w-full object-contain rounded-lg shadow-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUpdating}
                  className="text-xs text-primary-600 hover:underline font-medium"
                >
                  Chọn ảnh khác
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-primary-500 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-gray-50/50 hover:bg-primary-50/20"
              >
                <div className="p-3 bg-white rounded-full shadow-xs text-primary-600 border border-gray-200">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold text-gray-700 mt-1">
                  Nhấn để chọn ảnh từ máy tính
                </p>
                <p className="text-[11px] text-gray-400">
                  Hỗ trợ định dạng PNG, JPG, JPEG, WEBP (Tối đa 5MB)
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isUpdating}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSubmitUploadCover}
                disabled={isUpdating || !previewImage}
                className="gap-2"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Lưu ảnh bìa</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
