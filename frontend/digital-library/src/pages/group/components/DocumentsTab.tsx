// frontend/digital-library/src/pages/group/components/DocumentsTab.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileBox, ArrowLeft, Plus, FolderOpen } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { FolderCard } from "@/components/shared/FolderCard";
import { type FolderAction } from "@/components/shared/FolderContextMenu";
import { useDocumentFilters } from "@/hooks/useDocumentFilters";
import { groupTagService } from "@/services/tagService";
import { groupDocumentService } from "@/services/documentService";
import LocalGroupDocumentCard from "./LocalGroupDocumentCard";
import { ViewToggle, type ViewMode } from "@/components/shared/ViewToggle";
import { DocumentListView, type DocumentListItem } from "@/components/shared/DocumentListView";
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
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const effectivePermission: "owner" | "full" | "view" = isOwner
    ? "owner"
    : permission === "full"
      ? "full"
      : "view";

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
  const currentFolder = folders.find((f) => f.id === selectedFolderId);

  // Map dữ liệu sang chuẩn chung của DocumentListView
 const listItems: DocumentListItem[] = filteredCards.map((card) => {
    const doc = card._original;
    return {
      id: doc.id,
      title: doc.title,
      type: doc.file_type || "unknown",
      updatedAt: doc.created_at || doc.updated_at,
      size: doc.file_size,
      thumbnail_path: doc.thumbnail_path || null,
      owner: doc.owner
        ? {
            full_name: doc.owner.full_name || doc.owner.username,
            username: doc.owner.username,
            avatar_url: doc.owner.avatar_url ?? undefined, // Ép null thành undefined ở đây
          }
        : undefined,
      tags: doc.tags || [],
    };
  });

  const handleDocumentAction = (action: string, docId: string | number) => {
    const doc = documents.find((d) => d.id.toString() === docId.toString());
    const docTitle = doc?.title || "";

    switch (action) {
      case "view":
        navigate(`/groups/${groupId}/documents/${docId}`);
        break;
      case "download": {
        const downloadUrl = `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/groups/${groupId}/documents/${docId}/download`;
        const link = window.document.createElement("a");
        link.href = downloadUrl;
        link.download = docTitle;
        link.target = "_blank";
        link.rel = "noreferrer";
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        break;
      }
      case "save_personal":
      case "save":
        onSave?.(Number(docId));
        break;
      case "rename":
        onRename?.(docId, docTitle);
        break;
      case "delete":
        onDelete?.(Number(docId));
        break;
      default:
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex w-full items-center gap-3 overflow-x-auto pb-3 flex-nowrap custom-scrollbar">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[96px] w-[220px] shrink-0 animate-pulse rounded-xl bg-gray-200" />
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

  return (
    <div className="space-y-5">
      {/* 1. SECTION THƯ MỤC */}
      <section className="w-full">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Thư mục học tập</h2>
        <div className="flex w-full items-center gap-3 overflow-x-auto pb-3 flex-nowrap custom-scrollbar">
          <div
            className={`flex h-[96px] shrink-0 cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all duration-300 bg-white ${
              selectedFolderId === null ? "border-primary-500 bg-primary-50/25 shadow-md min-w-[180px]" : "border-gray-200 hover:border-gray-300 min-w-[160px]"
            }`}
            onClick={() => onSelectFolder?.(null)}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">Tất cả</h3>
              <p className="mt-0.5 text-xs text-gray-400 font-medium">Tất cả tài liệu</p>
            </div>
          </div>

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
              onAction={(action) => onFolderAction(action as FolderAction, folder.id)}
            />
          ))}

          {effectivePermission !== "view" && (
            <button
              type="button"
              onClick={onAddFolder}
              className="flex h-[96px] min-w-[200px] shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 text-sm font-medium text-gray-500 hover:border-primary-400 hover:bg-primary-50/40 hover:text-primary-600 transition-all"
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
          <div className="flex items-center gap-3">
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

          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {filteredCards.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredCards.map((card) => (
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
            // Sử dụng chung DocumentListView từ thư mục shared/
            <DocumentListView
              documents={listItems}
              isLoading={isLoading}
              showOwner={true}
              workspaceType="group"
              permission={effectivePermission}
              navigationPath={(docId) => `/groups/${groupId}/documents/${docId}`}
              onAction={(action, docId) => handleDocumentAction(action, docId)}
              onToggleBundle={async (bundleId) => {
                const children = await groupDocumentService.getBundleChildren(groupId, Number(bundleId));
                return children.map(c => ({
                  id: String(c.id),
                  title: c.title,
                  type: c.file_type || 'file',
                  updatedAt: c.updated_at || c.created_at,
                  size: c.file_size,
                  thumbnail_path: c.thumbnail_path,
                  owner: c.owner ? { full_name: c.owner.full_name || c.owner.username } : undefined,
                  tags: c.tags,
                  workspace_type: 'group',
                  is_bundle: false,
                }));
              }}
            />
          )
        ) : (
          <EmptyState
            icon={<FileBox className="h-6 w-6" />}
            title={selectedFolderId ? "Thư mục trống" : "Chưa có tài liệu nào"}
            description={selectedFolderId ? "Thư mục này hiện chưa chứa tài liệu nào." : "Chia sẻ hoặc upload tài liệu để nhóm cùng sử dụng."}
          />
        )}
      </section>
    </div>
  );
}