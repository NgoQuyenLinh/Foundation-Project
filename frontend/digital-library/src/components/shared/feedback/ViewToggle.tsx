// src/components/shared/feedback/ViewToggle.tsx

import { LayoutGrid, List, AlignLeft } from 'lucide-react'
import { cn } from '@/utils/cn'

// 1. Mở rộng thêm 'detail'
export type ViewMode = 'grid' | 'list' | 'detail'

// 2. Đổi tên prop cho khớp với chỗ dùng
interface ViewToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  className?: string
}

const OPTIONS: Array<{
  value: ViewMode
  icon: typeof LayoutGrid
  label: string
}> = [
  { value: 'grid', icon: LayoutGrid, label: 'Dạng lưới' },
  { value: 'list', icon: List, label: 'Dạng danh sách' },
  { value: 'detail', icon: AlignLeft, label: 'Danh sách chi tiết' },
]

export function ViewToggle({
  viewMode,
  onViewModeChange,
  className,
}: ViewToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5',
        className
      )}
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onViewModeChange(value)}
          title={label}
          aria-label={label}
          aria-pressed={viewMode === value}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            viewMode === value
              ? 'bg-primary-50 text-primary-600'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}