import { Check, Trash2, CheckCircle, XCircle, Users, FileUp, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Notification } from '@/types/notification'
import { cn } from '@/utils/cn'

interface NotificationCardProps {
  notification: Notification
  onAccept?: (notifId: number) => void
  onReject?: (notifId: number) => void
  onDelete?: (notifId: number) => void
  onMarkAsRead?: (notifId: number) => void
}

const NOTIFICATION_STYLES: Record<string, { bg: string; border: string; icon: React.ReactNode; color: string }> = {
  group_invitation: {
    bg: 'bg-blue-50',
    border: 'border-l-4 border-blue-500',
    icon: <Users className="h-5 w-5 text-blue-600" />,
    color: 'text-blue-600',
  },
  group_update: {
    bg: 'bg-green-50',
    border: 'border-l-4 border-green-500',
    icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    color: 'text-green-600',
  },
  document_shared: {
    bg: 'bg-purple-50',
    border: 'border-l-4 border-purple-500',
    icon: <Share2 className="h-5 w-5 text-purple-600" />,
    color: 'text-purple-600',
  },
  document_uploaded: {
    bg: 'bg-orange-50',
    border: 'border-l-4 border-orange-500',
    icon: <FileUp className="h-5 w-5 text-orange-600" />,
    color: 'text-orange-600',
  },
  member_joined: {
    bg: 'bg-teal-50',
    border: 'border-l-4 border-teal-500',
    icon: <CheckCircle className="h-5 w-5 text-teal-600" />,
    color: 'text-teal-600',
  },
}

export function NotificationCard({
  notification,
  onAccept,
  onReject,
  onDelete,
  onMarkAsRead,
}: NotificationCardProps) {
  const style = NOTIFICATION_STYLES[notification.type] || NOTIFICATION_STYLES.group_update

  const isInvitation = notification.type === 'group_invitation' && notification.invitationStatus === 'pending'
  const isUnread = notification.status === 'unread'

  return (
    <div
      className={cn(
        'rounded-lg p-4 shadow-sm',
        style.bg,
        style.border,
        isUnread ? 'ring-1 ring-gray-300' : ''
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="mt-1 shrink-0">{style.icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={cn('font-semibold text-sm', style.color)}>
            {notification.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          {notification.relatedGroupName && (
            <p className="text-xs text-gray-500 mt-2">
              Nhóm: <span className="font-medium">{notification.relatedGroupName}</span>
            </p>
          )}
          {notification.relatedDocumentName && (
            <p className="text-xs text-gray-500 mt-1">
              Tài liệu: <span className="font-medium">{notification.relatedDocumentName}</span>
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            {new Date(notification.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {isInvitation ? (
            <div className="flex gap-2">
              <button
                onClick={() => onAccept?.(notification.invitationId!)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Chấp nhận
              </button>
              <button
                onClick={() => onReject?.(notification.invitationId!)}
                className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 hover:bg-red-50 rounded-lg transition-colors"
              >
                Từ chối
              </button>
            </div>
          ) : null}

          {isUnread && (
            <button
              onClick={() => onMarkAsRead?.(notification.id)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-white/50 transition-colors"
              title="Đánh dấu là đã đọc"
            >
              <Check className="h-3 w-3" />
            </button>
          )}

          <button
            onClick={() => onDelete?.(notification.id)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-white/50 transition-colors"
            title="Xóa thông báo"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}