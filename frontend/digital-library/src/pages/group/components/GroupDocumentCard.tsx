// src/pages/group/components/GroupDocumentCard.tsx

import { DocumentCard } from "@/components/shared/DocumentCard";
import type { DocCardType } from "@/pages/personal/components/PersonalDocumentsSection";
import type { DocumentAction } from "@/components/shared/DocumentContextMenu";

interface GroupDocumentCardProps {
  document: any; // document object từ API
  groupId: number;
  onDocumentAction: (action: DocumentAction | string, docId: string) => void;
}

export function GroupDocumentCard({
  document,
  groupId,
  onDocumentAction,
}: GroupDocumentCardProps) {
  // Ánh xạ dữ liệu sang DocCardType
  const docCard: DocCardType = {
    id: String(document.id),
    name: document.title,
    type: document.file_type || "unknown",
    updatedAt: document.updated_at || document.created_at,
    size: document.file_size || 0,
    extension: document.extension,
    thumbnail_path: document.thumbnail_path,
    file_path: document.file_path,
    owner: document.owner
      ? { name: document.owner.name, avatar: document.owner.avatar }
      : undefined,
    rawType: document.file_type,
    tags: document.tags || [],
  };

  return <DocumentCard document={docCard} onAction={onDocumentAction} />;
}