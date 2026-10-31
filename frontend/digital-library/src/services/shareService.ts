// src/services/shareService.ts
import api from "@/services/api";
import type { SharedDocument, PaginatedSharedDocuments } from "@/types/document";

export interface ShareDocumentPayload {
  recipient_ids: number[];   // Danh sách user nhận
  message?: string;
}

export interface ShareDocumentResult {
  shared_count: number;
  message?: string;
}

export const shareService = {
  // Chia sẻ tài liệu với người dùng cụ thể
  shareDocument: (documentId: number, payload: ShareDocumentPayload) =>
    api.post<ShareDocumentResult>(`/documents/${documentId}/share`, payload)
      .then((r) => r.data),

  // Lấy danh sách tài liệu được chia sẻ với tôi
  getSharedWithMe: (params?: { page?: number; page_size?: number }) =>
    api.get<PaginatedSharedDocuments>("/documents/shared-with-me", { params })
      .then((r) => r.data),
};
