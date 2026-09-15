// frontend/digital-library/src/pages/group/components/DocumentsTab.tsx

import { useQuery } from "@tanstack/react-query";
import { FileBox, ArrowLeft, Plus, FolderOpen } from "lucide-react";
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
  const displayedCards = filteredCards;
  const currentFolder = folders.find((f) => f.id === selectedFolderId);

  if (isLoading) {
    return (
      <div className="space-y-5">
        {/* Skeleton Hàng thư mục cuộn ngang */}
        <div className="flex w-full items-center gap-3 overflow-x-auto pb-3 flex-nowrap custom-scrollbar">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[96px] w-[220px] shrink-0 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
        {/* Skeleton Danh sách tài liệu */}
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
      {/* 1. SECTION THƯ MỤC HỌC TẬP (1 hàng cuộn ngang) */}
      <section className="w-full">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Thư mục học tập
        </h2>

        <div className="flex w-full items-center gap-3 overflow-x-auto pb-3 flex-nowrap custom-scrollbar">
          {/* Thẻ Tất cả */}
          <div
            className={`
              flex h-[96px] shrink-0 cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all duration-300 bg-white
              ${
                selectedFolderId === null
                  ? "border-primary-500 bg-primary-50/20 shadow-md min-w-[180px]"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-sm min-w-[160px]"
              }
            `}
            onClick={() => onSelectFolder?.(null)}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                Tất cả
              </h3>
              <p className="mt-0.5 text-xs text-gray-400 font-medium">
                Tất cả tài liệu
              </p>
            </div>
          </div>

          {/* Danh sách Thư mục Nhóm */}
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              id={folder.id}
              name={folder.name}
              count={folder.document_count}
              color={folder.color}
              tags={getFolderTags(folder)}
              isSelected={selectedFolderId === folder.id}
              onClick={() => onSelectFolder?.(folder.id)}
              onAction={(action) =>
                onFolderAction(action as FolderAction, folder.id)
              }
            />
          ))}

          {/* Nút Tạo thư mục mới (chỉ hiện khi có quyền) */}
          {effectivePermission !== "view" && (
            <button
              type="button"
              onClick={onAddFolder}
              className="
                flex 
                h-[96px] 
                min-w-[200px] 
                shrink-0 
                items-center 
                justify-center 
                gap-2 
                rounded-xl 
                border 
                border-dashed 
                border-gray-300 
                bg-gray-50/50 
                text-sm 
                font-medium 
                text-gray-500 
                transition-all 
                duration-200 
                hover:border-primary-400 
                hover:bg-primary-50/40 
                hover:text-primary-600
              "
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-xs">
                <Plus className="h-4 w-4 text-gray-600" />
              </div>
              <span>Tạo thư mục mới</span>
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