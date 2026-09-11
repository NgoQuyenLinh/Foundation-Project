export type NotificationType = 
  | 'group_invitation'
  | 'group_update'
  | 'document_shared'
  | 'document_uploaded'
  | 'member_joined'

export interface Notification {
  id: number
  type: NotificationType
  title: string
  message: string
  relatedGroupId?: number
  relatedGroupName?: string
  relatedDocumentId?: number
  relatedDocumentName?: string
  relatedUserId?: number
  relatedUserName?: string
  actionUrl?: string
  status: 'unread' | 'read'
  createdAt: string
  
  // Cho invitation cụ thể
  invitationId?: number
  invitationStatus?: 'pending' | 'accepted' | 'rejected'
}