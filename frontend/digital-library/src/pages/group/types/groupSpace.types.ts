// frontend/digital-library/src/pages/group/types/groupSpace.types.ts

import type { Document } from "@/types/document";
import type { PermissionLevel, WorkspaceInvitation, WorkspaceMember } from "@/types/group";
import type { FolderAction } from "@/components/shared/FolderContextMenu";

export type GroupTab = "documents" | "members" | "requests" | "settings" | "trash";

export const TAB_LABELS: Record<GroupTab, string> = {
  documents: "Tài liệu",
  members: "Thành viên",
  requests: "Yêu cầu ",
  settings: "Cài đặt",
  trash: "Thùng rác",
};

export interface DocumentsTabProps {
  documents: Document[];
  folders: {
    id: number;
    name: string;
    document_count: number;
    color?: string | null;
  }[];
  isLoading: boolean;
  permission: PermissionLevel;
  isOwner: boolean;
  groupId: number;
  onSave: (docId: number) => Promise<unknown>;
  onDelete: (docId: number) => Promise<unknown>;
  onRename?: (docId: string | number, currentTitle: string) => void;
  onAddFolder: () => void;
  onFolderAction: (action: FolderAction, folderId: number) => void;
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
