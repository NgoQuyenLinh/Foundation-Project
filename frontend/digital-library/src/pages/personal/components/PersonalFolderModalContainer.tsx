// src/pages/personal/components/PersonalFolderModalContainer.tsx
import { CreateFolderModal, type FolderInitialData } from "@/components/shared/CreateFolderModal";

interface PersonalFolderModalContainerProps {
  isOpen: boolean;
  editingFolder: FolderInitialData | null;
  tags: any[];
  isSubmitting: boolean;
  onClose: () => void;
  onCreateTag: (name: string) => Promise<any>;
  onSubmitData: (data: { id?: number; name: string; color: string; tagIds: number[] }) => Promise<void>;
}

export function PersonalFolderModalContainer({
  isOpen,
  editingFolder,
  tags,
  isSubmitting,
  onClose,
  onCreateTag,
  onSubmitData,
}: PersonalFolderModalContainerProps) {
  if (!isOpen) return null;

  return (
    <CreateFolderModal
      onClose={onClose}
      initialData={editingFolder}
      availableTags={tags}
      onCreateTag={onCreateTag}
      onSubmitData={onSubmitData}
      isSubmitting={isSubmitting}
    />
  );
}