import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import { Info } from "lucide-react";
import {
  TABS,
  FILE_TYPE_LABELS,
  MIME_TO_ICON_TYPE,
  type SharedDocumentDetailProps,
} from "./DocumentDetail.types";
import { useDocumentDetail } from "./hooks/useDocumentDetail";
import { DocumentTitleHeader } from "./components/DocumentTitleHeader";
import { DocumentInfoCard } from "./components/DocumentInfoCard";
import { DocumentActionCard } from "./components/DocumentActionCard";
import { SetCoverModal } from "./components/SetCoverModal";
import { TabPreview } from "./tabs/TabPreview";
import { TabContent } from "./tabs/TabContent";
import { TabDescription, TabNote, TabActivity } from "./tabs/TabPanels";

export function DocumentDetail(props: SharedDocumentDetailProps = {}) {
  const queryClient = useQueryClient();
  const {
    doc,
    isLoading,
    isError,
    params,
    permissions,
    activeTab,
    setActiveTab,
    isRenaming,
    tempTitle,
    setTempTitle,
    handleStartRename,
    handleConfirmRename,
    handleCancelRename,
    handleBack,
    currentTags,
    allTags,
    isLoadingTags,
    handleCreateTag,
    isCreatingTag,
    handleSaveTags,
    isSavingTags,
    handleRemoveTag,
    isRemovingTag,
    renameMutation,

    handleUpdateThumbnail,
    isUpdatingThumbnail,
    handleUpdateThumbnailPage,
    isUpdatingThumbnailPage,
    handleDelete,
    isDeleting,
  } = useDocumentDetail(props);

  const [viewMode, setViewMode] = useState<"original" | "markdown">("original");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);

  const isPdfOrDoc =
    doc?.file_type === "application/pdf" ||
    doc?.file_type?.includes("wordprocessingml") ||
    doc?.file_type?.includes("msword") ||
    doc?.file_path?.toLowerCase().endsWith(".pdf") ||
    doc?.file_path?.toLowerCase().endsWith(".docx") ||
    doc?.file_path?.toLowerCase().endsWith(".doc");

  /**
   * Kích hoạt thao tác đổi ảnh bìa bằng Modal đa năng
   */
  const handleSetCover = () => {
    setIsCoverModalOpen(true);
  };

  // --- TRẠNG THÁI LOADING ---
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-6 w-24 rounded bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
          <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  // --- TRẠNG THÁI LỖI / KHÔNG TÌM THẤY ---
  if (isError || !doc) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-500">Không tìm thấy tài liệu.</p>
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-primary-600 hover:underline"
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  // --- CHUYỂN HƯỚNG NẾU LÀ GÓI TÀI LIỆU (BUNDLE) ---
  if (doc.is_bundle) {
    const isGroup = !!(params.id && params.docId);
    const targetUrl = isGroup
      ? `/groups/${params.id}/bundle/${doc.id}`
      : `/personal/bundle/${doc.id}`;
    return <Navigate to={targetUrl} replace />;
  }

  // --- CHUẨN BỊ DỮ LIỆU HIỂN THỊ ---
  const fileTypeLabel =
    FILE_TYPE_LABELS[doc.file_type ?? ""] ?? doc.file_type ?? "Không xác định";
  const iconType = MIME_TO_ICON_TYPE[doc.file_type ?? ""] ?? "default";
  const sizeLabel = formatSize(doc.file_size ?? 0);
  const uploadedAt = formatRelativeDate(doc.created_at);
  const fileDownloadUrl = doc.file_path
    ? `${import.meta.env.VITE_API_URL}/${doc.file_path}`
    : "#";
  const markdownDownloadUrl = doc.markdown_path
    ? `${import.meta.env.VITE_API_URL}/${doc.markdown_path}`
    : null;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div
        className={cn(
          "grid grid-cols-1 items-start gap-4",
          sidebarOpen ? "lg:grid-cols-[1fr_260px]" : "lg:grid-cols-[1fr]",
        )}
      >
        {/* ── Cột trái: Header, Tabs & Xem trước nội dung ── */}
        <Card className="flex flex-col min-w-0 h-[1100px]">
          <DocumentTitleHeader
            onBack={handleBack}
            title={doc.title}
            iconType={iconType}
            sizeLabel={sizeLabel}
            uploadedAt={uploadedAt}
            canEdit={permissions.canEdit}
            isRenaming={isRenaming}
            tempTitle={tempTitle}
            setTempTitle={setTempTitle}
            onConfirmRename={handleConfirmRename}
            onCancelRename={handleCancelRename}
            isRenamePending={renameMutation.isPending}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
          />

          {/* Thanh chuyển tab */}
          <div className="-mx-5 flex items-center justify-between border-b border-gray-200 px-5">
            <div className="flex items-center gap-6">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "pb-3 text-sm font-medium transition-colors focus:outline-none",
                    activeTab === tab.key
                      ? "border-b-2 border-primary-600 text-primary-600"
                      : "text-gray-500 hover:text-gray-900",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Bên phải: Nút Bản gốc / Markdown (nếu có) và Nút Info Toggle */}
            <div className="flex items-center gap-2 pb-2">
              {activeTab === "detail" && markdownDownloadUrl && (
                <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("original")}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md border transition-colors",
                      viewMode === "original"
                        ? "bg-primary-50 border-primary-300 text-primary-700 font-medium"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    Bản gốc
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("markdown")}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md border transition-colors",
                      viewMode === "markdown"
                        ? "bg-primary-50 border-primary-300 text-primary-700 font-medium"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    Markdown
                  </button>
                </div>
              )}

              {/* Nút Toggle Sidebar (Icon Info) */}
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                className={cn(
                  "shrink-0 inline-flex items-center justify-center p-1.5 rounded-md border transition-all shadow-2xs",
                  sidebarOpen
                    ? "border-primary-200 bg-primary-50 text-primary-600 hover:bg-primary-100"
                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900",
                )}
                title={
                  sidebarOpen ? "Ẩn bảng thông tin" : "Hiện bảng thông tin"
                }
                aria-label={
                  sidebarOpen ? "Ẩn bảng thông tin" : "Hiện bảng thông tin"
                }
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Nội dung tương ứng theo từng tab */}
          <div className="pt-1 flex-1 min-h-0 overflow-y-auto relative flex flex-col">
            {" "}
            {activeTab === "detail" && (
              <TabPreview
                doc={doc}
                fileUrl={fileDownloadUrl}
                viewMode={viewMode}
                onUpdateThumbnail={
                  permissions.canEdit ? handleUpdateThumbnail : undefined
                }
                isUpdatingThumbnail={
                  permissions.canEdit ? isUpdatingThumbnail : false
                }
                onUpdateThumbnailPage={
                  permissions.canEdit ? handleUpdateThumbnailPage : undefined
                }
                isUpdatingThumbnailPage={
                  permissions.canEdit ? isUpdatingThumbnailPage : false
                }
              />
            )}
            {activeTab === "content" && (
              <TabContent content={doc.content || ""} />
            )}
            {activeTab === "description" && (
              <TabDescription
                description={doc.description ?? "Chưa có mô tả."}
              />
            )}
            {activeTab === "note" && <TabNote />}
            {activeTab === "activity" && <TabActivity documentId={doc.id} />}
          </div>
        </Card>

        {/* ── Cột phải: Thông tin tệp, Nhãn dán & Hành động ── */}
        {sidebarOpen && (
          <div className="flex flex-col gap-4 min-w-0 w-full">
            <DocumentInfoCard
              title={doc.title}
              fileTypeLabel={fileTypeLabel}
              sizeLabel={sizeLabel}
              uploadedAt={uploadedAt}
              tags={currentTags}
              canManageTags={permissions.canManageTags}
              allTags={allTags}
              isLoadingTags={isLoadingTags}
              onSaveTags={handleSaveTags}
              isSavingTags={isSavingTags}
              onCreateTag={handleCreateTag}
              isCreatingTag={isCreatingTag}
              onRemoveTag={handleRemoveTag}
              isRemovingTag={isRemovingTag}
              viewCount={doc.view_count ?? 0}
              downloadCount={doc.download_count ?? 0}
              shareCount={doc.share_count ?? 0}
              personalViewCount={doc.personal_view_count}
              isPersonal={!doc.workspace_id}
            />

            <DocumentActionCard
              documentId={doc.id}
              fileTitle={doc.title}
              fileDownloadUrl={fileDownloadUrl}
              markdownDownloadUrl={markdownDownloadUrl}
              fileTypeLabel={fileTypeLabel}
              canEdit={permissions.canEdit}
              canDelete={permissions.canDelete}
              isRenamePending={renameMutation.isPending}
              isDeletePending={isDeleting}
              onStartRename={handleStartRename}
              onDelete={handleDelete}
              onSetCover={handleSetCover}
              onDownloadSuccess={() => {
                queryClient.invalidateQueries({
                  queryKey: [...(props.queryKeyPrefix || ["document"]), doc.id],
                });
              }}
            />
          </div>
        )}
      </div>

      {/* Modal cập nhật ảnh bìa đa năng (chọn trang hoặc tải ảnh từ máy) */}
      <SetCoverModal
        isOpen={isCoverModalOpen}
        onClose={() => setIsCoverModalOpen(false)}
        hasPages={Boolean(isPdfOrDoc)}
        onSetPageCover={handleUpdateThumbnailPage}
        onUploadCover={handleUpdateThumbnail}
        isUpdating={isUpdatingThumbnail || isUpdatingThumbnailPage}
      />
    </div>
  );
}

export default DocumentDetail;
