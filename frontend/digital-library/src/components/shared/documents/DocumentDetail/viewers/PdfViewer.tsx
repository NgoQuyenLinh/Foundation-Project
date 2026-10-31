// frontend/digital-library/src/components/shared/documents/DocumentDetail/viewers/PdfViewer.tsx
import type { PdfViewerProps } from "../DocumentDetail.types";

/**
 * PdfViewer - Hiển thị bản xem trước tài liệu PDF
 */
export function PdfViewer({
  doc,
  fileUrl,
}: PdfViewerProps) {

  // --- BẮT ĐẦU XỬ LÝ LỖI URL ---
  // 1. Giải mã URL để sửa lỗi https%3A// thành https://
  let cleanUrl = decodeURIComponent(fileUrl || "");
  
  // 2. Lọc bỏ Base URL của Backend nếu Component cha lỡ nối nhầm vào
  // (Tìm chữ 'http' xuất hiện cuối cùng trong chuỗi và cắt lấy từ đó trở về sau)
  const realHttpIndex = cleanUrl.lastIndexOf("http");
  if (realHttpIndex > 0) {
    cleanUrl = cleanUrl.substring(realHttpIndex);
  }
  // --- KẾT THÚC XỬ LÝ LỖI URL ---

  return (
    <div className="h-full w-full flex flex-col items-center gap-3">
      {/* Thanh công cụ: Chọn trang làm ảnh bìa PDF */}
      {/* {handleCover && (
        <div className="w-full max-w-4xl flex flex-wrap items-center justify-end gap-3 bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-xs">
          <DocumentCoverSelector
            variant="page"
            onSetPageCover={handleCover}
            isUpdating={isUpdating}
          />
        </div>
      )} */}

      {/* Vùng hiển thị PDF qua iframe sử dụng cleanUrl */}
      <iframe
        src={`${cleanUrl}#toolbar=1&navpanes=0`}
        className="w-full flex-1 h-full rounded-lg shadow-sm bg-white border border-gray-200"
        title={doc?.title || "Tài liệu PDF"}
      />
    </div>
  );
}