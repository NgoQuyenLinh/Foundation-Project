// frontend/digital-library/src/pages/group/GroupSpace.tsx

import {
  FileBox,
  FilePlus,
  FolderUp,
  Search,
  Upload,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";

import { groupService } from "@/services/groupService";
import { groupTagService } from "@/services/tagService";
import { groupFolderService } from "@/services/folderService";

import { cn } from "@/utils/cn";
import { formatRelativeDate } from "@/utils/formatDate";

import type { GroupTab } from "./types/groupSpace.types";
import { TAB_LABELS } from "./types/groupSpace.types";

import MembersTab from "./components/MembersTab";
import RequestsTab from "./components/RequestsTab";
import SettingsTab from "./components/SettingsTab";
import TrashTab from "./components/TrashTab";
import SimpleShareModal from "./components/SimpleShareModal";
import InviteModal from "./components/InviteModal";

import { useGroupSpace } from "./hooks/useGroupSpace";
import { GroupFolderModalContainer } from "./components/GroupFolderModalContainer";
import { RenameDocumentModal } from "@/components/shared/RenameDocumentModal";
import { GroupUploadModal } from "./components/GroupUploadModal";
import { GroupDocumentsSection } from "./components/GroupDocumentsSection";
import { CreateFolderModal } from "@/components/shared/CreateFolderModal";
import { useHighlightElement } from "@/hooks/useHighlightElement";

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import GroupSwitcher from "./components/GroupSwitcher";

export default function GroupSpace() {
  const {
    groupId,
    navigate,
    activeTab,
    queryClient,
    searchQuery,
    setSearchQuery,
    selectedTagId,
    setSelectedTagId,
    selectedFileType,
    setSelectedFileType,
    activeDocumentTab,
    setActiveDocumentTab,
    shareModal,
    setShareModal,
    isFolderModalOpen,
    setIsFolderModalOpen,
    isUploadModalOpen,
    setIsUploadModalOpen,
    editingFolder,
    setEditingFolder,
    deletingFolder,
    isDeleteFolderOpen,
    isDeletingFolder,
    workspaceTags,
    fileTypes,
    groupTags,
    workspace,
    workspaceLoading,
    workspaceError,
    docsLoading,
    foldersLoading,
    documents,
    folders,
    members,
    invitations,
    isOwner,
    permission,
    canManageDocuments,
    trash,
    filteredDocuments,
    saveDocument,
    deleteDocument,
    setTab,
    handleFolderAction,
    handleCancelDeleteFolder,
    handleConfirmDeleteFolder,
    isGroupRenameModalOpen,
    setIsGroupRenameModalOpen,
    renamingGroupDoc,
    renameGroupDocumentMutation,
    handleRenameDocument,
    uploadMutation,
    createTagMutation,
    handleFolderSubmit,
    handleCreateGroupTag,
    isSubmittingFolder,
    createFolderMutation,
    updateFolderMutation,
    selectedFolderId,
    handleSelectFolder,
    groups,
  } = useGroupSpace();

  useHighlightElement("highlight_doc");

  if (workspaceLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-24 w-full animate-pulse rounded-xl bg-gray-200" />
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
      </div>
    );
  }

  if (workspaceError || !workspace) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-gray-500">
          Không tìm thấy nhóm hoặc bạn không có quyền truy cập.
        </p>
        <Button variant="outline" onClick={() => navigate("/groups")}>
          Quay lại danh sách nhóm
        </Button>
      </div>
    );
  }


  return (
    
    <div className="flex flex-col gap-5 pb-70">
      <div>
      <button
        onClick={() => navigate("/groups/")}
        className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Quay lại danh sách nhóm
      </button>
    </div>
      <Card className="relative flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <GroupSwitcher
          currentGroup={workspace}
          currentGroupId={groupId}
          groups={groups}
          onSelectGroup={(nextGroupId) => {
            navigate(`/groups/${nextGroupId}`);
          }}
          onViewAllGroups={() => {
            navigate("/groups");
          }}
        />

        {canManageDocuments && (
          <Dropdown
            trigger={
              <Button icon={<FilePlus className="h-4 w-4" />}>
                + Thêm tài liệu
              </Button>
            }
            items={[
              {
                icon: <Upload className="h-4 w-4" />,
                label: "Upload tài liệu mới",
                onClick: () => setIsUploadModalOpen(true),
              },
              {
                icon: <FileBox className="h-4 w-4" />,
                label: "Chia sẻ từ kho cá nhân",
                onClick: () => setShareModal("documents"),
              },
              {
                icon: <FolderUp className="h-4 w-4" />,
                label: "Chia sẻ cả thư mục",
                onClick: () => setShareModal("folder"),
              },
            ]}
          />
        )}
      </Card>

      {workspace.is_dissolving && workspace.dissolve_at && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
          Nhóm này sẽ bị giải tán vào{" "}
          {formatRelativeDate(workspace.dissolve_at)}. Hãy lưu tài liệu bạn cần.
        </div>
      )}

      {/* Tabs chuyển đổi giữa các màn hình của Group */}
      <div className="mx-auto flex w-max flex-wrap items-center gap-1.5 rounded-xl border border-gray-200/60 bg-gray-100/80 p-1.5">
        {(Object.keys(TAB_LABELS) as GroupTab[])
          .filter((tab) => isOwner || (tab !== "settings" && tab !== "trash"))
          .map((tab) => (
            <button
              key={tab}
              onClick={() => setTab(tab)}
              className={cn(
                "relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                activeTab === tab
                  ? "bg-white text-primary-700 shadow-sm ring-1 ring-gray-200/50"
                  : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900",
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
      </div>

      {/* TAB TÀI LIỆU */}
      {activeTab === "documents" && (
        <GroupDocumentsSection
          selectedFolderId={selectedFolderId}
          onSelectFolder={handleSelectFolder}
          activeDocumentTab={activeDocumentTab}
          setActiveDocumentTab={setActiveDocumentTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          workspaceTags={workspaceTags}
          selectedTagId={selectedTagId}
          setSelectedTagId={setSelectedTagId}
          fileTypes={fileTypes}
          selectedFileType={selectedFileType}
          setSelectedFileType={setSelectedFileType}
          filteredDocuments={filteredDocuments}
          folders={folders}
          docsLoading={docsLoading}
          foldersLoading={foldersLoading}
          permission={permission}
          isOwner={isOwner}
          groupId={groupId}
          saveDocument={saveDocument}
          deleteDocument={deleteDocument}
          handleRenameDocument={handleRenameDocument}
          setEditingFolder={setEditingFolder}
          setIsFolderModalOpen={setIsFolderModalOpen}
          handleFolderAction={handleFolderAction}
        />
      )}

      {activeTab === "members" && (
        <MembersTab
          members={members}
          isOwner={isOwner}
          onInvite={() => setShareModal("invite")}
          groupId={groupId}
        />
      )}
      {activeTab === "requests" && <RequestsTab invitations={invitations} />}
      {activeTab === "settings" && isOwner && (
        <SettingsTab
          groupName={workspace.name}
          members={members}
          onDissolve={() =>
            groupService
              .dissolve(groupId)
              .then(() =>
                queryClient.invalidateQueries({ queryKey: ["group", groupId] }),
              )
          }
        />
      )}
      {activeTab === "trash" && isOwner && (
        <TrashTab documents={trash} groupId={groupId} />
      )}

      {/* Modals */}
      {/* Group Folder Modal Container */}
      <GroupFolderModalContainer
        isOpen={isFolderModalOpen}
        groupId={groupId}
        editingFolder={editingFolder}
        groupTags={groupTags}
        onClose={() => {
          setIsFolderModalOpen(false);
          setEditingFolder(null);
        }}
        onCreateTag={(name) =>
          groupTagService.create({ name, color: "#2F6B3C" }, groupId)
        }
        onSubmitData={async (data) => {
          if (editingFolder) {
            await groupFolderService.update(
              editingFolder.id,
              { name: data.name, color: data.color },
              groupId,
            );
          } else {
            const newFolder = await groupFolderService.create(
              { name: data.name, color: data.color },
              groupId,
            );

            if (data.tagIds.length > 0) {
              await Promise.all(
                data.tagIds.map((tagId) =>
                  groupFolderService.attachFolderTag(
                    groupId,
                    newFolder.id,
                    tagId,
                  ),
                ),
              );
            }
          }

          setIsFolderModalOpen(false);
          setEditingFolder(null);
          queryClient.invalidateQueries({
            queryKey: ["group-folders", groupId],
          });
        }}
      />

      {isFolderModalOpen && (
        <CreateFolderModal
          onClose={() => {
            setIsFolderModalOpen(false);
            setEditingFolder(null);
          }}
          initialData={editingFolder}
          availableTags={workspaceTags}
          onCreateTag={handleCreateGroupTag}
          isSubmitting={
            createFolderMutation.isPending || updateFolderMutation.isPending
          }
          onSubmitData={async (data) => {
            if (data.id) {
              await updateFolderMutation.mutateAsync({
                id: data.id,
                name: data.name,
                color: data.color,
                tagIds: data.tagIds,
              });
            } else {
              await createFolderMutation.mutateAsync({
                name: data.name,
                color: data.color,
                tagIds: data.tagIds,
              });
            }
            setIsFolderModalOpen(false);
            setEditingFolder(null);
          }}
        />
      )}

      {/* Shared Rename Modal */}
      <RenameDocumentModal
        isOpen={isGroupRenameModalOpen && !!renamingGroupDoc}
        initialTitle={renamingGroupDoc?.title || ""}
        isPending={renameGroupDocumentMutation.isPending}
        onClose={() => setIsGroupRenameModalOpen(false)}
        onConfirm={(newTitle) => {
          if (renamingGroupDoc) {
            renameGroupDocumentMutation.mutate({
              id: renamingGroupDoc.id,
              title: newTitle,
            });
          }
        }}
      />
      {isUploadModalOpen && (
        <GroupUploadModal
          onClose={() => setIsUploadModalOpen(false)}
          tags={groupTags} // Hoặc workspaceTags tùy vào logic của bạn
          createTagMutation={createTagMutation}
          uploadMutation={uploadMutation}
        />
      )}

      {shareModal === "documents" && (
        <SimpleShareModal
          title="Chia sẻ từ kho cá nhân"
          documents={documents}
          onClose={() => setShareModal(null)}
        />
      )}
      {shareModal === "folder" && (
        <SimpleShareModal
          title="Chia sẻ cả thư mục"
          documents={documents}
          onClose={() => setShareModal(null)}
        />
      )}
      {shareModal === "invite" && (
        <InviteModal groupId={groupId} onClose={() => setShareModal(null)} />
      )}

      {/* Modal Xác nhận xóa thư mục nhóm */}
      {isDeleteFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Xóa thư mục nhóm?
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Bạn có chắc muốn xóa thư mục này khỏi không gian nhóm không?
                </p>
              </div>

              <button
                type="button"
                onClick={handleCancelDeleteFolder}
                disabled={isDeletingFolder}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-sm font-medium text-gray-800">
                  {deletingFolder?.name || "Thư mục"}
                </p>
              </div>

              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                <p className="text-xs leading-5 text-green-700">
                  <span className="font-semibold">Lưu ý:</span> Xóa thư mục sẽ
                  không xóa các tài liệu hoặc nhãn (tag) bên trong. Các tài liệu
                  và tag vẫn được giữ nguyên trong nhóm.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <Button
                variant="outline"
                onClick={handleCancelDeleteFolder}
                disabled={isDeletingFolder}
              >
                Hủy
              </Button>

              <Button
                variant="primary"
                onClick={handleConfirmDeleteFolder}
                disabled={isDeletingFolder}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeletingFolder ? "Đang xóa..." : "Xóa thư mục"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
