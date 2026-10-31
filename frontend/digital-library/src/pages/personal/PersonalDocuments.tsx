// src/pages/personal/PersonalDocuments.tsx
import { useEffect } from "react"; 
import { useQueryClient } from "@tanstack/react-query";

// Hooks
import { usePersonalFolders } from "./hooks/usePersonalFolders";
import { usePersonalDocuments } from "./hooks/usePersonalDocuments";
import { useTagManagement } from "@/hooks/useTagManagement";
import { useHighlightElement } from "@/hooks/useHighlightElement";

// Components
import { DocumentTypeTabs } from "@/components/shared/documents/DocumentTypeTabs";
import { RenameDocumentModal } from "@/components/shared/modals/RenameDocumentModal";
import { ContributeModal } from "@/components/shared/modals/ContributeModal";
import { CardSkeleton } from "@/components/shared/feedback/CardSkeleton";
import { DocumentFilterBar } from "@/components/shared/documents/DocumentFilterBar";
import { ManageTagsModal } from "@/components/shared/modals/ManageTagsModal";

// Sub-sections & Modals
import { PersonalFoldersSection } from "./components/PersonalFoldersSection";
import { PersonalDocumentsSection } from "./components/PersonalDocumentsSection";
import { PersonalFolderModalContainer } from "./components/PersonalFolderModalContainer";
import { PersonalUploadModal } from "./components/PersonalUploadModal";
import { DeleteFolderConfirmModal } from "./components/DeleteFolderConfirmModal";

