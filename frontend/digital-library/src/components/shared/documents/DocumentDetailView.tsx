// src/components/shared/documents/DocumentDetailView.tsx

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Heart, Download, Sparkles, Files, Calendar, HardDrive } from 'lucide-react'
import { FileIcon } from './FileIcon'
import { DocumentContextMenu, type DocumentAction } from './DocumentContextMenu'
import { GroupDocumentContextMenu } from '@/pages/group/components/shared/GroupDocumentContextMenu'
import { extractSummary } from '@/utils/textUtils'
import { cn } from '@/utils/cn'
import { getThumbnailUrl } from '@/utils/getThumbnailUrl'
import { getActivityHeat } from '@/utils/activityHeat'
import {
  type BaseDocumentViewProps,
  type DocumentListItem,
  getFileExtension,
  FILE_TYPE_THEMES,
  DEFAULT_THEME,
  safeFormatDate,
  safeFormatSize,
} from './documentView.types'

export interface DocumentDetailViewProps extends BaseDocumentViewProps {}

export function DocumentDetailView({
  documents,
  isLoading = false,
  onAction,
  navigationPath,
  showOwner = false,
  workspaceType = 'personal',
  permission = 'view',
  extraItems,
}: DocumentDetailViewProps) {
  const navigate = useNavigate()
  const [imageErrors, setImageErrors] = useState<Record<string | number, boolean>>({})

  const handleRowClick = (doc: DocumentListItem) => {
    // ƯU TIÊN 1: Gọi navigationPath (Group, Class, Faculty sẽ truyền cái này)
    if (navigationPath) {
      navigate(navigationPath(doc.id))
      return; 
    } 
    
    // NẾU KHÔNG TRUYỀN (Mặc định cho Kho Cá Nhân)
    if (doc.is_bundle) {
      navigate(`/personal/bundle/${doc.id}`)
    } else {
      navigate(`/personal/documents/${doc.id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-5 p-5 rounded-xl border border-gray-200 bg-white shadow-sm animate-pulse">
            <div className="h-32 w-28 rounded-lg bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-start">
                 <div className="h-5 bg-gray-200 rounded w-1/3" />
                 <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
              <div className="flex gap-2">
                 <div className="h-4 bg-gray-100 rounded w-12" />
                 <div className="h-4 bg-gray-100 rounded w-16" />
              </div>
              <div className="space-y-2 mt-4">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-4/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/50">
        <div className="p-4 bg-white rounded-full shadow-sm">
           <FileIcon type="default" className="h-10 w-10 text-gray-300" />
        </div>
        <div className="text-center">
           <p className="text-base text-gray-700 font-medium">Chưa có tài liệu nào</p>
           <p className="text-sm text-gray-400 mt-1">Tài liệu bạn tải lên sẽ xuất hiện ở đây.</p>
        </div>
      </div>
    )
  }

  return (
    // Đổi sang layout flex-col gap-4 thay vì divide-y để tạo các thẻ tách rời, giống ảnh 2 (Paperless-ngx)
    <div className="flex flex-col gap-4">
      {documents.map((doc) => {
        const displaySize = safeFormatSize(doc.size)
        const displayDate = safeFormatDate(doc.updatedAt)
        const ownerName = doc.owner?.full_name || doc.owner?.username
        const ownerAvatar = doc.owner?.avatar_url || doc.owner?.avatar

        const ext = getFileExtension(doc.extension || doc.type?.toString())
        const theme = FILE_TYPE_THEMES[ext] || DEFAULT_THEME
        const thumbnailUrl = !imageErrors[doc.id]
          ? getThumbnailUrl(doc.thumbnail_path)
          : null

        const viewCount = (doc as any).personal_view_count ?? (doc as any).view_count ?? 0
        const heat = getActivityHeat(viewCount)
        
        // Lấy số trang từ doc.pages hoặc doc.page_count
        const pageCount = doc.pages ?? (doc as any).page_count ?? null;

        return (
          <div
            key={doc.id}
            onClick={() => handleRowClick(doc)}
            className={cn(
              "group relative flex flex-col sm:flex-row items-start gap-5 p-4 sm:p-5 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md",
              heat.level > 0 
                ? `${heat.cardBg} border-gray-200 hover:border-blue-200` 
                : "bg-white border-gray-200 hover:border-gray-300"
            )}
          >
            {/* Hình thu nhỏ lớn hơn */}
            <div
              className={cn(
                'relative shrink-0 h-36 w-28 sm:h-40 sm:w-32 rounded-lg border border-gray-200/80 overflow-hidden flex items-center justify-center transition-transform duration-300 group-hover:shadow-sm',
                theme.bg
              )}
            >
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={doc.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={() =>
                    setImageErrors((prev) => ({ ...prev, [doc.id]: true }))
                  }
                />
              ) : (
                <FileIcon
                  type={doc.type || 'default'}
                  className="h-10 w-10 sm:h-12 sm:w-12 text-gray-500 opacity-80"
                />
              )}
              {/* Badge định dạng file */}
              <span
                className={cn(
                  'absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md',
                  theme.badgeBg,
                  theme.badgeText
                )}
              >
                {ext || 'FILE'}
              </span>
            </div>

            {/* Nội dung chính */}
            <div className="flex-1 min-w-0 flex flex-col h-full justify-between w-full">
              
              <div className="space-y-2">
                {/* Tiêu đề & Các Badge Trạng thái */}
                <div className="flex items-start justify-between gap-4">
                  <h3
                    className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-1 sm:line-clamp-2 leading-tight"
                    title={doc.title}
                  >
                    {doc.title}
                  </h3>
                  
                  {/* Context Menu ở góc trên phải */}
                  <div 
                    className="shrink-0 flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                     {workspaceType === 'group' ? (
                      <GroupDocumentContextMenu
                        permission={permission}
                        markdownPath={doc.markdown_path}
                        onAction={(action) => onAction?.(action, doc.id)}
                      />
                    ) : (
                      <DocumentContextMenu
                        markdownPath={doc.markdown_path}
                        onAction={(action: DocumentAction) => onAction?.(action, doc.id)}
                        extraItems={extraItems}
                      />
                    )}
                  </div>
                </div>

                {/* Tags & Độ HOT */}
                <div className="flex flex-wrap items-center gap-2">
                  {heat.badgeText && (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border",
                        heat.badgeClass,
                        "border-current/20"
                      )}
                    >
                      {heat.badgeText}
                    </span>
                  )}
                  
                  {doc.tags && doc.tags.length > 0 && (
                    <>
                      <div className="h-3.5 w-px bg-gray-200 hidden sm:block"></div>
                      <div className="flex gap-1.5 flex-wrap">
                        {doc.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center text-[11px] font-medium bg-gray-100/80 text-gray-700 px-2 py-0.5 rounded-md hover:bg-gray-200 transition-colors"
                          >
                            {tag.name}
                          </span>
                        ))}
                        {doc.tags.length > 4 && (
                          <span className="inline-flex items-center text-[11px] font-medium text-gray-500 px-1 py-0.5">
                            +{doc.tags.length - 4}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Trích xuất Nội dung (Tăng lên 4-5 dòng) */}
                <div className="mt-3 bg-gray-50/50 rounded-lg p-3 border border-gray-100/50">
                  <p className="text-sm text-gray-600 line-clamp-4 leading-relaxed font-normal">
                    {extractSummary(doc.content, 600) || <span className="italic text-gray-400">Tài liệu không có trích xuất văn bản (OCR/Text).</span>}
                  </p>
                </div>
              </div>

              {/* Thanh công cụ và Meta data bên dưới (Footer của Card) */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100/80">
                
                {/* Nút hành động nhanh (Bên trái) */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      alert('Tính năng AI Tóm tắt đang được phát triển!')
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors border border-blue-100/50"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    Tóm tắt tự động AI
                  </button>
                  
                  <div className="hidden group-hover:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    {onAction && workspaceType === 'personal' && (
                      <button
                        onClick={() => onAction('favorite', doc.id)}
                        className="p-1.5 text-gray-500 hover:text-rose-500 rounded-md hover:bg-rose-50 transition-colors"
                        title="Yêu thích"
                      >
                        <Heart
                          className={cn(
                            'h-4 w-4',
                            doc.isFavorite && 'fill-rose-500 text-rose-500'
                          )}
                        />
                      </button>
                    )}
                    {onAction && (
                      <button
                        onClick={() => onAction('download', doc.id)}
                        className="p-1.5 text-gray-500 hover:text-primary-700 rounded-md hover:bg-primary-50 transition-colors"
                        title="Tải xuống"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Thông tin Meta (Bên phải): Ngày, Dung lượng, Số trang, Owner */}
                <div className="flex flex-wrap items-center sm:justify-end gap-x-4 gap-y-2 text-[11px] sm:text-xs text-gray-500 font-medium">
                  {pageCount && (
                     <div className="flex items-center gap-1.5" title="Số trang">
                        <Files className="h-3.5 w-3.5 text-gray-400" />
                        <span>{pageCount} trang</span>
                     </div>
                  )}
                  
                  <div className="flex items-center gap-1.5" title="Ngày cập nhật">
                     <Calendar className="h-3.5 w-3.5 text-gray-400" />
                     <span>{displayDate}</span>
                  </div>

                  <div className="flex items-center gap-1.5" title="Dung lượng">
                     <HardDrive className="h-3.5 w-3.5 text-gray-400" />
                     <span>{displaySize}</span>
                  </div>

                  {showOwner && (
                    <>
                      <div className="h-3.5 w-px bg-gray-200 hidden sm:block"></div>
                      <div className="flex items-center gap-1.5" title="Chủ sở hữu">
                        {ownerAvatar ? (
                          <img
                            src={ownerAvatar}
                            alt={ownerName}
                            className="h-4 w-4 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <User className="h-3.5 w-3.5 text-gray-400" />
                        )}
                        <span className="truncate max-w-[100px]">
                          {ownerName || 'Thành viên'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        )
      })}
    </div>
  )
}