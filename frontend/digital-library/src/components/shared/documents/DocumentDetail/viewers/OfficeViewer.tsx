// src/components/shared/documents/DocumentDetail/viewers/OfficeViewer.tsx

import { useState } from "react";
import { ExternalLink, Download, RefreshCw, AlertCircle, Eye } from "lucide-react";
import { DocumentCoverSelector } from "../components/DocumentCoverSelector";
import type { OfficeViewerProps } from "../DocumentDetail.types";

/**
 * OfficeViewer - Hiển thị bản xem trước cho các tài liệu Office:
 * - PPTX / PPT (PowerPoint)
 * - XLSX / XLS (Excel)
 * - DOC (Legacy Word 97-2003)
 *
 * Tích hợp Google Docs Viewer và Microsoft Office Online với cơ chế chuyển đổi linh hoạt,
 * tránh triệt để lỗi 404 khi crawler bên ngoài không thể tải trực tiếp file từ R2.
 */
export function OfficeViewer({
  doc,
  fileUrl,
  onUpdateThumbnail,
  isUpdatingThumbnail = false,
}: OfficeViewerProps) {
  const [provider, setProvider] = useState<"google" | "microsoft">("google");
  const [iframeKey, setIframeKey] = useState(0);

  // Encode fileUrl để truyền an toàn vào query params của Viewer
  const encodedUrl = encodeURIComponent(fileUrl);
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
  const msOfficeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;

  const currentViewerUrl = provider === "google" ? googleViewerUrl : msOfficeUrl;

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="w-full flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
      {/* Thanh công cụ điều khiển bộ xem trước */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-200 bg-gray-50/80">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary-600 shrink-0" />
          <span className="text-xs text-gray-500 font-medium">Trình xem:</span>
          
          <div className="flex items-center bg-gray-200/70 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setProvider("google")}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                provider === "google"
                  ? "bg-white text-primary-700 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Google Docs (Ổn định)
            </button>
            <button
              type="button"
              onClick={() => setProvider("microsoft")}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                provider === "microsoft"
                  ? "bg-white text-primary-700 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Office Online
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded-md transition-colors"
            title="Tải lại khung xem trước"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {onUpdateThumbnail && (
            <DocumentCoverSelector
              variant="upload"
              onUploadCover={onUpdateThumbnail}
              isUpdating={isUpdatingThumbnail}
            />
          )}

          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 rounded-lg shadow-2xs transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mở thẻ mới</span>
          </a>

          <a
            href={fileUrl}
            download={doc.title}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Tải về</span>
          </a>
        </div>
      </div>

      {/* Vùng hiển thị Iframe */}
      <div className="w-full h-[650px] sm:h-[720px] lg:h-[780px] bg-gray-50 relative flex flex-col">
        <iframe
          key={`${provider}-${iframeKey}`}
          src={currentViewerUrl}
          title={`Xem trước ${doc.title}`}
          className="w-full h-full border-0 flex-1"
          allowFullScreen
        />

        {/* Chú thích hỗ trợ người dùng khi mạng chậm hoặc bị chặn */}
        <div className="px-4 py-2 bg-gray-50/90 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            Nếu bản xem trước không hiển thị, vui lòng chuyển đổi giữa Google Docs / Office Online hoặc bấm <strong>"Mở thẻ mới"</strong>.
          </span>
          <span className="text-gray-400 font-mono hidden md:inline">
            {doc.file_type || "office-document"}
          </span>
        </div>
      </div>
    </div>
  );
}
