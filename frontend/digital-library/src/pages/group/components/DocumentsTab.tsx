// frontend/digital-library/src/pages/group/components/DocumentsTab.tsx

import { useQuery } from "@tanstack/react-query";
import { FileBox, ArrowLeft } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { FolderCard } from "@/components/shared/FolderCard";
import { type FolderAction } from "@/components/shared/FolderContextMenu";
import { useDocumentFilters } from "@/hooks/useDocumentFilters";
import { groupTagService } from "@/services/tagService";
import LocalGroupDocumentCard from "./LocalGroupDocumentCard";
import type { DocumentsTabProps } from "../types/groupSpace.types";
import { formatRelativeDate } from "@/utils/formatDate";
import { formatSize } from "@/utils/formatSize";
import { getFileExtension } from "@/utils/file";

export default function DocumentsTab({
  documents,
  folders,
  selectedFolderId = null,
  onSelectFolder,
  isLoading,
  permission,
  isOwner,
  groupId,
  onSave,
  onDelete,
  onRename,  
  onAddFolder,
  onFolderAction,
}: DocumentsTabProps) {

  const docCards = documents.map((doc) => ({
    id: doc.id.toString(),
    name: doc.title,
    type: doc.file_type || "unknown",
    updatedAt: formatRelativeDate(doc.created_at), 
    size: formatSize(doc.file_size || 0),          
    extension: getFileExtension(doc.file_path, doc.file_type, doc.title),
    thumbnail_path: doc.thumbnail_path || null,
    file_path: doc.file_path || null,             
    tags: doc.tags || [],                         
    // Ép kiểu bắt nhiều định dạng trả về từ Backend
    folder_id: (doc as any).folder_id ?? (doc as any).folderId ?? (doc as any).folder?.id ?? null,
    _original: doc,
  }));

  const { data: workspaceTags = [] } = useQuery({
    queryKey: ["workspace-tags", groupId],
    queryFn: () => groupTagService.getWorkspaceTags(Number(groupId)),
    enabled: !!groupId,
  });

  const getFolderTags = (folder: any) => {
    if (Array.isArray(folder.tags) && folder.tags.length > 0) return folder.tags;
    if (Array.isArray(folder.tag_ids) && folder.tag_ids.length > 0) {
      return workspaceTags.filter((t: any) => folder.tag_ids.includes(t.id));
    }
    return [];
  };

  const { filteredDocuments: filteredCards } = useDocumentFilters(docCards);

  // 'documents' truyền vào từ Props đã được lọc chuẩn xác ở useGroupSpace
  // do đó chỉ cần hiển thị trực tiếp filteredCards mà không filter lại theo card.folder_id nữa
  const displayedCards = filteredCards;

  const currentFolder = folders.find((f) => f.id === selectedFolderId);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  const effectivePermission: "owner" | "full" | "view" = isOwner
    ? "owner"
    : permission === "full"
      ? "full"
      : "view";

  return (
    <div className="space-y-5">
      {/* 1. SECTION THƯ MỤC HỌC TẬP */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Thư mục học tập
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {folders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;

            return (
              <div
                key={folder.id}
                className={`transition-all rounded-xl ${
                  isSelected ? "ring-2 ring-primary-500 ring-offset-2" : ""
                }`}
              >
                <FolderCard
                  id={folder.id}
                  name={folder.name}
                  count={folder.document_count}
                  color={folder.color}
                  tags={getFolderTags(folder)}
                  onClick={() => onSelectFolder?.(folder.id)}
                  onAction={(action) =>
                    onFolderAction(action as FolderAction, folder.id)
                  }
                />
              </div>
            );
          })}
          {effectivePermission !== "view" && (
            <button
              onClick={onAddFolder}
              className="flex min-h-[64px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-5 text-sm font-medium text-gray-400 transition-all duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
            >
              + Thêm thư mục
            </button>
          )}
        </div>
      </section>

      {/* 2. SECTION TÀI LIỆU */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            {currentFolder ? `Tài liệu trong "${currentFolder.name}"` : "Tài liệu mới nhất"}
          </h2>
          
          {selectedFolderId !== null && (
            <button
              onClick={() => onSelectFolder?.(null)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Tất cả tài liệu
            </button>
          )}
        </div>

        {displayedCards.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {displayedCards.map((card) => (
              <LocalGroupDocumentCard
                key={card.id}
                document={card._original}
                permission={effectivePermission}
                groupId={groupId}
                onSave={onSave}
                onDelete={onDelete}
                onRename={onRename} 
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileBox className="h-6 w-6" />}
            title={selectedFolderId ? "Thư mục trống" : "Chưa có tài liệu nào"}
            description={
              selectedFolderId
                ? "Thư mục này hiện chưa chứa tài liệu nào."
                : "Chia sẻ hoặc upload tài liệu để nhóm cùng sử dụng."
            }
          />
        )}
      </section>
    </div>
  );
}