export function PersonalDocuments() {
  const queryClient = useQueryClient();

  // 1. Gọi Hook Folders
  const {
    folders,
    foldersLoading,
    selectedFolderId,
    setSelectedFolderId,
    tags,
    createTagMutation,
    isModalOpen,
    setIsModalOpen,
    editingFolder,
    setEditingFolder,
    isDeleteFolderOpen,
    setIsDeleteFolderOpen,
    deletingFolder,
    deletingFolderId,
    setDeletingFolderId,
    createFolderMutation,
    updateFolderMutation,
    deleteFolderMutation,
    handleFolderAction,
  } = usePersonalFolders();

  useHighlightElement("highlight_doc");

  // 2. Hook Quản lý Tags (Đồng bộ danh sách tag & Modal quản lý)
  const {
    isManageModalOpen,
    openManageModal,
    closeManageModal,
    handleCreateTag,
    handleEditTag,
    handleDeleteTag,
  } = useTagManagement({
    initialTags: tags,
    onTagsChange: () => {
      // Làm mới dữ liệu tag trên toàn bộ ứng dụng qua React Query
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  // 3. Gọi Hook Documents
  const {
    page,
    setPage,
    isUploadOpen,
    setIsUploadOpen,
    isRenameModalOpen,
    setIsRenameModalOpen,
    renamingDoc,
    isContributeModalOpen,
    setIsContributeModalOpen,
    contributeDoc,
    setContributeDoc,
    fileTypes,
    docData,
    docsLoading,
    isFetching,
    renameDocumentMutation,
    uploadMutation,
    handleDocumentAction,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedTagId,
    setSelectedTagId,
    selectedFileType,
    setSelectedFileType,
    selectedUploadTime,
    setSelectedUploadTime,
    selectedAccessTime,
    setSelectedAccessTime,
    selectedSort,
    setSelectedSort,
    filteredDocuments: filteredDocCards,
    filteredFolders,
  } = usePersonalDocuments(selectedFolderId, folders);

  // 4. TỰ ĐỘNG BỎ LỌC NẾU THƯ MỤC ĐANG CHỌN BỊ XÓA KHỎI DANH SÁCH
  useEffect(() => {
    if (
      selectedFolderId !== null &&
      folders &&
      !folders.some((f) => f.id === selectedFolderId)
    ) {
      setSelectedFolderId(null);
    }
  }, [folders, selectedFolderId, setSelectedFolderId]);

  const isFilterActive =
    !!searchQuery.trim() ||
    selectedTagId !== null ||
    selectedFileType !== null ||
    activeTab !== "all";

  return (
    <div className="flex flex-col gap-6">
      {/* 5. SỬ DỤNG COMPONENT FILTER BAR VỚI ĐẦY ĐỦ BỘ LỌC + QUẢN LÝ TAG */}
      <DocumentFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        tags={tags}
        selectedTagId={selectedTagId}
        setSelectedTagId={setSelectedTagId}
        fileTypes={fileTypes}
        selectedFileType={selectedFileType}
        setSelectedFileType={setSelectedFileType}
        selectedUploadTime={selectedUploadTime}
        setSelectedUploadTime={setSelectedUploadTime}
        selectedAccessTime={selectedAccessTime}
        setSelectedAccessTime={setSelectedAccessTime}
        selectedSort={selectedSort}
        setSelectedSort={setSelectedSort}
        onUploadClick={() => setIsUploadOpen(true)}
        onManageTags={openManageModal}
      />

      <DocumentTypeTabs activeTab={activeTab} onChangeTab={setActiveTab} />

      <PersonalFoldersSection
        folders={filteredFolders}
        foldersLoading={foldersLoading}
        selectedFolderId={selectedFolderId}
        onSelectFolder={(id) => {
          setSelectedFolderId((prevId) => (prevId === id ? null : id));
          setPage(1);
        }}
        onFolderAction={handleFolderAction}
        onOpenCreateModal={() => {
          setEditingFolder(null);
          setIsModalOpen(true);
        }}
        CardSkeleton={CardSkeleton}
      />

      <PersonalDocumentsSection
        docsLoading={docsLoading}
        isFetching={isFetching}
        filteredDocCards={filteredDocCards}
        docData={docData}
        page={page}
        setPage={setPage}
        onDocumentAction={handleDocumentAction}
        onOpenUploadModal={() => setIsUploadOpen(true)}
        CardSkeleton={CardSkeleton}
        isFilterActive={isFilterActive}
        searchQuery={searchQuery}
        selectedTagId={selectedTagId}
      />

      {/* --- CÁC MODALS --- */}
      <ManageTagsModal
        isOpen={isManageModalOpen}
        onClose={closeManageModal}
        tags={tags}
        onCreateTag={handleCreateTag}
        onEditTag={handleEditTag}
        onDeleteTag={handleDeleteTag}
      />

      <PersonalFolderModalContainer
        isOpen={isModalOpen}
        editingFolder={editingFolder}
        tags={tags}
        isSubmitting={
          createFolderMutation.isPending || updateFolderMutation.isPending
        }
        onClose={() => {
          setIsModalOpen(false);
          setEditingFolder(null);
        }}
        onCreateTag={(name) => createTagMutation.mutateAsync(name)}
        onSubmitData={async (data) => {
          if (data.id) {
            await updateFolderMutation.mutateAsync({
              id: data.id,
              name: data.name,
              color: data.color,
              tagIds: data.tagIds,
              initialTagIds: (editingFolder?.tagIds || []).map(Number),
            });
          } else {
            await createFolderMutation.mutateAsync({
              name: data.name,
              color: data.color,
              tagIds: data.tagIds,
            });
          }
          setIsModalOpen(false);
          setEditingFolder(null);
        }}
      />

      <RenameDocumentModal
        isOpen={isRenameModalOpen && !!renamingDoc}
        initialTitle={renamingDoc?.title || ""}
        isPending={renameDocumentMutation.isPending}
        onClose={() => setIsRenameModalOpen(false)}
        onConfirm={(newTitle: string) => {
          if (renamingDoc) {
            renameDocumentMutation.mutate({
              id: renamingDoc.id,
              title: newTitle,
            });
          }
        }}
      />

      {isUploadOpen && (
        <PersonalUploadModal
          onClose={() => setIsUploadOpen(false)}
          tags={tags}
          createTagMutation={createTagMutation}
          uploadMutation={uploadMutation}
        />
      )}

      {isContributeModalOpen && contributeDoc && (
        <ContributeModal
          documentId={contributeDoc.id}
          documentTitle={contributeDoc.title}
          onClose={() => {
            setIsContributeModalOpen(false);
            setContributeDoc(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
          }}
        />
      )}

      {isDeleteFolderOpen && (
        <DeleteFolderConfirmModal
          folderName={deletingFolder?.name}
          isDeleting={deleteFolderMutation.isPending}
          onCancel={() => {
            setIsDeleteFolderOpen(false);
            setDeletingFolderId(null);
          }}
          onConfirm={() => {
            if (deletingFolderId) {
              if (deletingFolderId === selectedFolderId) {
                setSelectedFolderId(null);
              }
              deleteFolderMutation.mutate(deletingFolderId);
            }
          }}
        />
      )}
    </div>
  );
}