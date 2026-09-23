// src/components/shared/DocumentListView.tsx

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  User,
  Heart,
  Download,
  Package,
} from 'lucide-react'
import { FileIcon, type FileTypeMap } from './FileIcon'
import { DocumentContextMenu, type DocumentAction } from './DocumentContextMenu'
import { GroupDocumentContextMenu } from '@/pages/group/components/GroupDocumentContextMenu'
import { formatSize } from '@/utils/formatSize'
import { formatRelativeDate } from '@/utils/formatDate'
import { cn } from '@/utils/cn'

// ======================================================
// Helpers & File Type Themes (Đồng bộ với DocumentCard)
// ======================================================

const getFileExtension = (type?: string) => {
  if (!type) return ''
  let cleanType = type.toLowerCase().trim()
  if (cleanType.startsWith('.')) cleanType = cleanType.substring(1)

  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'application/x-rar-compressed': 'rar',
  }

  return mimeMap[cleanType] || cleanType.split('/').pop() || cleanType
}

const FILE_TYPE_THEMES: Record<
  string,
  { bg: string; badgeBg: string; badgeText: string; border: string }
> = {
  pdf: {
    bg: 'bg-rose-50/70 hover:bg-rose-50',
    badgeBg: 'bg-rose-100/90',
    badgeText: 'text-rose-700',
    border: 'group-hover:border-rose-200',
  },
  doc: {
    bg: 'bg-blue-50/70 hover:bg-blue-50',
    badgeBg: 'bg-blue-100/90',
    badgeText: 'text-blue-700',
    border: 'group-hover:border-blue-200',
  },
  docx: {
    bg: 'bg-blue-50/70 hover:bg-blue-50',
    badgeBg: 'bg-blue-100/90',
    badgeText: 'text-blue-700',
    border: 'group-hover:border-blue-200',
  },
  xls: {
    bg: 'bg-emerald-50/70 hover:bg-emerald-50',
    badgeBg: 'bg-emerald-100/90',
    badgeText: 'text-emerald-700',
    border: 'group-hover:border-emerald-200',
  },
  xlsx: {
    bg: 'bg-emerald-50/70 hover:bg-emerald-50',
    badgeBg: 'bg-emerald-100/90',
    badgeText: 'text-emerald-700',
    border: 'group-hover:border-emerald-200',
  },
  ppt: {
    bg: 'bg-amber-50/70 hover:bg-amber-50',
    badgeBg: 'bg-amber-100/90',
    badgeText: 'text-amber-700',
    border: 'group-hover:border-amber-200',
  },
  pptx: {
    bg: 'bg-amber-50/70 hover:bg-amber-50',
    badgeBg: 'bg-amber-100/90',
    badgeText: 'text-amber-700',
    border: 'group-hover:border-amber-200',
  },
  jpg: {
    bg: 'bg-purple-50/70 hover:bg-purple-50',
    badgeBg: 'bg-purple-100/90',
    badgeText: 'text-purple-700',
    border: 'group-hover:border-purple-200',
  },
  png: {
    bg: 'bg-purple-50/70 hover:bg-purple-50',
    badgeBg: 'bg-purple-100/90',
    badgeText: 'text-purple-700',
    border: 'group-hover:border-purple-200',
  },
  zip: {
    bg: 'bg-slate-100/70 hover:bg-slate-100',
    badgeBg: 'bg-slate-200/90',
    badgeText: 'text-slate-700',
    border: 'group-hover:border-slate-300',
  },
  rar: {
    bg: 'bg-slate-100/70 hover:bg-slate-100',
    badgeBg: 'bg-slate-200/90',
    badgeText: 'text-slate-700',
    border: 'group-hover:border-slate-300',
  },
}

const DEFAULT_THEME = {
  bg: 'bg-gray-50/70 hover:bg-gray-50',
  badgeBg: 'bg-gray-200/80',
  badgeText: 'text-gray-700',
  border: 'group-hover:border-gray-300',
}

// ======================================================
// Types
// ======================================================

