// src/pages/group/components/tabs/DocumentsTab.tsx

import { useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { DynamicFilterDropdown } from "@/components/shared/feedback/DynamicFilterDropdown";
import { DocumentTypeTabs } from "@/components/shared/documents/DocumentTypeTabs";
import { getNormalizedExtension, type TabKey } from "@/hooks/useDocumentFilters";
import { groupTagService } from "@/services/tagService";
import type { ViewMode } from "@/components/shared/feedback/ViewToggle";
import type { DocumentsTabProps } from "../../types/groupSpace.types";
import { GroupFoldersSection } from "../sections/GroupFoldersSection";
import { GroupDocumentsSection } from "../sections/GroupDocumentsSection";

const TIME_FILTER_OPTIONS = [
  { value: "today", label: "Hôm nay" },
  { value: "last_7_days", label: "7 ngày qua" },
  { value: "last_30_days", label: "30 ngày qua" },
  { value: "this_year", label: "Năm nay" },
];

export function DocumentsTab({
  documents,
  folders,
  selectedFolderId = null,
  onSelectFolder,
  isLoading,
  permission,
  isOwner,
  groupId,
  onSave,
  onDelete,
  onRename,
  onAddFolder,
  onFolderAction,
  currentView = "detail",

  // Filter props
  activeDocumentTab: controlledActiveTab,
  setActiveDocumentTab: controlledSetActiveTab,
  searchQuery: controlledSearchQuery,
  setSearchQuery: controlledSetSearchQuery,
  workspaceTags: propWorkspaceTags,
  selectedTagId: controlledTagId,
  setSelectedTagId: controlledSetTagId,
  fileTypes: propFileTypes,
  selectedFileType: controlledFileType,
  setSelectedFileType: controlledSetFileType,
  selectedUploadTime,
  setSelectedUploadTime,
  selectedAccessTime,
  setSelectedAccessTime,
  members = [],
  selectedUploaderId,
  setSelectedUploaderId,
}: DocumentsTabProps) {
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>(
    (currentView as ViewMode) || "detail"
  );
  const [internalActiveTab, setInternalActiveTab] = useState<TabKey>("all");
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [internalTagId, setInternalTagId] = useState<number | null>(null);
  const [internalFileType, setInternalFileType] = useState<string | null>(null);

  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = controlledSetActiveTab ?? setInternalActiveTab;
  const searchQuery = controlledSearchQuery ?? internalSearchQuery;
  const setSearchQuery = controlledSetSearchQuery ?? setInternalSearchQuery;
  const selectedTagId = controlledTagId ?? internalTagId;
  const setSelectedTagId = controlledSetTagId ?? setInternalTagId;
  const selectedFileType = controlledFileType ?? internalFileType;
  const setSelectedFileType = controlledSetFileType ?? setInternalFileType;

  // Fallback query if workspaceTags not provided
  const { data: fetchedWorkspaceTags = [] } = useQuery({
    queryKey: ["workspace-tags", groupId],
    queryFn: () => groupTagService.getWorkspaceTags(Number(groupId)),
    enabled: !!groupId && (!propWorkspaceTags || propWorkspaceTags.length === 0),
  });

  const workspaceTags =
    propWorkspaceTags && propWorkspaceTags.length > 0
      ? propWorkspaceTags
      : fetchedWorkspaceTags;

  const fileTypes =
    propFileTypes && propFileTypes.length > 0
      ? propFileTypes
      : Array.from(
          new Set(
            documents
              .map((d: any) => d.file_type || d.rawType)
              .filter(Boolean)
          )
        );

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Dynamic Tabs lọc theo loại file */}
      <DocumentTypeTabs activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* 2. Thanh Tìm kiếm & Bộ lọc Dropdown */}
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
          {/* Lọc theo Nhãn dán */}
          <DynamicFilterDropdown
            label="Nhãn dán"
            options={workspaceTags.map((t: any) => ({
              value: (t.tag_id ?? t.id) as number,
              label: t.name,
            }))}
            selectedValue={selectedTagId}
            onChange={(val) => setSelectedTagId(val as number | null)}
          />

          {/* Lọc theo Loại tài liệu */}
          <DynamicFilterDropdown
            label="Loại tài liệu"
            options={fileTypes.map((ft: string) => ({
              value: ft,
              label: getNormalizedExtension(ft).toUpperCase() || "Khác",
            }))}
            selectedValue={selectedFileType}
            onChange={(val) => setSelectedFileType(val as string | null)}
          />

          {/* Lọc theo Ngày tải lên */}
          {setSelectedUploadTime && (
            <DynamicFilterDropdown
              label="Tải lên gần đây"
              options={TIME_FILTER_OPTIONS}
              selectedValue={selectedUploadTime ?? null}
              onChange={(val) => setSelectedUploadTime(val as string | null)}
            />
          )}

          {/* Lọc theo Lần mở gần nhất */}
          {setSelectedAccessTime && (
            <DynamicFilterDropdown
              label="Mở gần đây"
              options={TIME_FILTER_OPTIONS}
              selectedValue={selectedAccessTime ?? null}
              onChange={(val) => setSelectedAccessTime(val as string | null)}
            />
          )}

          {/* Lọc theo Người tải lên */}
          {members && members.length > 0 && setSelectedUploaderId && (
            <DynamicFilterDropdown
              label="Người tải lên"
              options={members.map((m: any) => ({
                value: (m.user_id ?? m.id) as number,
                label:
                  m.full_name ||
                  m.user?.full_name ||
                  m.username ||
                  m.user?.username ||
                  `Thành viên #${m.user_id ?? m.id}`,
              }))}
              selectedValue={selectedUploaderId ?? null}
              onChange={(val) => setSelectedUploaderId(val as number | null)}
            />
          )}
        </div>
      </div>

      {/* 3. Section Thư mục */}
      <GroupFoldersSection
        folders={folders}
        isLoading={isLoading}
        selectedFolderId={selectedFolderId}
        onSelectFolder={onSelectFolder}
        onAddFolder={onAddFolder}
        onFolderAction={onFolderAction}
        permission={permission}
        isOwner={isOwner}
        workspaceTags={workspaceTags}
      />

      {/* 4. Section Tài liệu */}
      <GroupDocumentsSection
        documents={documents}
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={onSelectFolder}
        isLoading={isLoading}
        permission={permission}
        isOwner={isOwner}
        groupId={groupId}
        onSave={onSave}
        onDelete={onDelete}
        onRename={onRename}
        currentView={currentView}
        viewMode={internalViewMode}
        onViewModeChange={setInternalViewMode}
      />
    </div>
  );
}

export default DocumentsTab;