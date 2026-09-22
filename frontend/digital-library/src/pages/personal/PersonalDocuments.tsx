// src/pages/personal/PersonalDocuments.tsx
import { useEffect } from "react"; 

// Hooks
import { usePersonalFolders } from "./hooks/usePersonalFolders";
import { usePersonalDocuments } from "./hooks/usePersonalDocuments";

// Components
import { DocumentTypeTabs } from "@/components/shared/DocumentTypeTabs";
import { RenameDocumentModal } from "@/components/shared/RenameDocumentModal";
import { CardSkeleton } from "@/components/shared/CardSkeleton";

// Sub-sections & Modals
import { PersonalFoldersSection } from "./components/PersonalFoldersSection";
import { PersonalDocumentsSection } from "./components/PersonalDocumentsSection";
import { PersonalFolderModalContainer } from "./components/PersonalFolderModalContainer";
import { PersonalUploadModal } from "./components/PersonalUploadModal";
import { DeleteFolderConfirmModal } from "./components/DeleteFolderConfirmModal";
import { useHighlightElement } from "@/hooks/useHighlightElement";
import { DocumentFilterBar } from "@/components/shared/DocumentFilterBar";

export function PersonalDocuments() {
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

  // 2. Gọi Hook Documents (Bổ sung lấy các state lọc thời gian)
  const {
    page,
    setPage,
    isUploadOpen,
    setIsUploadOpen,
    isRenameModalOpen,
    setIsRenameModalOpen,
    renamingDoc,
    setRenamingDoc,
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
    filteredDocuments: filteredDocCards,
    filteredFolders,
  } = usePersonalDocuments(selectedFolderId, folders);

  // 3. TỰ ĐỘNG BỎ LỌC NẾU THƯ MỤC ĐANG CHỌN BỊ XÓA KHỎI DANH SÁCH
  useEffect(() => {
    if (
      selectedFolderId !== null &&
      folders &&
      !folders.some((f) => f.id === selectedFolderId)
    ) {
      setSelectedFolderId(null);
    }
  }, [folders, selectedFolderId, setSelectedFolderId]);

  return (
    <div className="flex flex-col gap-6">
      {/* 4. SỬ DỤNG COMPONENT FILTER BAR VỚI ĐẦY ĐỦ BỘ LỌC */}
      <DocumentFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        tags={tags}
        selectedTagId={selectedTagId}
        setSelectedTagId={setSelectedTagId}
        fileTypes={fileTypes}
        selectedFileType={selectedFileType}
        setSelectedFileType={setSelectedFileType}
        // Truyền state lọc thời gian vào Filter Bar
        selectedUploadTime={selectedUploadTime}
        setSelectedUploadTime={setSelectedUploadTime}
        selectedAccessTime={selectedAccessTime}
        setSelectedAccessTime={setSelectedAccessTime}
        onUploadClick={() => setIsUploadOpen(true)}
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
      />

      {/* --- CÁC MODALS --- */}
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