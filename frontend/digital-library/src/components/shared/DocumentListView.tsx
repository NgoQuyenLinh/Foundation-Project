// src/components/shared/DocumentListView.tsx

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Heart,
  Download,
  Eye,
  Share2,
  ChevronDown,
} from 'lucide-react'
import { FileIcon } from './FileIcon'
import { DocumentContextMenu, type DocumentAction } from './DocumentContextMenu'
import { getFileTypeStyle } from '@/constants/fileTypeStyles'
import { formatSize } from '@/utils/formatSize'
import { formatRelativeDate } from '@/utils/formatDate'
import { cn } from '@/utils/cn'

export interface DocumentListItem {
  id: string | number
  title: string
  type?: string
  updatedAt?: string
  size?: number
  thumbnail_path?: string | null
  description?: string
  owner?: { full_name?: string; username?: string }
  workspace_type?: 'personal' | 'group' | 'shared'
  workspace_name?: string
  download_count?: number
  view_count?: number
  tags?: Array<{ id: number; name: string; color?: string }>
}

interface DocumentListViewProps {
  documents: DocumentListItem[]
  isLoading?: boolean
  onAction?: (action: DocumentAction, docId: string | number) => void
  navigationPath?: (docId: string | number) => string
  showSaveToPersonal?: boolean
}

interface SortConfig {
  key: 'name' | 'size' | 'date' | 'type'
  direction: 'asc' | 'desc'
}

