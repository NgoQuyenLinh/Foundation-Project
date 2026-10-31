// src/components/shared/documents/DocumentDetail/tabs/TabPreview.tsx

import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";
import { getThumbnailUrl } from "@/utils/getThumbnailUrl";
import { cn } from "@/utils/cn";
import { CODE_EXTENSIONS, type TabPreviewProps } from "../DocumentDetail.types";
import { DocxViewer } from "../viewers/DocxViewer";
import { PdfViewer } from "../viewers/PdfViewer";
import { CodeViewer } from "../viewers/CodeViewer";
import { MarkdownViewer } from "../viewers/MarkdownViewer";
import { DocumentCoverSelector } from "../components/DocumentCoverSelector";

/**
 * TabPreview - Tab "Bản xem trước" tổng hợp của tài liệu
 *
 * Tính năng chính:
 * 1. Nhận diện định dạng file (ảnh, pdf, docx, code, pptx, xlsx, hoặc các file khác)
 * 2. Điều phối render component viewer phù hợp
 * 3. Hỗ trợ chuyển đổi linh hoạt giữa "Bản gốc" và "Markdown" (nếu có markdown_path)
 * 4. Hỗ trợ tải lên ảnh bìa đại diện cho PPTX, XLSX và các định dạng fallback
 */
export function TabPreview({
  doc,
  fileUrl,
  onUpdateThumbnail,
  isUpdatingThumbnail,
  onUpdateThumbnailPage,
  isUpdatingThumbnailPage,
  viewMode = "original",
}: TabPreviewProps) {
  const fileType = doc.file_type?.toLowerCase() || "";
  const filePath = doc.file_path?.toLowerCase() || "";

  // Nhận diện loại tệp
  const isImage = fileType.startsWith("image/");
  const isPdf = fileType === "application/pdf" || filePath.endsWith(".pdf");
  const isDocx =
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileType === "application/msword" ||
    filePath.endsWith(".docx") ||
    filePath.endsWith(".doc");

  const isPptx =
    fileType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    fileType === "application/vnd.ms-powerpoint" ||
    filePath.endsWith(".pptx") ||
    filePath.endsWith(".ppt");

  const isXlsx =
    fileType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    fileType === "application/vnd.ms-excel" ||
    filePath.endsWith(".xlsx") ||
    filePath.endsWith(".xls");

  const targetCheck = `${filePath} ${doc.title || ""}`.toLowerCase();
  const isCode =
    fileType.startsWith("text/") ||
    CODE_EXTENSIONS.some((ext) => targetCheck.includes(ext)) ||
    targetCheck.includes("dockerfile");

  const hasMarkdown = !isImage && !!doc.markdown_path;

  const thumbnailUrl = getThumbnailUrl(doc.thumbnail_path);

  return (
    <div className="flex flex-col gap-3 min-w-0 w-full h-full flex-1">
      {/* Vùng xem trước chính */}
      <div className="w-full min-w-0 flex flex-col h-full flex-1">
        {/* Chế độ Markdown: Giữ trong DOM, ẩn/hiện bằng CSS để tránh re-fetch */}
        {hasMarkdown && (
          <div
            className={cn(
              "w-full min-w-0 h-full flex-1 flex-col",
              viewMode === "markdown" ? "block" : "hidden",
            )}
          >
            <MarkdownViewer markdownPath={doc.markdown_path} />
          </div>
        )}

        {/* Chế độ Bản gốc */}
        <div
          className={cn(
            "w-full min-w-0 h-full flex-1 flex-col",
            !hasMarkdown || viewMode === "original" ? "block" : "hidden",
          )}
        >
          {isImage ? (
            <div className="w-full flex items-center justify-center p-4 bg-gray-50/60 rounded-xl border border-gray-200">
              <img
                src={fileUrl}
                alt={doc.title}
                className="max-w-full max-h-[700px] mx-auto rounded-lg object-contain shadow-sm bg-white"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : isPdf ? (
            <PdfViewer
              doc={doc}
              fileUrl={fileUrl}
              onUpdateCover={onUpdateThumbnailPage}
              isUpdatingCover={isUpdatingThumbnailPage}
              onUpdateThumbnailPage={onUpdateThumbnailPage}
              isUpdatingThumbnailPage={isUpdatingThumbnailPage}
            />
          ) : isDocx ? (
            <DocxViewer
              fileUrl={fileUrl}
              hasThumbnail={!!doc.thumbnail_path}
              onUpdateThumbnail={onUpdateThumbnail}
              isUpdatingThumbnail={isUpdatingThumbnail}
              onUpdateThumbnailPage={onUpdateThumbnailPage}
              isUpdatingThumbnailPage={isUpdatingThumbnailPage}
              onUpdateCover={onUpdateThumbnailPage}
              isUpdatingCover={isUpdatingThumbnailPage}
            />
          ) : isCode ? (
            <CodeViewer
              documentId={doc.id}
              filePath={doc.file_path}
              title={doc.title}
            />
          ) : isPptx || isXlsx ? (
            <div
              id="office-viewer-container"
              className="w-full h-[650px] sm:h-[720px] lg:h-[780px] min-h-[500px] bg-white rounded-xl overflow-hidden border border-gray-200 flex flex-col shadow-2xs"
            >
              <style>{`
                #office-viewer-container #react-doc-viewer,
                #office-viewer-container #proxy-renderer,
                #office-viewer-container #msdoc-renderer {
                  width: 100% !important;
                  height: 100% !important;
                  display: flex !important;
                  flex-direction: column !important;
                  flex: 1 1 0% !important;
                  background: transparent !important;
                }
                #office-viewer-container #msdoc-iframe {
                  width: 100% !important;
                  height: 100% !important;
                  flex: 1 1 0% !important;
                  border: 0 !important;
                }
              `}</style>
              {onUpdateThumbnail && (
                <div className="w-full shrink-0 flex items-center justify-end px-4 py-2 border-b border-gray-200 bg-gray-50/60">
                  <DocumentCoverSelector
                    variant="upload"
                    onUploadCover={onUpdateThumbnail}
                    isUpdating={isUpdatingThumbnail}
                  />
                </div>
              )}
              <div className="w-full flex-1 min-h-0">
                <DocViewer
                  documents={[{ uri: fileUrl, fileType: doc.file_type || undefined, fileName: doc.title }]}
                  pluginRenderers={DocViewerRenderers}
                  style={{ width: "100%", height: "100%" }}
                  config={{ header: { disableHeader: true } }}
                />
              </div>
            </div>
          ) : (
            /* Fallback đối với các định dạng khác */
            <div className="w-full flex flex-col items-center justify-center space-y-4 py-16 bg-gray-50/60 rounded-xl border border-gray-200">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={doc.title}
                  className="h-60 rounded object-contain shadow"
                />
              ) : (
                <div className="flex h-40 w-32 flex-col items-center justify-center rounded-xl bg-gradient-to-b from-gray-400 to-gray-500 text-white shadow">
                  <span className="text-xs font-bold text-center px-2">
                    {doc.title}
                  </span>
                </div>
              )}
              <p className="text-sm text-gray-500 max-w-sm text-center leading-relaxed">
                Hệ thống hiện chưa hỗ trợ xem trước định dạng này trực tiếp. Vui
                lòng nhấn <strong>"Mở trong thẻ mới"</strong> hoặc{" "}
                <strong>"Tải xuống"</strong> để xem.
              </p>
              {onUpdateThumbnail && (
                <div className="mt-4">
                  <DocumentCoverSelector
                    variant="upload"
                    onUploadCover={onUpdateThumbnail}
                    isUpdating={isUpdatingThumbnail}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
