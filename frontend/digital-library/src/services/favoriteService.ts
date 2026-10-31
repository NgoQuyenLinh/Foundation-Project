// frontend/digital-library/src/services/favoriteService.ts

import api from "@/services/api";
import type {
  FavoriteDocument,
  FavoriteListParams,
  FavoriteListResponse,
  FavoriteStats,
  FavoriteTagWithCount,
  ReadingStatus,
} from "@/types/document";

export const favoriteService = {
  /** Lấy thống kê số lượng tài liệu theo trạng thái đọc */
  getStats: async (): Promise<FavoriteStats> => {
    const response = await api.get<FavoriteStats>("/favorites/stats");
    return response.data;
  },

  /** Lấy danh sách ID các tài liệu đã yêu thích */
  getFavoriteIds: async (): Promise<number[]> => {
    const response = await api.get<number[]>("/favorites/ids");
    return response.data;
  },

  /** Lấy danh sách thẻ cá nhân & gợi ý tag */
  getTags: async (q?: string): Promise<FavoriteTagWithCount[]> => {
    const response = await api.get<FavoriteTagWithCount[]>("/favorites/tags", {
      params: q ? { q } : undefined,
    });
    return response.data;
  },

  /** Lấy danh sách yêu thích có phân trang, lọc và sắp xếp */
  listFavorites: async (params?: FavoriteListParams): Promise<FavoriteListResponse> => {
    // Chuyển array tag_ids thành query params dạng lặp tag_ids=1&tag_ids=2 để FastAPI parse list[int]
    const response = await api.get<FavoriteListResponse>("/favorites/", {
      params,
      paramsSerializer: {
        indexes: null, // tag_ids=1&tag_ids=2
      },
    });
    return response.data;
  },

  /** Thêm tài liệu vào danh sách yêu thích */
  addFavorite: async (payload: {
    document_id: number;
    reading_status?: ReadingStatus;
    notes?: string;
    tag_ids?: number[];
  }): Promise<FavoriteDocument> => {
    const response = await api.post<FavoriteDocument>("/favorites/", payload);
    return response.data;
  },

  /** Cập nhật trạng thái đọc, ghi chú hoặc danh sách thẻ */
  updateFavorite: async (
    documentId: number,
    payload: {
      reading_status?: ReadingStatus;
      notes?: string | null;
      tag_ids?: number[];
    }
  ): Promise<FavoriteDocument> => {
    const response = await api.patch<FavoriteDocument>(`/favorites/${documentId}`, payload);
    return response.data;
  },

  /** Xóa tài liệu khỏi danh sách yêu thích */
  removeFavorite: async (documentId: number): Promise<void> => {
    await api.delete(`/favorites/${documentId}`);
  },

  /** Gắn thẻ vào tài liệu yêu thích */
  addTag: async (
    documentId: number,
    payload: { tag_id?: number; name?: string }
  ): Promise<FavoriteDocument> => {
    const response = await api.post<FavoriteDocument>(`/favorites/${documentId}/tags`, payload);
    return response.data;
  },

  /** Gỡ thẻ khỏi tài liệu yêu thích */
  removeTag: async (documentId: number, tagId: number): Promise<void> => {
    await api.delete(`/favorites/${documentId}/tags/${tagId}`);
  },
};
