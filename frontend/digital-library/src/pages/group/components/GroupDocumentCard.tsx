// src/pages/group/components/GroupDocumentCard.tsx

import { DocumentCard } from "@/components/shared/DocumentCard";
import type { DocumentAction, DocumentMenuItem } from "@/components/shared/DocumentContextMenu";
import { formatRelativeDate } from "@/utils/formatDate";
import { formatSize } from "@/utils/formatSize";
import { getFileExtension } from "@/utils/file";

interface GroupDocumentCardProps {
  document: any; // document object từ API
  groupId: number | string;
  onDocumentAction: (action: DocumentAction | string, docId: string) => void;
  allowedActions?: DocumentAction[];
  extraItems?: DocumentMenuItem[];
}

export function GroupDocumentCard({
  document,
  groupId,
  onDocumentAction,
  allowedActions,
  extraItems,
}: GroupDocumentCardProps) {
  // Ánh xạ & chuẩn hóa dữ liệu sang format của DocumentCard
  const formattedDoc = {
    id: String(document.id),
    name: document.title || document.name || "Tài liệu không tên",
    type: document.file_type || document.type || "unknown",
    // Nếu dữ liệu đã được format từ trước thì giữ nguyên, ngược lại dùng helper format
    updatedAt: typeof document.updatedAt === "string"
      ? document.updatedAt
      : formatRelativeDate(document.updated_at || document.created_at),
    size: typeof document.size === "string"
      ? document.size
      : formatSize(document.file_size || 0),
    extension:
      document.extension ||
      getFileExtension(document.file_path, document.file_type, document.title),
    thumbnail_path: document.thumbnail_path || null,
    file_path: document.file_path || null,
    tags: document.tags || [],
    owner: document.owner
      ? { name: document.owner.name, avatar: document.owner.avatar }
      : undefined,
  };

  return (
    <DocumentCard
      key={formattedDoc.id}
      document={formattedDoc}
      onAction={onDocumentAction}
      basePath={`/group/${groupId}/documents`}  
      allowedActions={allowedActions}
      extraItems={extraItems}
    />
  );
}