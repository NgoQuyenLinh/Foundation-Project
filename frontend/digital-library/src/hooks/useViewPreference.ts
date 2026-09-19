// src/hooks/useViewPreference.ts

import { useState, useEffect } from 'react'
import type { ViewMode } from '@/components/shared/ViewToggle'

/**
 * Hook to persist view mode preference in localStorage
 * @param storageKey - localStorage key to use (default: 'document_view_mode')
 */
export function useViewPreference(storageKey: string = 'document_view_mode') {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved === 'list' || saved === 'grid') {
      setViewMode(saved)
    }
    setIsLoaded(true)
  }, [storageKey])

  // Save to localStorage when viewMode changes
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(storageKey, mode)
  }

  return { viewMode, setViewMode: handleViewModeChange, isLoaded }
}