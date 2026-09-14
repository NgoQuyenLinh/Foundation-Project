// src/pages/personal/PersonalDocuments.tsx
import { useEffect } from "react"; // 1. Bổ sung import useEffect
import { Search, Upload } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// Hooks
import { usePersonalFolders } from "./hooks/usePersonalFolders";
import { usePersonalDocuments } from "./hooks/usePersonalDocuments";

// Components
import { DynamicFilterDropdown } from "@/components/shared/DynamicFilterDropdown";
import { DocumentTypeTabs } from "@/components/shared/DocumentTypeTabs";
import { RenameDocumentModal } from "@/components/shared/RenameDocumentModal";
import { CardSkeleton } from "@/components/shared/CardSkeleton";
import { getNormalizedExtension } from "@/hooks/useDocumentFilters";

// Sub-sections & Modals
import { PersonalFoldersSection } from "./components/PersonalFoldersSection";
import { PersonalDocumentsSection } from "./components/PersonalDocumentsSection";
import { PersonalFolderModalContainer } from "./components/PersonalFolderModalContainer";
import { PersonalUploadModal } from "./components/PersonalUploadModal";
import { DeleteFolderConfirmModal } from "./components/DeleteFolderConfirmModal";
import { useHighlightElement } from "@/hooks/useHighlightElement";

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


  // 2. Gọi Hook Documents (Truyền selectedFolderId vào)
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
    filteredDocuments: filteredDocCards,
  } = usePersonalDocuments(selectedFolderId, folders);

  // 2. TỰ ĐỘNG BỎ LỌC NẾU THƯ MỤC ĐANG CHỌN BỊ XÓA KHỎI DANH SÁCH
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
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1">
          <Input
            placeholder="Tìm tài liệu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DynamicFilterDropdown
            label="Nhãn dán"
            options={tags.map((t) => ({ value: t.id, label: t.name }))}
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
        <div className="ml-auto">
          <Button
            variant="primary"
            icon={<Upload className="h-4 w-4" />}
            onClick={() => setIsUploadOpen(true)}
          >
            + Tải lên
          </Button>
        </div>
      </div>

      <DocumentTypeTabs activeTab={activeTab} onChangeTab={setActiveTab} />

      <PersonalFoldersSection
        folders={folders}
        foldersLoading={foldersLoading}
        selectedFolderId={selectedFolderId}
        /* 3. TỐI ƯU TOGGLE CHỌN / BỎ CHỌN THƯ MỤC */
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
          /* 4. RESET BỎ LỌC NGAY KHI XÁC NHẬN XÓA THƯ MỤC ĐANG CHỌN */
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