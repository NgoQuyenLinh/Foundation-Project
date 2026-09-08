// frontend/digital-library/src/pages/group/components/DocumentsTab.tsx

import { useQuery } from "@tanstack/react-query";
import { FileBox } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { FolderCard } from "@/components/shared/FolderCard";
import { type FolderAction } from "@/components/shared/FolderContextMenu";
import { useDocumentFilters } from "@/hooks/useDocumentFilters";
import { groupTagService } from "@/services/tagService";
import LocalGroupDocumentCard from "./LocalGroupDocumentCard";
import type { DocumentsTabProps } from "../types/groupSpace.types";

export default function DocumentsTab({
  documents,
  folders,
  isLoading,
  permission,
  isOwner,
  groupId,
  onSave,
  onDelete,
  onRename, // <-- Bổ sung destructure onRename
  onAddFolder,
  onFolderAction,
}: DocumentsTabProps) {
  const docCards = documents.map((doc) => ({
    id: doc.id,
    name: doc.title,
    rawType: doc.file_type || null,
    extension: null as string | null,
    type: doc.file_type || "unknown",
    tags: (doc as any).tags || [],
    _original: doc,
  }));

  const { data: workspaceTags = [] } = useQuery({
    queryKey: ["workspace-tags", groupId],
    queryFn: () => groupTagService.getWorkspaceTags(Number(groupId)),
    enabled: !!groupId,
  });

  const getFolderTags = (folder: any) => {
    if (Array.isArray(folder.tags) && folder.tags.length > 0) {
      return folder.tags;
    }
    if (Array.isArray(folder.tag_ids) && folder.tag_ids.length > 0) {
      return workspaceTags.filter((t: any) => folder.tag_ids.includes(t.id));
    }
    return [];
  };

  const { filteredDocuments: filteredCards } = useDocumentFilters(docCards);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl bg-gray-200"
            />
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
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Thư mục học tập
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              id={folder.id}
              name={folder.name}
              count={folder.document_count}
              color={folder.color}
              tags={getFolderTags(folder)}
              onClick={() => console.log(folder.id)}
              onAction={(action) =>
                onFolderAction(action as FolderAction, folder.id)
              }
            />
          ))}
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

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Tài liệu mới nhất
        </h2>
        {filteredCards.length ? (
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
          <EmptyState
            icon={<FileBox className="h-6 w-6" />}
            title="Chưa có tài liệu nào"
            description="Chia sẻ hoặc upload tài liệu để nhóm cùng sử dụng."
          />
        )}
      </section>
    </div>
  );
}