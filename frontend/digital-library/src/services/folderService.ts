// frontend/digital-library/src/services/folderService.ts
import api from "@/services/api";
import type { Folder } from "@/types/document";

// Helper xác định URL gốc dựa trên việc có truyền groupId hay không
const getFolderBaseUrl = (groupId?: number | string) =>
  groupId ? `/groups/${groupId}/folders` : "/folders";

export const folderService = {
  // ============================================================
  // Lấy danh sách folder
  // ============================================================
  getAll: (groupId?: number | string) =>
    api.get<Folder[]>(`${getFolderBaseUrl(groupId)}/`).then((r) => r.data),

  // ============================================================
  // Tạo folder
  // ============================================================
  create: (
    payload: {
      name: string;
      color?: string;
      tag_ids?: number[];
    },
    groupId?: number | string
  ) =>
    api
      .post<Folder>(`${getFolderBaseUrl(groupId)}/`, payload)
      .then((r) => r.data),

  // ============================================================
  // Lấy chi tiết folder
  // ============================================================
  getById: async (id: number, groupId?: number | string) => {
    const res = await api.get(`${getFolderBaseUrl(groupId)}/${id}`);
    return res.data;
  },

  // ============================================================
  // Cập nhật folder
  // ============================================================
  update: async (
    id: number,
    data: {
      name?: string;
      color?: string;
      tag_ids?: number[];
    },
    groupId?: number | string
  ) => {
    const res = await api.patch(`${getFolderBaseUrl(groupId)}/${id}`, data);
    return res.data;
  },

  // ============================================================
  // Xóa folder
  // ============================================================
  delete: async (id: number, groupId?: number | string) => {
    await api.delete(`${getFolderBaseUrl(groupId)}/${id}`);
  },

  // ============================================================
  // Thêm Tags vào folder
  // ============================================================
  addTags: async (folderId: number, tagIds: number[], groupId?: number | string) => {
    const res = await api.post(
      `${getFolderBaseUrl(groupId)}/${folderId}/tags`,
      {
        tag_ids: tagIds,
      }
    );
    return res.data;
  },

  // Alias để giữ tương thích với code cũ
  attachFolderTag: async (groupId: number | string, folderId: number, tagId: number) => {
    const res = await api.post(
      `${getFolderBaseUrl(groupId)}/${folderId}/tags`,
      {
        tag_ids: [tagId],
      }
    );
    return res.data;
  },

  // ============================================================
  // Xóa Tag khỏi folder
  // ============================================================
  removeTag: async (
    folderId: number,
    tagId: number,
    groupId?: number | string
  ) => {
    const res = await api.delete(
      `${getFolderBaseUrl(groupId)}/${folderId}/tags/${tagId}`
    );
    return res.data;
  },

  // Alias để giữ tương thích với code cũ
  detachFolderTag: async (groupId: number | string, folderId: number, tagId: number) => {
    const res = await api.delete(
      `${getFolderBaseUrl(groupId)}/${folderId}/tags/${tagId}`
    );
    return res.data;
  },
};

// Export thêm alias cho groupFolderService
export const groupFolderService = folderService;