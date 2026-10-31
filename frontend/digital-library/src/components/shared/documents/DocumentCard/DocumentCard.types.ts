import type { FileTypeMap } from "@/components/shared/documents/FileIcon";
import type { DocumentAction, DocumentMenuItem } from "@/components/shared/documents/DocumentContextMenu";

export interface DocumentTag {
  id: number;
  name: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: FileTypeMap | string;
  updatedAt: string;
  size: string;
  extension?: string;
  thumbnail_path?: string | null;
  markdown_path?: string | null;
  markdownPath?: string | null;
  tags?: DocumentTag[];
  is_bundle?: boolean;
  bundle_parent_id?: number | null;
  bundle_children_count?: number | null;
  view_count?: number;
  personal_view_count?: number;
  trending_score?: number;
}

export interface DocumentCardProps {
  document: DocumentItem;
  onAction: (action: DocumentAction | string, documentId: string) => void;
  basePath?: string;
  allowedActions?: DocumentAction[];
  extraItems?: DocumentMenuItem[];
}