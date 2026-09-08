// src/pages/group/components/GroupUploadModal.tsx

import { UploadModal, type TagItem } from "@/components/shared/UploadModal";

interface GroupUploadModalProps {
  onClose: () => void;
  tags?: any[];
  createTagMutation: { mutateAsync: (name: string) => Promise<any> };
  uploadMutation: { mutateAsync: (fd: FormData) => Promise<any>; isPending: boolean };
}

export function GroupUploadModal({
  onClose,
  tags = [],
  createTagMutation,
  uploadMutation,
}: GroupUploadModalProps) {
  // Chuẩn hóa ID của Tag: Ưu tiên tag_id (ID gốc trong DB) rồi mới tới id
  const normalizedTags: TagItem[] = tags.map((t: any) => ({
    id: t.tag_id ?? t.id,
    name: t.name,
    color: t.color,
  }));

  const handleUpload = async (formData: FormData, selectedTagIds: number[]) => {
    if (selectedTagIds.length > 0) {
      selectedTagIds.forEach((id) => {
        formData.append("tag_ids", id.toString());
      });
    }

    await uploadMutation.mutateAsync(formData);
    onClose();
  };

  return (
    <UploadModal
      onClose={onClose}
      availableTags={normalizedTags}
      onCreateTag={async (name) => {
        const newTag = await createTagMutation.mutateAsync(name);
        return {
          id: newTag.tag_id ?? newTag.id,
          name: newTag.name,
          color: newTag.color,
        };
      }}
      onUpload={handleUpload}
      isUploading={uploadMutation.isPending}
    />
  );
}