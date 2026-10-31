import { create } from 'zustand'
interface Toast {
  id: string
  message: string
  variant?: 'success' | 'error' | 'info' | 'warning'
}
interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (t) => set(s => ({ toasts: [...s.toasts, { ...t, id: Math.random().toString() }] })),
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
}))
