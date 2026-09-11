import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { notificationService } from '@/services/notificationService'
import { NotificationCard } from './NotificationCard'

export function NotificationsTab() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  // Fetch notifications
  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationService.getAll({ page, page_size: 10 }),
  })

  const notifications = notifData?.items || []
  const unreadCount = notifications.filter((n) => n.status === 'unread').length

  // Mark as read
  const markAsReadMutation = useMutation({
    mutationFn: (notifId: number) => notificationService.markAsRead(notifId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // Accept invitation
  const acceptInvitationMutation = useMutation({
    mutationFn: (invitationId: number) => notificationService.acceptInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  // Reject invitation
  const rejectInvitationMutation = useMutation({
    mutationFn: (invitationId: number) => notificationService.rejectInvitation(invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: (notifId: number) => notificationService.delete(notifId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Thông báo
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </h2>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            {markAllAsReadMutation.isPending ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <NotificationCard
              key={notif.id}
              notification={notif}
              onMarkAsRead={(notifId) => markAsReadMutation.mutate(notifId)}
              onAccept={(invitationId) => acceptInvitationMutation.mutate(invitationId)}
              onReject={(invitationId) => rejectInvitationMutation.mutate(invitationId)}
              onDelete={(notifId) => deleteNotificationMutation.mutate(notifId)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Inbox className="h-12 w-12 text-gray-300" />
          <p className="text-gray-500 text-center">Bạn không có thông báo nào</p>
        </div>
      )}

      {/* Pagination */}
      {(notifData?.total || 0) > 10 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            ← Trước
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            Trang {page}
          </span>
          <button
            disabled={(page * 10) >= (notifData?.total || 0)}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  )
}