export interface DocumentListItem {
  id: string | number
  title: string
  type?: FileTypeMap | string
  extension?: string
  updatedAt?: string
  size?: number | string
  thumbnail_path?: string | null
  description?: string
  owner?: { 
    full_name?: string; 
    username?: string; 
    avatar?: string | null; 
    avatar_url?: string | null 
  }
  workspace_type?: 'personal' | 'group' | 'shared'
  tags?: Array<{ id: number; name: string; color?: string }>
  isFavorite?: boolean
  is_bundle?: boolean
  bundle_parent_id?: number | null
  bundle_children_count?: number | null
}

interface DocumentListViewProps {
  documents: DocumentListItem[]
  isLoading?: boolean
  onAction?: (action: string, docId: string | number) => void
  navigationPath?: (docId: string | number) => string
  showOwner?: boolean
  workspaceType?: 'personal' | 'group'
  permission?: 'owner' | 'full' | 'view'
  extraItems?: any[]
  onToggleBundle?: (bundleId: string | number) => Promise<DocumentListItem[]>
}



interface SortConfig {
  key: 'name' | 'size' | 'date' | 'type'
  direction: 'asc' | 'desc'
}

function safeFormatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  if (dateStr.includes('/') || dateStr.includes('trước') || dateStr.includes('ago')) {
    return dateStr
  }
  const timestamp = Date.parse(dateStr)
  if (!isNaN(timestamp)) {
    return formatRelativeDate(dateStr)
  }
  return dateStr
}

function parseDateToNumber(dateStr?: string): number {
  if (!dateStr) return 0
  const timestamp = Date.parse(dateStr)
  return isNaN(timestamp) ? 0 : timestamp
}

function safeFormatSize(size?: number | string): string {
  if (size === undefined || size === null || size === '') return '—'
  if (typeof size === 'number') return formatSize(size)
  return size
}

function parseSizeToNumber(size?: number | string): number {
  if (typeof size === 'number') return size
  if (!size) return 0
  const num = parseFloat(String(size))
  return isNaN(num) ? 0 : num
}

