//frontend/digital-library/src/stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/user'
import { useFavoriteStore } from '@/stores/favoriteStore'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean

  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        set({ token, user, isAuthenticated: true })
        useFavoriteStore.getState().loadFavorites()
      },

      clearAuth: () => {
        useFavoriteStore.getState().clearFavorites()
        set({ token: null, user: null, isAuthenticated: false })
      },
        
      logout: () => {
        localStorage.removeItem('auth-storage')
        useFavoriteStore.getState().clearFavorites()
        set({ token: null, user: null, isAuthenticated: false })
      },

      updateUser: (partial) =>
        set(state => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
