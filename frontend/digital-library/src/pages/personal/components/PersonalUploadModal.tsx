// frontend/digital-library/src/pages/personal/components/PersonalUploadModal.tsx

import { UploadModal } from "@/components/shared/modals/UploadModal"
import { documentService } from "@/services/documentService"

interface PersonalUploadModalProps {
  onClose: () => void
  tags?: Array<{ id: number; name: string }>
  createTagMutation: { mutateAsync: (name: string) => Promise<any> }
  uploadMutation: { mutateAsync: (fd: FormData) => Promise<any>; isPending: boolean }
}

export function PersonalUploadModal({
  onClose,
  tags = [],
  createTagMutation,
  uploadMutation,
}: PersonalUploadModalProps) {
  const handleUpload = async (formData: FormData, selectedTagIds: number[]) => {
    if (selectedTagIds.length > 0) {
      selectedTagIds.forEach((id) => {
        formData.append("tag_ids", id.toString())
      })
    }
    const res = await uploadMutation.mutateAsync(formData)
    const thumbnailPath = formData.get("thumbnail_path") as string | null
    if (res?.id && thumbnailPath && !res.thumbnail_path) {
      try {
        await documentService.update(res.id, { thumbnail_path: thumbnailPath })
      } catch (err) {
        console.warn("Lỗi cập nhật ảnh bìa DOCX:", err)
      }
    }
    onClose()
  }

  return (
    <UploadModal
      onClose={onClose}
      availableTags={tags}
      onCreateTag={async (name) => {
        return await createTagMutation.mutateAsync(name)
      }}
      onUpload={handleUpload}
      isUploading={uploadMutation.isPending}
    />
  )
}