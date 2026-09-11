import api from '@/services/api'
import type { Notification } from '@/types/notification'

export const notificationService = {
  // Lấy danh sách thông báo của user
  getAll: (params?: { page?: number; page_size?: number }) =>
    api.get<{ items: Notification[]; total: number }>('/notifications/', { params })
      .then(r => r.data),

  // Đánh dấu 1 thông báo là đã đọc
  markAsRead: (notificationId: number) =>
    api.patch(`/notifications/${notificationId}`, { status: 'read' }),

  // Đánh dấu tất cả là đã đọc
  markAllAsRead: () =>
    api.post('/notifications/mark-all-read'),

  // Xóa 1 thông báo
  delete: (notificationId: number) =>
    api.delete(`/notifications/${notificationId}`),

  // Chấp nhận lời mời vào group
  acceptInvitation: (invitationId: number) =>
    api.post(`/invitations/${invitationId}/accept`),

  // Từ chối lời mời
  rejectInvitation: (invitationId: number) =>
    api.post(`/invitations/${invitationId}/reject`),
}