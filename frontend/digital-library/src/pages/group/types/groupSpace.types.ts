// frontend/digital-library/src/pages/group/types/groupSpace.types.ts

import type { Document, Folder } from "@/types/document";
import type { PermissionLevel, WorkspaceInvitation, WorkspaceMember } from "@/types/group";
import type { FolderAction } from "@/components/shared/folders/FolderContextMenu";
import type { TabKey } from "@/hooks/useDocumentFilters";
import type { ViewMode } from "@/components/shared/feedback/ViewToggle";

export type GroupTab = "documents" | "members" | "requests" | "settings" | "trash";

export const TAB_LABELS: Record<GroupTab, string> = {
  documents: "Tài liệu",
  members: "Thành viên",
  requests: "Yêu cầu ",
  settings: "Cài đặt",
  trash: "Thùng rác",
};

export interface WorkspaceTag {
  id?: number;
  tag_id?: number;
  name: string;
  color?: string;
}

export interface GroupFolderType {
  id: number;
  name: string;
  document_count?: number;
  color?: string | null;
  tags?: any[];
  tag_ids?: number[];
}

export interface GroupFoldersSectionProps {
  folders: GroupFolderType[];
  foldersLoading?: boolean;
  isLoading?: boolean;
  selectedFolderId?: number | null;
  onSelectFolder?: (id: number | null) => void;
  onAddFolder?: () => void;
  onFolderAction: (action: FolderAction, folderId: number) => void;
  permission?: PermissionLevel | "owner" | "full" | "view";
  isOwner?: boolean;
  workspaceTags?: WorkspaceTag[];
  groupId?: number;
}

export interface GroupDocumentsSectionProps {
  documents: Document[];
  folders?: Folder[] | GroupFolderType[];
  selectedFolderId?: number | null;
  onSelectFolder?: (id: number | null) => void;
  isLoading?: boolean;
  permission?: PermissionLevel | "owner" | "full" | "view";
  isOwner?: boolean;
  groupId: number;
  onSave?: (docId: number) => Promise<unknown>;
  onDelete?: (docId: number) => Promise<unknown>;
  onRename?: (docId: string | number, currentTitle: string) => void;
  currentView?: "grid" | "list" | "detail";
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export interface DocumentsTabProps {
  documents: Document[];
  folders: {
    id: number;
    name: string;
    document_count: number;
    color?: string | null;
  }[];
  selectedFolderId?: number | null; 
  onSelectFolder?: (id: number | null) => void;  
  isLoading: boolean;
  permission: PermissionLevel;
  isOwner: boolean;
  groupId: number;
  onSave: (docId: number) => Promise<unknown>;
  onDelete: (docId: number) => Promise<unknown>;
  onRename?: (docId: string | number, currentTitle: string) => void;
  onAddFolder: () => void;
  onFolderAction: (action: FolderAction, folderId: number) => void;

  currentView?: "grid" | "list" | "detail";

  // Filter props
  activeDocumentTab?: TabKey;
  setActiveDocumentTab?: (tab: TabKey) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  workspaceTags?: WorkspaceTag[];
  selectedTagId?: number | null;
  setSelectedTagId?: (id: number | null) => void;
  fileTypes?: string[];
  selectedFileType?: string | null;
  setSelectedFileType?: (type: string | null) => void;
  selectedUploadTime?: string | null;
  setSelectedUploadTime?: (time: string | null) => void;
  selectedAccessTime?: string | null;
  setSelectedAccessTime?: (time: string | null) => void;
  members?: WorkspaceMember[] | any[];
  selectedUploaderId?: number | null;
  setSelectedUploaderId?: (id: number | null) => void;
}

export interface LocalGroupDocumentCardProps {
  document: Document;
  permission: "owner" | "full" | "view";
  groupId: number;
  onSave: (docId: number) => Promise<unknown>;
  onDelete: (docId: number) => Promise<unknown>;
  onRename?: (docId: string | number, currentTitle: string) => void;
}

export interface MembersTabProps {
  members: WorkspaceMember[];
  isOwner: boolean;
  onInvite: () => void;
  groupId: number;
}

export interface RequestsTabProps {
  invitations: WorkspaceInvitation[];
}

export interface SettingsTabProps {
  groupName: string;
  members: WorkspaceMember[];
  onDissolve: () => Promise<unknown>;
}

export interface TrashTabProps {
  documents: Document[];
  groupId: number;
}

export interface SimpleShareModalProps {
  title: string;
  documents: Document[];
  onClose: () => void;
}

export interface InviteModalProps {
  groupId: number;
  onClose: () => void;
}
