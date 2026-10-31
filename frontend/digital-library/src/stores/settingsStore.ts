// frontend/digital-library/src/stores/settingsStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type PreviewMode = "original" | "markdown";

interface SettingsState {
  defaultPreviewMode: PreviewMode;
  setDefaultPreviewMode: (mode: PreviewMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultPreviewMode: "original",
      setDefaultPreviewMode: (mode) => set({ defaultPreviewMode: mode }),
    }),
    { name: "app-settings" },
  ),
);
