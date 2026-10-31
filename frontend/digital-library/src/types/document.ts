// frontend/digital-library/src/types/document.ts

export type ReadingStatus = "to_read" | "reading" | "completed";

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
  owner?: DocumentOwner | null;
  is_bundle?: boolean;
  bundle_parent_id?: number | null;
  bundle_children_count?: number | null;
}

export interface PaginatedDocuments {
  items: Document[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SharedDocument extends Document {
  share_id?: number | null;
  shared_by?: DocumentOwner | null;
  share_message?: string | null;
  shared_at?: string | null;
}

export interface PaginatedSharedDocuments {
  items: SharedDocument[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ==========================================
// FAVORITE TYPES (Khớp backend schemas)
// ==========================================

export interface FavoriteTag {
  id: number;
  name: string;
  color?: string;
}

export interface FavoriteTagWithCount {
  id: number;
  name: string;
  color?: string;
  document_count: number;
}

export interface FavoriteDocument {
  id: number;
  title: string;
  description?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  file_path?: string | null;
  thumbnail_path?: string | null;
  owner_id?: number | null;
  owner?: DocumentOwner | null;
  is_important: boolean;
  is_bundle?: boolean;
  is_deleted?: boolean;
  is_orphaned?: boolean;
  checksum?: string | null;
  content?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at?: string | null;
  favorited_at: string;
  reading_status: ReadingStatus;
  notes?: string | null;
  favorite_tags: FavoriteTag[];
  tags?: string[] | null;
}

export interface FavoriteStats {
  total: number;
  to_read: number;
  reading: number;
  completed: number;
}

export interface FavoriteListResponse {
  items: FavoriteDocument[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface FavoriteListParams {
  page?: number;
  page_size?: number;
  reading_status?: ReadingStatus;
  tag_ids?: number[];
  tag_mode?: "any" | "all";
  sort_by?: "created_at" | "title";
  sort_order?: "asc" | "desc";
}