// src/pages/group/components/GroupDocumentsSection.tsx
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { DynamicFilterDropdown } from "@/components/shared/DynamicFilterDropdown";
import { DocumentTypeTabs } from "@/components/shared/DocumentTypeTabs";
import { getNormalizedExtension } from "@/hooks/useDocumentFilters";
import type { PermissionLevel } from "@/types/group";
import type { FolderAction } from "@/components/shared/FolderContextMenu";
import type { TabKey } from "@/hooks/useDocumentFilters";
import DocumentsTab from "./DocumentsTab";

interface GroupDocumentsSectionProps {
  activeDocumentTab: TabKey;
  setActiveDocumentTab: (tab: TabKey) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  workspaceTags: any[];
  selectedTagId: number | null;
  setSelectedTagId: (id: number | null) => void;
  fileTypes: string[];
  selectedFileType: string | null;
  setSelectedFileType: (type: string | null) => void;
  filteredDocuments: any[];
  folders: any[];
  docsLoading: boolean;
  foldersLoading: boolean;
  permission: PermissionLevel;
  isOwner: boolean;
  groupId: number;
  saveDocument: any;
  deleteDocument: any;
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
      {/* Tabs chuyển loại tệp */}
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
          <DynamicFilterDropdown
            label="Nhãn dán"
            options={workspaceTags.map((t) => ({
              value: t.tag_id,
              label: t.name,
            }))}
            selectedValue={selectedTagId}
            onChange={(val) => setSelectedTagId(val as number | null)}
          />

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

      {/* Danh sách tài liệu & thư mục */}
      <DocumentsTab
        documents={filteredDocuments}
        folders={folders}
        isLoading={docsLoading || foldersLoading}
        permission={permission}
        isOwner={isOwner}
        groupId={groupId}
        onSave={(docId: number) => saveDocument.mutateAsync(docId)} // <-- Thêm : number
        onDelete={(docId: number) => deleteDocument.mutateAsync(docId)} // <-- Thêm : number
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