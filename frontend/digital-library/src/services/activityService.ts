// frontend/digital-library/src/services/activityService.ts

import api from '@/services/api';
import type { ActivityListResponse, DocumentStats, MyStats } from '@/types/activity';

export const activityService = {
  getDocumentActivities: (
    documentId: number,
    params?: { page?: number; page_size?: number; action?: string }
  ) =>
    api
      .get<ActivityListResponse>(`/documents/${documentId}/activities`, { params })
      .then((r) => r.data),

  getDocumentStats: (documentId: number) =>
    api
      .get<DocumentStats>(`/documents/${documentId}/stats`)
      .then((r) => r.data),

  getMyStats: (params?: { scope?: 'me' | 'my_documents' }) =>
    api
      .get<MyStats>('/stats/me', { params })
      .then((r) => r.data),

  downloadDocumentFile: async (documentId: number, fileName: string) => {
    const response = await api.get(`/documents/${documentId}/file`, {
      params: { download: true },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