export function DocumentListView({
  documents,
  isLoading = false,
  onAction,
  navigationPath,
  showOwner = false,
  workspaceType = 'personal',
  permission = 'view',
  extraItems,
  onToggleBundle,
}: DocumentListViewProps) {
  const navigate = useNavigate()
  const [imageErrors, setImageErrors] = useState<Record<string | number, boolean>>({})
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'date',
    direction: 'desc',
  })

  // States for bundle expand/collapse
  const [expandedBundles, setExpandedBundles] = useState<Set<string | number>>(new Set())
  const [loadingBundles, setLoadingBundles] = useState<Set<string | number>>(new Set())
  const [bundleChildren, setBundleChildren] = useState<Record<string | number, DocumentListItem[]>>({})

  const handleToggleBundle = async (e: React.MouseEvent, bundleId: string | number) => {
    e.stopPropagation()
    if (!onToggleBundle) return

    if (expandedBundles.has(bundleId)) {
      const next = new Set(expandedBundles)
      next.delete(bundleId)
      setExpandedBundles(next)
      return
    }

    // Expand
    const next = new Set(expandedBundles)
    next.add(bundleId)
    setExpandedBundles(next)

    // Load if not loaded
    if (!bundleChildren[bundleId] && !loadingBundles.has(bundleId)) {
      try {
        setLoadingBundles(prev => new Set(prev).add(bundleId))
        const children = await onToggleBundle(bundleId)
        setBundleChildren(prev => ({ ...prev, [bundleId]: children }))
      } catch (err) {
        console.error("Lỗi khi tải tài liệu con của gói:", err)
      } finally {
        setLoadingBundles(prev => {
          const s = new Set(prev)
          s.delete(bundleId)
          return s
        })
      }
    }
  }


  const sortedDocuments = [...documents].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortConfig.key) {
      case 'name':
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        break
      case 'size':
        aValue = parseSizeToNumber(a.size)
        bValue = parseSizeToNumber(b.size)
        break
      case 'date':
        aValue = parseDateToNumber(a.updatedAt)
        bValue = parseDateToNumber(b.updatedAt)
        break
      case 'type':
        aValue = a.type?.toString().toLowerCase() || ''
        bValue = b.type?.toString().toLowerCase() || ''
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleRowClick = (doc: DocumentListItem) => {
    if (navigationPath) {
      navigate(navigationPath(doc.id))
    } else if (doc.is_bundle) {
      navigate(`/personal/bundle/${doc.id}`)
    } else {
      navigate(`/personal/documents/${doc.id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs divide-y divide-gray-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
            <div className="h-10 w-12 rounded-lg bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/5" />
            </div>
            <div className="h-4 bg-gray-100 rounded w-16" />
            <div className="h-4 bg-gray-100 rounded w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 rounded-xl border border-gray-200/80 bg-gray-50/50">
        <FileIcon type="default" className="h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500 font-medium">Chưa có tài liệu nào</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
      {/* HEADER BẢNG */}
      <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-gray-50/80 border-b border-gray-200/80 text-xs font-semibold text-gray-500 select-none">
        <button
          onClick={() => handleSort('name')}
          className={cn(
            'col-span-6 md:col-span-5 flex items-center gap-1.5 hover:text-gray-900 transition-colors text-left cursor-pointer',
            sortConfig.key === 'name' && 'text-gray-900 font-bold'
          )}
        >
          Tên tài liệu
          {sortConfig.key === 'name' && (
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform text-primary-600',
                sortConfig.direction === 'asc' && 'rotate-180'
              )}
            />
          )}
        </button>

        {showOwner && (
          <div className="hidden md:flex col-span-2 items-center gap-1 text-left">
            Người đăng
          </div>
        )}

        <button
          onClick={() => handleSort('date')}
          className={cn(
            showOwner ? 'col-span-3 md:col-span-2' : 'col-span-3 md:col-span-3',
            'flex items-center justify-end md:justify-start gap-1.5 hover:text-gray-900 transition-colors cursor-pointer',
            sortConfig.key === 'date' && 'text-gray-900 font-bold'
          )}
        >
          Cập nhật
          {sortConfig.key === 'date' && (
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform text-primary-600',
                sortConfig.direction === 'asc' && 'rotate-180'
              )}
            />
          )}
        </button>

        <button
          onClick={() => handleSort('size')}
          className={cn(
            showOwner ? 'hidden md:flex col-span-2' : 'col-span-2 md:col-span-3',
            'items-center justify-end gap-1.5 hover:text-gray-900 transition-colors cursor-pointer text-right',
            sortConfig.key === 'size' && 'text-gray-900 font-bold'
          )}
        >
          Kích thước
          {sortConfig.key === 'size' && (
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform text-primary-600',
                sortConfig.direction === 'asc' && 'rotate-180'
              )}
            />
          )}
        </button>

        <div className="col-span-3 md:col-span-1 text-right pr-1">Thao tác</div>
      </div>

      {/* DANH SÁCH HÀNG */}
      <div className="divide-y divide-gray-100">
        {sortedDocuments.map((doc) => {
          const displaySize = safeFormatSize(doc.size)
          const displayDate = safeFormatDate(doc.updatedAt)
          const ownerName = doc.owner?.full_name || doc.owner?.username
          const ownerAvatar = doc.owner?.avatar_url || doc.owner?.avatar

          const isBundle = doc.is_bundle === true
          const ext = getFileExtension(doc.extension || doc.type?.toString())
          const theme = isBundle
            ? { bg: 'bg-purple-50/70', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', border: 'border-purple-200' }
            : (FILE_TYPE_THEMES[ext] || DEFAULT_THEME)
          
          const thumbnailUrl =
            !isBundle && doc.thumbnail_path && !imageErrors[doc.id]
              ? `${import.meta.env.VITE_API_URL || ''}/${doc.thumbnail_path}`
              : null

          const isExpanded = expandedBundles.has(doc.id)
          const isLoading = loadingBundles.has(doc.id)
          const childrenList = bundleChildren[doc.id] || []

          return (
            <div key={doc.id} className="flex flex-col">
              <div
                onClick={(e) => {
                  if (isBundle && onToggleBundle) {
                    handleToggleBundle(e, doc.id)
                  } else {
                    handleRowClick(doc)
                  }
                }}
                className={cn(
                  'group grid grid-cols-12 gap-3 px-4 py-3 items-center',
                  isBundle ? 'hover:bg-purple-50/40 bg-purple-50/10' : 'hover:bg-slate-50/80',
                  'transition-all cursor-pointer'
                )}
              >
                {/* Tên tài liệu & Preview */}
                <div className="col-span-6 md:col-span-5 flex items-center gap-3 min-w-0">
                  {/* Chevron for bundle */}
                  {isBundle && onToggleBundle ? (
                    <button
                      onClick={(e) => handleToggleBundle(e, doc.id)}
                      className="p-1 -ml-1 text-purple-600 hover:bg-purple-100 rounded"
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
                      ) : (
                        <ChevronRight
                          className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')}
                        />
                      )}
                    </button>
                  ) : (
                    // Placeholder for alignment if we want it, or just omit. 
                    // Let's add a tiny margin if it's not a bundle but there could be bundles in the list
                    <div className="w-4 shrink-0" />
                  )}

                  {/* Thumbnail hoặc Icon preview với Theme màu sắc & Badge */}
                  <div
                    className={cn(
                      'relative flex-shrink-0 h-10 w-12 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center transition-transform duration-200 group-hover:scale-105',
                      theme.bg
                    )}
                  >
                    {isBundle ? (
                      <Package className="h-5 w-5 text-purple-600" />
                    ) : thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={doc.title}
                        className="h-full w-full object-cover"
                        onError={() =>
                          setImageErrors((prev) => ({ ...prev, [doc.id]: true }))
                        }
                      />
                    ) : (
                      <FileIcon type={doc.type || 'default'} className="h-5 w-5 text-gray-600" />
                    )}

                    {/* Badge Extension */}
                    <span
                      className={cn(
                        'absolute bottom-0.5 right-0.5 px-1 rounded-[4px] text-[8px] font-bold uppercase tracking-tighter backdrop-blur-xs',
                        theme.badgeBg,
                        theme.badgeText
                      )}
                    >
                      {isBundle ? 'BUNDLE' : (ext || 'FILE')}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-semibold text-gray-800 truncate group-hover:text-primary-600 transition-colors leading-snug"
                      title={doc.title}
                    >
                      {doc.title}
                    </p>

                    {isBundle && (
                      <span className="text-[11px] text-purple-600 font-medium block">
                        {doc.bundle_children_count ?? 0} tài liệu bên trong
                      </span>
                    )}

                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {doc.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-md"
                          >
                            #{tag.name}
                          </span>
                        ))}
                        {doc.tags.length > 2 && (
                          <span className="text-[10px] text-gray-400 font-medium">
                            +{doc.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Owner */}
                {showOwner && (
                  <div className="hidden md:flex col-span-2 items-center gap-2 min-w-0">
                    {ownerAvatar ? (
                      <img
                        src={ownerAvatar}
                        alt={ownerName}
                        className="h-5 w-5 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <User className="h-3 w-3 text-gray-500" />
                      </div>
                    )}
                    <span className="text-xs text-gray-600 truncate">
                      {ownerName || 'Thành viên'}
                    </span>
                  </div>
                )}

                {/* Ngày cập nhật */}
                <div
                  className={cn(
                    showOwner ? 'col-span-3 md:col-span-2' : 'col-span-3 md:col-span-3',
                    'text-xs text-gray-500 text-right md:text-left truncate font-medium'
                  )}
                >
                  {displayDate}
                </div>

                {/* Dung lượng */}
                <div
                  className={cn(
                    showOwner ? 'hidden md:flex col-span-2' : 'col-span-2 md:col-span-3',
                    'text-xs text-gray-500 justify-end text-right font-medium'
                  )}
                >
                  {displaySize}
                </div>

                {/* Thao tác */}
                <div
                  className="col-span-3 md:col-span-1 flex items-center justify-end gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="hidden group-hover:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onAction && workspaceType === 'personal' && (
                      <button
                        onClick={() => onAction('favorite', doc.id)}
                        className="p-1 text-gray-400 hover:text-rose-500 rounded-md hover:bg-gray-100 transition-colors"
                        title="Yêu thích"
                      >
                        <Heart
                          className={cn(
                            'h-3.5 w-3.5',
                            doc.isFavorite && 'fill-rose-500 text-rose-500'
                          )}
                        />
                      </button>
                    )}
                    {onAction && (
                      <button
                        onClick={() => onAction('download', doc.id)}
                        className="p-1 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                        title="Tải xuống"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Phân loại Menu dựa trên workspaceType */}
                  {workspaceType === 'group' ? (
                    <GroupDocumentContextMenu
                      permission={permission}
                      onAction={(action) => onAction?.(action, doc.id)}
                    />
                  ) : (
                    <DocumentContextMenu
                      onAction={(action: DocumentAction) => onAction?.(action, doc.id)}
                      extraItems={extraItems}
                    />
                  )}
                </div>
              </div>

              {/* Children block */}
              {isExpanded && childrenList.length > 0 && (
                <div className="bg-gray-50/50 border-t border-purple-100">
                  <div className="pl-8 border-l-2 border-purple-200 ml-4 my-2 flex flex-col gap-1">
                    {childrenList.map((childDoc) => {
                      const cExt = getFileExtension(childDoc.extension || childDoc.type?.toString())
                      const cTheme = FILE_TYPE_THEMES[cExt] || DEFAULT_THEME
                      const cThumbnail = childDoc.thumbnail_path && !imageErrors[childDoc.id]
                        ? `${import.meta.env.VITE_API_URL || ''}/${childDoc.thumbnail_path}`
                        : null

                      return (
                        <div
                          key={childDoc.id}
                          onClick={() => handleRowClick(childDoc)}
                          className="group grid grid-cols-12 gap-3 px-3 py-2 items-center hover:bg-white rounded-lg transition-colors cursor-pointer mr-2"
                        >
                          <div className="col-span-6 md:col-span-5 flex items-center gap-3 min-w-0">
                            <div className={cn('relative flex-shrink-0 h-8 w-10 rounded border border-gray-200 overflow-hidden flex items-center justify-center', cTheme.bg)}>
                              {cThumbnail ? (
                                <img src={cThumbnail} alt={childDoc.title} className="h-full w-full object-cover" onError={() => setImageErrors(p => ({ ...p, [childDoc.id]: true }))} />
                              ) : (
                                <FileIcon type={childDoc.type || 'default'} className="h-4 w-4 text-gray-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-700 truncate group-hover:text-primary-600 transition-colors" title={childDoc.title}>
                                {childDoc.title}
                              </p>
                            </div>
                          </div>
                          
                          {showOwner && (
                            <div className="hidden md:flex col-span-2 items-center gap-2 min-w-0">
                              <span className="text-[11px] text-gray-500 truncate">
                                {childDoc.owner?.full_name || childDoc.owner?.username || 'Thành viên'}
                              </span>
                            </div>
                          )}

                          <div className={cn(showOwner ? 'col-span-3 md:col-span-2' : 'col-span-3 md:col-span-3', 'text-[11px] text-gray-400 font-medium truncate text-right md:text-left')}>
                            {safeFormatDate(childDoc.updatedAt)}
                          </div>

                          <div className={cn(showOwner ? 'hidden md:flex col-span-2' : 'col-span-2 md:col-span-3', 'text-[11px] text-gray-400 font-medium justify-end text-right')}>
                            {safeFormatSize(childDoc.size)}
                          </div>

                          <div className="col-span-3 md:col-span-1 flex items-center justify-end" onClick={e => e.stopPropagation()}>
                            {workspaceType === 'group' ? (
                              <GroupDocumentContextMenu permission={permission} onAction={action => onAction?.(action, childDoc.id)} />
                            ) : (
                              <DocumentContextMenu onAction={action => onAction?.(action, childDoc.id)} extraItems={extraItems} />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}