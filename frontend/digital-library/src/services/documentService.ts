// frontend/digital-library/src/services/documentService.ts

import api from '@/services/api'
import type { PaginatedDocuments, Document } from '@/types/document'

export const createDocumentService = (getBaseUrl: (groupId?: number | string) => string) => ({
  getAll: (params?: {
    folder_id?: number
    page?: number
    page_size?: number
  }, groupId?: number | string) =>
    api.get<PaginatedDocuments>(`${getBaseUrl(groupId)}/`, { params })
      .then(r => r.data),

  getFileTypes: async (groupId?: number | string): Promise<string[]> => {
    const response = await api.get<string[]>(`${getBaseUrl(groupId)}/file-types`)
    return response.data
  },

  getById: (id: number, groupId?: number | string) =>
    api.get<Document>(`${getBaseUrl(groupId)}/${id}`)
      .then(r => r.data),

  upload: (formData: FormData, groupId?: number | string) =>
    api.post<Document>(`${getBaseUrl(groupId)}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(r => r.data),

  uploadBatch: (formData: FormData, groupId?: number | string) =>
    api.post<Document>(`${getBaseUrl(groupId)}/upload-batch`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(r => r.data),

  getBundleChildren: (bundleId: number, groupId?: number | string) =>
    api.get<Document[]>(`${getBaseUrl(groupId)}/${bundleId}/children`).then(r => r.data),

  /** Phase 4.1 — Thêm file mới vào bundle */
  addFilesToBundle: (bundleId: number, formData: FormData, groupId?: number | string) =>
    api.post<Document[]>(`${getBaseUrl(groupId)}/${bundleId}/add-files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data),

  /** Phase 4.1b — Gán tài liệu cá nhân sẵn có vào bundle */
  addFromPersonal: (bundleId: number, documentIds: number[]) =>
    api.post<{ added_count: number }>(`/documents/${bundleId}/add-from-personal`, {
      document_ids: documentIds,
    }).then(r => r.data),

  /** Phase 5 — Tải bundle dưới dạng ZIP */
  downloadZip: (bundleId: number) => {
    const url = `${api.defaults.baseURL ?? ''}/documents/${bundleId}/download-zip`
    window.open(url, '_blank')
  },

  /** Phase 6 — Tách tài liệu khỏi bundle (giữ lại trong kho cá nhân) */
  removeFromBundle: (docId: number) =>
    api.post<{ success: boolean }>(`/documents/${docId}/remove-from-bundle`).then(r => r.data),

  update: (id: number, payload: Partial<Document>, groupId?: number | string) =>
    api.patch<Document>(
      `${getBaseUrl(groupId)}/${id}`,
      payload
    ).then(r => r.data),

  updateTags: (
    documentId: number,
    tagIds: number[],
    groupId?: number | string
  ) =>
    api.patch<Document>(
      `${getBaseUrl(groupId)}/${documentId}/tags`,
      {
        tag_ids: tagIds,
      }
    ).then(r => r.data),

  // XÓA MỘT TAG KHỎI DOCUMENT
  removeTag: (
    documentId: number,
    tagId: number,
    groupId?: number | string
  ) =>
    api.delete<Document>(
      `${getBaseUrl(groupId)}/${documentId}/tags/${tagId}`
    ).then(r => r.data),

  delete: (id: number, groupId?: number | string) =>
    api.delete(`${getBaseUrl(groupId)}/${id}`),
})

export const documentService = createDocumentService(() => '/documents')

export const groupDocumentService = {
  ...createDocumentService((groupId) => `/groups/${groupId}/documents`),
  saveToPersonal: (groupId: number | string, documentId: number) =>
    api.post(`/groups/${groupId}/documents/${documentId}/save-to-personal`).then(r => r.data),
  attachTag: (groupId: number | string, documentId: number, tagId: number) =>
    api.post(`/groups/${groupId}/documents/${documentId}/tags`, { tag_id: tagId }).then(r => r.data),
  detachTag: (groupId: number | string, documentId: number, tagId: number) =>
    api.delete(`/groups/${groupId}/documents/${documentId}/tags/${tagId}`).then(r => r.data),
}
