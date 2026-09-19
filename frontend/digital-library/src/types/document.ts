// frontend/digital-library/src/types/document.ts

export interface Tag {
  id: number;
  name: string;
  color?: string;
}

export interface DocumentOwner {
  id: number;
  username: string;
  full_name?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
}

export interface Folder {
  id: number;
  owner_id?: number;
  workspace_id?: number | null;
  name: string;
  color?: string;
  tag_count: number;
  document_count: number;
  tags: Tag[];
  created_at: string;
}

export interface Document {
  id: number;
  owner_id?: number;
  workspace_id?: number | null;
  source_document_id?: number | null;
  title: string;
  file_path?: string;
  file_type: string;
  file_size: number; // bytes
  created_at: string;
  updated_at: string;
  is_important: boolean;
  category_id?: number;
  description?: string;
  thumbnail_path?: string | null;
  content?: string | null;
  tags?: Tag[];
  is_deleted?: boolean;
  deleted_at?: string | null;
  is_orphaned?: boolean;
  orphaned_at?: string | null;
  trash_source?: "personal" | "group_orphaned" | string | null;
  trash_group_name?: string | null;
  owner?: DocumentOwner | null; // <-- Thuộc tính mới bổ sung
}

export interface PaginatedDocuments {
  items: Document[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}