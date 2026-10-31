// src/components/shared/documents/DocumentDetail/viewers/DocxViewer.tsx

import { useState, useEffect, useRef } from "react";
import { renderAsync } from "docx-preview";
import html2canvas from "html2canvas";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * DocxViewer - Hiển thị bản xem trước tài liệu Word (.docx / .doc)
 *
 * Tính năng chính:
 * 1. Tải và biên dịch nội dung DOCX sang DOM bằng thư viện docx-preview
 * 2. Tự động chụp trang 1 làm ảnh bìa (thumbnail) nếu tài liệu chưa có ảnh bìa
 * 3. Cho phép người dùng chọn bất kỳ trang nào và chụp ảnh làm bìa đại diện
 */
export function DocxViewer({
  fileUrl,
  hasThumbnail,
  onUpdateThumbnail,
}: {
  fileUrl?: string;
  hasThumbnail?: boolean;
  onUpdateThumbnail?: (base64: string) => void;
  [key: string]: any;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dùng ref để giữ giá trị mới nhất trong callback timeout/async
  const hasThumbnailRef = useRef(hasThumbnail);
  const onUpdateThumbnailRef = useRef(onUpdateThumbnail);

  useEffect(() => {
    hasThumbnailRef.current = hasThumbnail;
    onUpdateThumbnailRef.current = onUpdateThumbnail;
  }, [hasThumbnail, onUpdateThumbnail]);

  /**
   * Chụp ảnh một trang văn bản Word trong DOM và chuyển thành chuỗi Base64
   * @param pageNumber Số thứ tự trang cần chụp (bắt đầu từ 1)
   */
  const capturePage = async (pageNumber: number): Promise<string | null> => {
    if (!containerRef.current) return null;

    const pages = containerRef.current.querySelectorAll("section");
    const targetElement =
      pages.length > 0
        ? (pages[Math.max(0, Math.min(pageNumber - 1, pages.length - 1))] as HTMLElement)
        : (containerRef.current.firstElementChild as HTMLElement) || containerRef.current;

    if (!targetElement) return null;

    try {
      const canvas = await html2canvas(targetElement, {
        scale: 0.6,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      return canvas.toDataURL("image/webp", 0.75);
    } catch (err) {
      console.error("Lỗi khi chụp trang tài liệu:", err);
      return null;
    }
  };

  /**
   * Effect tải và render tài liệu DOCX từ fileUrl
   */
  useEffect(() => {
    if (!fileUrl) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    let captureTimeout: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    setError(null);

    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải tập tin Word");
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (containerRef.current && isMounted) {
          containerRef.current.innerHTML = "";
          return renderAsync(buffer, containerRef.current, undefined, {
            className: "docx-preview-wrapper",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true,
          });
        }
      })
      .then(() => {
        if (!isMounted) return;
        setLoading(false);

        // Chờ DOM ổn định để tự động chụp trang đầu nếu thiếu ảnh bìa
        captureTimeout = setTimeout(async () => {
          if (!isMounted || !containerRef.current) return;

          if (!hasThumbnailRef.current && onUpdateThumbnailRef.current) {
            const firstPageThumbnail = await capturePage(1);
            if (isMounted && firstPageThumbnail) {
              onUpdateThumbnailRef.current?.(firstPageThumbnail);
            }
          }
        }, 600);
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Lỗi xem trước DOCX:", err);
          setError(
            "Không thể xem trước tài liệu Word này. Định dạng file có thể không hợp lệ hoặc bị khóa.",
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (captureTimeout) clearTimeout(captureTimeout);
    };
  }, [fileUrl]);

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Thanh công cụ: Tổng số trang & Chọn trang làm ảnh bìa */}
      {/* {!loading && !error && (
        <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <ImageIcon className="h-4 w-4 text-primary-600" />
            <span>
              Tổng số trang:{" "}
              <strong className="text-gray-900">{totalPages}</strong>
            </span>
          </div>

          {hasCoverHandler && (
            <DocumentCoverSelector
              variant="page"
              totalPages={totalPages}
              initialPage={selectedPage}
              onSetPageCover={handleSetCover}
              isUpdating={isCoverUpdating}
            />
          )}
        </div>
      )} */}

      {/* Vùng hiển thị nội dung tài liệu Word */}
      <div className="w-full flex-1 h-full overflow-auto bg-gray-200/70 p-4 rounded-xl flex flex-col items-center custom-scrollbar">
        {loading && (
          <div className="flex flex-col items-center justify-center my-auto py-20 text-gray-500 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <span className="text-sm font-medium">
              Đang tải và định dạng văn bản Word...
            </span>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center my-auto py-20 text-red-500 gap-2">
            <p className="text-sm text-center max-w-md">{error}</p>
          </div>
        )}
        <div
          ref={containerRef}
          className={cn(
            "w-full max-w-4xl bg-white shadow-md rounded-lg p-2 transition-opacity duration-300",
            loading || error ? "hidden" : "block",
          )}
        />
      </div>
    </div>
  );
}
