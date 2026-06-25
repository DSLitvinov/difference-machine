import { create } from "zustand";

import {
  loadSidebarCollapsed,
  loadSidebarMode,
  saveSidebarCollapsed,
  saveSidebarMode,
} from "@/lib/storage";

export type SidebarMode = "project" | "history";
export type GuiLanguage = "en" | "ru";

interface AppState {
  sidebarMode: SidebarMode;
  sidebarCollapsed: boolean;
  repoPath: string | null;
  repoName: string | null;
  currentBranch: string | null;
  userName: string;
  language: GuiLanguage;
  loading: boolean;
  error: string | null;
  foresterError: string | null;
  notice: string | null;
  setSidebarMode: (mode: SidebarMode) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRepo: (repoPath: string | null, repoName: string | null, currentBranch?: string | null) => void;
  setUserName: (userName: string) => void;
  setLanguage: (language: GuiLanguage) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setForesterError: (error: string | null) => void;
  setNotice: (notice: string | null) => void;
  clearRepo: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarMode: loadSidebarMode(),
  sidebarCollapsed: loadSidebarCollapsed(),
  repoPath: null,
  repoName: null,
  currentBranch: null,
  userName: "",
  language: "en",
  loading: false,
  error: null,
  foresterError: null,
  notice: null,
  setSidebarMode: (mode) => {
    saveSidebarMode(mode);
    set({ sidebarMode: mode });
  },
  setSidebarCollapsed: (collapsed) => {
    saveSidebarCollapsed(collapsed);
    set({ sidebarCollapsed: collapsed });
  },
  setRepo: (repoPath, repoName, currentBranch = null) =>
    set((state) => {
      if (
        state.repoPath === repoPath &&
        state.repoName === repoName &&
        state.currentBranch === currentBranch &&
        state.error === null &&
        state.foresterError === null
      ) {
        return state;
      }
      return { repoPath, repoName, currentBranch, error: null, foresterError: null };
    }),
  setUserName: (userName) => set({ userName }),
  setLanguage: (language) => set({ language }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setForesterError: (foresterError) => set({ foresterError }),
  setNotice: (notice) => set({ notice }),
  clearRepo: () =>
    set({
      repoPath: null,
      repoName: null,
      currentBranch: null,
      error: null,
      foresterError: null,
    }),
}));
