// frontend/digital-library/src/stores/favoriteStore.ts

import { create } from "zustand";
import { favoriteService } from "@/services/favoriteService";
import { useAuthStore } from "@/stores/authStore";

interface FavoriteState {
  favoriteIds: number[];
  isLoading: boolean;
  error: string | null;

  loadFavorites: () => Promise<void>;
  isFavorite: (documentId: number) => boolean;
  toggleFavorite: (documentId: number) => Promise<boolean>;
  addFavoriteId: (documentId: number) => void;
  removeFavoriteId: (documentId: number) => void;
  clearFavorites: () => void;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favoriteIds: [],
  isLoading: false,
  error: null,

  loadFavorites: async () => {
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ favoriteIds: [] });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      const ids = await favoriteService.getFavoriteIds();
      set({ favoriteIds: ids, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || "Không thể tải danh sách yêu thích", isLoading: false });
    }
  },

  isFavorite: (documentId: number) => {
    return get().favoriteIds.includes(documentId);
  },

  toggleFavorite: async (documentId: number): Promise<boolean> => {
    const { favoriteIds } = get();
    const currentlyFavorited = favoriteIds.includes(documentId);
    const newStatus = !currentlyFavorited;

    // 1. Cập nhật lạc quan (Optimistic update)
    set({
      favoriteIds: currentlyFavorited
        ? favoriteIds.filter((id) => id !== documentId)
        : [...favoriteIds, documentId],
    });

    // 2. Gọi API thực tế
    try {
      if (currentlyFavorited) {
        await favoriteService.removeFavorite(documentId);
      } else {
        await favoriteService.addFavorite({ document_id: documentId });
      }
      return newStatus;
    } catch (err: any) {
      // 3. Hoàn tác (Rollback) nếu API thất bại
      set({ favoriteIds });
      console.error("Lỗi khi cập nhật yêu thích:", err);
      throw err;
    }
  },

  addFavoriteId: (documentId: number) => {
    set((state) => ({
      favoriteIds: state.favoriteIds.includes(documentId)
        ? state.favoriteIds
        : [...state.favoriteIds, documentId],
    }));
  },

  removeFavoriteId: (documentId: number) => {
    set((state) => ({
      favoriteIds: state.favoriteIds.filter((id) => id !== documentId),
    }));
  },

  clearFavorites: () => {
    set({ favoriteIds: [], error: null, isLoading: false });
  },
}));
