// src/pages/group/components/GroupFolderModalContainer.tsx
import { CreateFolderModal, type FolderInitialData } from "@/pages/personal/components/CreateFolderModal";

interface GroupFolderModalContainerProps {
  isOpen: boolean;
  groupId: number;
  editingFolder: FolderInitialData | null;
  groupTags: any[];
  onClose: () => void;
  onCreateTag: (name: string) => Promise<any>;
  onSubmitData: (data: { name: string; color: string; tagIds: number[] }) => Promise<void>;
}

export function GroupFolderModalContainer({
  isOpen,
  editingFolder,
  groupTags,
  onClose,
  onCreateTag,
  onSubmitData,
}: GroupFolderModalContainerProps) {
  if (!isOpen) return null;

  return (
    <CreateFolderModal
      onClose={onClose}
      initialData={editingFolder}
      availableTags={groupTags}
      onCreateTag={onCreateTag}
      onSubmitData={onSubmitData}
      isSubmitting={false}
    />
  );
}