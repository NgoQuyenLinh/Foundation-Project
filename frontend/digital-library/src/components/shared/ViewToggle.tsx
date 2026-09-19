// src/components/shared/ViewToggle.tsx

import { Grid2X2, List } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ViewMode = 'grid' | 'list'

interface ViewToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onViewModeChange('grid')}
        className={cn(
          'p-2 rounded-md transition-all duration-200',
          viewMode === 'grid'
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
        title="Grid View"
      >
        <Grid2X2 className="h-5 w-5" />
      </button>

      <button
        onClick={() => onViewModeChange('list')}
        className={cn(
          'p-2 rounded-md transition-all duration-200',
          viewMode === 'list'
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
        title="List View"
      >
        <List className="h-5 w-5" />
      </button>
    </div>
  )
}