export function DocumentListView({
  documents,
  isLoading = false,
  onAction,
  navigationPath,
}: DocumentListViewProps) {
  const navigate = useNavigate()
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'date',
    direction: 'desc',
  })
  const [expandedRowId] = useState<string | number | null>(null)

  // Sort documents
  const sortedDocuments = [...documents].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortConfig.key) {
      case 'name':
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        break
      case 'size':
        aValue = a.size || 0
        bValue = b.size || 0
        break
      case 'date':
        aValue = new Date(a.updatedAt || 0).getTime()
        bValue = new Date(b.updatedAt || 0).getTime()
        break
      case 'type':
        aValue = a.type?.toLowerCase() || ''
        bValue = b.type?.toLowerCase() || ''
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

  const handleRowClick = (docId: string | number) => {
    if (navigationPath) {
      navigate(navigationPath(docId))
    }
  }

  const handleAction = (action: DocumentAction, docId: string | number) => {
    onAction?.(action, docId)
  }

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-lg border border-gray-200 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-lg border border-gray-200 bg-gray-50">
        <FileIcon type="default" className="h-12 w-12 text-gray-300" />
        <p className="text-gray-500 font-medium">Chưa có tài liệu nào</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      {/* TABLE HEADER */}
      <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 text-xs font-semibold text-gray-700 uppercase tracking-wider">
        {/* Name */}
        <button
          onClick={() => handleSort('name')}
          className={cn(
            'col-span-5 text-left flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded transition-colors cursor-pointer',
            sortConfig.key === 'name' && 'text-gray-900'
          )}
        >
          Name
          {sortConfig.key === 'name' && (
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                sortConfig.direction === 'asc' && 'rotate-180'
              )}
            />
          )}
        </button>

        {/* Type */}
        <button
          onClick={() => handleSort('type')}
          className={cn(
            'col-span-2 text-left flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded transition-colors cursor-pointer',
            sortConfig.key === 'type' && 'text-gray-900'
          )}
        >
          Type
          {sortConfig.key === 'type' && (
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                sortConfig.direction === 'asc' && 'rotate-180'
              )}
            />
          )}
        </button>

        {/* Size */}
        <button
          onClick={() => handleSort('size')}
          className={cn(
            'col-span-2 text-right flex items-center justify-end gap-2 hover:bg-gray-100 px-2 py-1 rounded transition-colors cursor-pointer',
            sortConfig.key === 'size' && 'text-gray-900'
          )}
        >
          Size
          {sortConfig.key === 'size' && (
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                sortConfig.direction === 'asc' && 'rotate-180'
              )}
            />
          )}
        </button>

        {/* Date */}
        <button
          onClick={() => handleSort('date')}
          className={cn(
            'col-span-2 text-right flex items-center justify-end gap-2 hover:bg-gray-100 px-2 py-1 rounded transition-colors cursor-pointer',
            sortConfig.key === 'date' && 'text-gray-900'
          )}
        >
          Date
          {sortConfig.key === 'date' && (
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                sortConfig.direction === 'asc' && 'rotate-180'
              )}
            />
          )}
        </button>

        {/* Actions */}
        <div className="col-span-1 text-center">Actions</div>
      </div>

      {/* TABLE ROWS */}
      <div className="divide-y divide-gray-200">
        {sortedDocuments.map((doc) => {
          const style = getFileTypeStyle(doc.type)
          const displaySize = doc.size ? formatSize(doc.size) : '—'
          const displayDate = doc.updatedAt ? formatRelativeDate(doc.updatedAt) : '—'
          const isExpanded = expandedRowId === doc.id

          return (
            <div key={doc.id} className="flex flex-col">
              {/* MAIN ROW */}
              <div
                className={cn(
                  'group grid grid-cols-12 gap-4 px-4 py-3 items-center',
                  'hover:bg-slate-50 transition-colors cursor-pointer',
                  'border-l-4 border-transparent',
                  style.border,
                  isExpanded && 'bg-slate-50'
                )}
                onClick={() => handleRowClick(doc.id)}
              >
                {/* Icon + Name + Tags */}
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  {/* File Icon */}
                  <div
                    className={cn(
                      'flex-shrink-0 p-2 rounded-lg border-2 transition-all',
                      style.bg,
                      style.border,
                      'group-hover:shadow-sm'
                    )}
                  >
                    {/* Đã bổ sung fallback 'default' để tránh lỗi TS2322 */}
                    <FileIcon type={doc.type || 'default'} className={cn('h-5 w-5', style.icon)} />
                  </div>

                  {/* Title & Tags */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate hover:underline">
                      {doc.title}
                    </p>
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {doc.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag.id}
                            className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                          >
                            #{tag.name}
                          </span>
                        ))}
                        {doc.tags.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{doc.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Type */}
                <div
                  className={cn(
                    'col-span-2 text-sm font-medium px-2 py-1 rounded w-fit',
                    style.badge
                  )}
                >
                  {doc.type?.split('/').pop()?.toUpperCase() || 'File'}
                </div>

                {/* Size */}
                <div className="col-span-2 text-sm text-gray-600 text-right">
                  {displaySize}
                </div>

                {/* Date */}
                <div className="col-span-2 text-sm text-gray-600 text-right">
                  {displayDate}
                </div>

                {/* Actions Context Menu */}
                <div
                  className="col-span-1 flex justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DocumentContextMenu
                    onAction={(action) => handleAction(action, doc.id)}
                  />
                </div>
              </div>

              {/* EXPANDED ROW - Details */}
              {isExpanded && (
                <div className="col-span-12 bg-slate-50 border-t border-gray-200 px-4 py-4 space-y-4">
                  {/* Description */}
                  {doc.description && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">
                        Description
                      </p>
                      <p className="text-sm text-gray-600">{doc.description}</p>
                    </div>
                  )}

                  {/* Workspace Info */}
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    {doc.workspace_type && (
                      <div>
                        <p className="font-semibold text-gray-700">Location</p>
                        <p className="text-gray-600 mt-0.5">
                          {doc.workspace_type === 'personal'
                            ? 'Personal'
                            : doc.workspace_type === 'shared'
                              ? `Shared by ${doc.owner?.full_name || 'Unknown'}`
                              : doc.workspace_name || 'Group'}
                        </p>
                      </div>
                    )}
                    {doc.view_count !== undefined && (
                      <div>
                        <p className="font-semibold text-gray-700 flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Views
                        </p>
                        <p className="text-gray-600 mt-0.5">{doc.view_count}</p>
                      </div>
                    )}
                    {doc.download_count !== undefined && (
                      <div>
                        <p className="font-semibold text-gray-700 flex items-center gap-1">
                          <Download className="h-3 w-3" /> Downloads
                        </p>
                        <p className="text-gray-600 mt-0.5">{doc.download_count}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-300">
                    <button
                      onClick={() => handleAction('favorite', doc.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white rounded transition-colors"
                    >
                      <Heart className="h-4 w-4" />
                      Favorite
                    </button>

                    <button
                      onClick={() => handleAction('share', doc.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white rounded transition-colors"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>

                    <button
                      onClick={() => handleAction('download', doc.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white rounded transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
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