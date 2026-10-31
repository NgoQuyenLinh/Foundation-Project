import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useFavoriteStore } from '@/stores/favoriteStore'
import { authService } from '@/services/authService'

export function useRestoreSession() {
  const [isRestoring, setIsRestoring] = useState(true)
  const { token, setAuth, clearAuth } = useAuthStore()

  useEffect(() => {
    const restore = async () => {
      if (!token) {
        setIsRestoring(false)
        return
      }
      try {
        // Gọi /auth/me để xác nhận token vẫn còn hợp lệ
        // và lấy user info mới nhất từ DB
        const user = await authService.getMe()
        setAuth(token, user)
        useFavoriteStore.getState().loadFavorites()
      } catch {
        // Token hết hạn hoặc không hợp lệ → logout
        clearAuth()
      } finally {
        setIsRestoring(false)
      }
    }
    restore()
  }, []) // chỉ chạy 1 lần khi app khởi động

  return { isRestoring }
}
