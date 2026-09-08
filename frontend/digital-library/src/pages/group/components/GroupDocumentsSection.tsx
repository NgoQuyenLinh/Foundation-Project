// src/pages/group/components/GroupDocumentsSection.tsx

import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { DynamicFilterDropdown } from "@/components/shared/DynamicFilterDropdown";
import { DocumentTypeTabs } from "@/components/shared/DocumentTypeTabs";
import { getNormalizedExtension, type TabKey } from "@/hooks/useDocumentFilters";
import type { Document, Folder } from "@/types/document";
import type { PermissionLevel } from "@/types/group";
import type { FolderAction } from "@/components/shared/FolderContextMenu";
import DocumentsTab from "./DocumentsTab";

export interface WorkspaceTag {
  id?: number;
  tag_id?: number;
  name: string;
  color?: string;
}

export interface GroupDocumentsSectionProps {
  activeDocumentTab: TabKey;
  setActiveDocumentTab: (tab: TabKey) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  workspaceTags: WorkspaceTag[];
  selectedTagId: number | null;
  setSelectedTagId: (id: number | null) => void;
  fileTypes: string[];
  selectedFileType: string | null;
  setSelectedFileType: (type: string | null) => void;
  filteredDocuments: Document[];
  folders: Folder[];
  docsLoading: boolean;
  foldersLoading: boolean;
  permission: PermissionLevel;
  isOwner: boolean;
  groupId: number;
  saveDocument: { mutateAsync: (docId: number) => Promise<unknown> };
  deleteDocument: { mutateAsync: (docId: number) => Promise<unknown> };
  handleRenameDocument: (id: string | number, title: string) => void;
  setEditingFolder: (folder: any) => void;
  setIsFolderModalOpen: (open: boolean) => void;
  handleFolderAction: (action: FolderAction, folderId: number) => void;
}

export function GroupDocumentsSection({
  activeDocumentTab,
  setActiveDocumentTab,
  searchQuery,
  setSearchQuery,
  workspaceTags,
  selectedTagId,
  setSelectedTagId,
  fileTypes,
  selectedFileType,
  setSelectedFileType,
  filteredDocuments,
  folders,
  docsLoading,
  foldersLoading,
  permission,
  isOwner,
  groupId,
  saveDocument,
  deleteDocument,
  handleRenameDocument,
  setEditingFolder,
  setIsFolderModalOpen,
  handleFolderAction,
}: GroupDocumentsSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Dynamic Tabs lọc theo định dạng tệp */}
      <DocumentTypeTabs
        activeTab={activeDocumentTab}
        onChangeTab={setActiveDocumentTab}
      />

      {/* Thanh Tìm kiếm & Bộ lọc Dropdown */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1 max-w-md">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Tìm tệp trong không gian..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc theo Tag Group */}
          <DynamicFilterDropdown
            label="Nhãn dán"
            options={workspaceTags.map((t) => ({
              value: (t.tag_id ?? t.id) as number,
              label: t.name,
            }))}
            selectedValue={selectedTagId}
            onChange={(val) => setSelectedTagId(val as number | null)}
          />

          {/* Lọc theo Loại File */}
          <DynamicFilterDropdown
            label="Loại tài liệu"
            options={fileTypes.map((ft: string) => ({
              value: ft,
              label: getNormalizedExtension(ft).toUpperCase() || "Khác",
            }))}
            selectedValue={selectedFileType}
            onChange={(val) => setSelectedFileType(val as string | null)}
          />
        </div>
      </div>

      {/* Hiển thị thư mục & tài liệu */}
      <DocumentsTab
        documents={filteredDocuments}
        folders={folders}
        isLoading={docsLoading || foldersLoading}
        permission={permission}
        isOwner={isOwner}
        groupId={groupId}
        onSave={(docId: number) => saveDocument.mutateAsync(docId)}
        onDelete={(docId: number) => deleteDocument.mutateAsync(docId)}
        onRename={handleRenameDocument}
        onAddFolder={() => {
          setEditingFolder(null);
          setIsFolderModalOpen(true);
        }}
        onFolderAction={handleFolderAction}
      />
    </div>
  );
}