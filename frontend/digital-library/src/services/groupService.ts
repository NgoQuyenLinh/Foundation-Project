// frontend/digital-library/src/services/groupService.ts

import api from "@/services/api";
import type { Document, Folder, PaginatedDocuments } from "@/types/document";
import type {
  GroupListItem,
  PermissionLevel,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
} from "@/types/group";

export interface BulkInvitePayload {
  identifiers: string[];
  class_ids: number[];
  faculty_ids: number[];
  student_code_patterns: string[];
  message: string;
}

export const groupService = {
  getAll: () => api.get<GroupListItem[]>("/groups/").then((r) => r.data),

  create: (payload: {
    name: string;
    description?: string;
    default_member_permission: PermissionLevel;
  }) => api.post<Workspace>("/groups/", payload).then((r) => r.data),

  getById: (id: number) => api.get<Workspace>(`/groups/${id}`).then((r) => r.data),

  update: (id: number, payload: { name?: string; description?: string }) =>
    api.patch<Workspace>(`/groups/${id}`, payload).then((r) => r.data),

  dissolve: (id: number) => api.delete(`/groups/${id}`),

  getDocuments: (id: number, params?: { page?: number; folder_id?: number }) =>
    api.get<PaginatedDocuments>(`/groups/${id}/documents/`, { params }).then((r) => r.data),

  uploadDocument: (id: number, formData: FormData) =>
    api.post<Document>(`/groups/${id}/documents/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),

  shareDocuments: (id: number, documentIds: number[]) =>
    api.post(`/groups/${id}/share/documents`, { document_ids: documentIds }).then((r) => r.data),

  shareFolder: (id: number, folderId: number) =>
    api.post(`/groups/${id}/share/folder`, { folder_id: folderId }).then((r) => r.data),

  saveToPersonal: (groupId: number, docId: number) =>
    api.post<Document>(`/groups/${groupId}/documents/${docId}/save-to-personal`).then((r) => r.data),

  deleteDocument: (groupId: number, docId: number) =>
    api.delete(`/groups/${groupId}/documents/${docId}`),

  getMembers: (id: number) =>
    api.get<WorkspaceMember[]>(`/groups/${id}/members/`).then((r) => r.data),

  updateMemberPermission: (groupId: number, userId: number, permission: PermissionLevel) =>
    api.patch(`/groups/${groupId}/members/${userId}`, { permission_level: permission }),

  removeMember: (groupId: number, userId: number) =>
    api.delete(`/groups/${groupId}/members/${userId}`),

  transferOwner: (groupId: number, newOwnerId: number) =>
    api.post(`/groups/${groupId}/members/transfer-owner`, { new_owner_id: newOwnerId }),

  leave: (groupId: number) => api.post(`/groups/${groupId}/leave`),

  invite: (groupId: number, payload: { identifier: string; message?: string }) =>
    api.post(`/groups/${groupId}/invitations/`, payload).then((r) => r.data),

  inviteBulk: (groupId: number, payload: BulkInvitePayload) =>
    api.post(`/groups/${groupId}/invitations/`, payload).then((r) => r.data),

  getInvitationsSent: (groupId: number) =>
    api.get<WorkspaceInvitation[]>(`/groups/${groupId}/invitations/`).then((r) => r.data),

  cancelInvitation: (groupId: number, invId: number) =>
    api.delete(`/groups/${groupId}/invitations/${invId}`),

  getMyInvitations: () =>
    api.get<WorkspaceInvitation[]>("/invitations/").then((r) => r.data),

  acceptInvitation: (id: number) => api.post(`/invitations/${id}/accept`),

  rejectInvitation: (id: number) => api.post(`/invitations/${id}/reject`),

  getFolders: (groupId: number) =>
    api.get<Folder[]>(`/groups/${groupId}/folders/`).then((r) => r.data),

  createFolder: (groupId: number, payload: { name: string; color?: string; tag_ids?: number[] }) =>
    api.post<Folder>(`/groups/${groupId}/folders/`, payload).then((r) => r.data),

  getTrash: (groupId: number) =>
    api.get<Document[]>(`/groups/${groupId}/trash/`).then((r) => r.data),

  restoreFromTrash: (groupId: number, docId: number) =>
    api.post(`/groups/${groupId}/trash/${docId}/restore`),

  addTagsToGroup: (groupId: number, tagIds: number[]) =>
    api.post(`/workspaces/${groupId}/tags/bulk`, { tag_ids: tagIds }).then(r => r.data),

  // Lấy chi tiết 1 tài liệu trong nhóm
  getDocumentById: (groupId: number, docId: number) =>
    api.get<Document>(`/groups/${groupId}/documents/${docId}`).then((r) => r.data),

  // Cập nhật thông tin/đổi tên tài liệu nhóm
  updateDocument: (groupId: number, docId: number, payload: { title: string }) =>
    api.patch<Document>(`/groups/${groupId}/documents/${docId}`, payload).then((r) => r.data),

  // Cập nhật danh sách tags cho tài liệu nhóm
  updateTags: (groupId: number, docId: number, tagIds: number[]) =>
    api.patch<Document>(`/groups/${groupId}/documents/${docId}/tags`, { tag_ids: tagIds }).then((r) => r.data),

  // Xóa 1 tag khỏi tài liệu nhóm
  removeTag: (groupId: number, docId: number, tagId: number) =>
    api.delete<Document>(`/groups/${groupId}/documents/${docId}/tags/${tagId}`).then((r) => r.data),

  async getWorkspaceTags(groupId: number | string): Promise<any[]> {
    // Sửa '/workspaces/' thành '/groups/' để lấy trực tiếp bảng Tag
    const response = await api.get(`/groups/${groupId}/tags/`);
    return response.data;
  }
};
