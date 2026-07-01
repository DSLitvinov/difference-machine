import { create } from "zustand";

import {
  dismissErrorToast,
  dismissForesterToast,
  dismissPersistentToasts,
  notifyError,
  notifyForesterError,
  notifyNotice,
} from "@/lib/appNotifications";
import { loadSidebarCollapsed, saveSidebarCollapsed } from "@/lib/storage";

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
  externalEditorPaths: string[];
  setSidebarMode: (mode: SidebarMode) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRepo: (repoPath: string | null, repoName: string | null, currentBranch?: string | null) => void;
  setUserName: (userName: string) => void;
  setLanguage: (language: GuiLanguage) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setForesterError: (error: string | null) => void;
  setNotice: (notice: string | null) => void;
  setExternalEditorPaths: (paths: string[]) => void;
  clearRepo: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarMode: "project",
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
  externalEditorPaths: [],
  setSidebarMode: (mode) => set({ sidebarMode: mode }),
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
      if (state.error || state.foresterError) {
        dismissPersistentToasts();
      }
      return { repoPath, repoName, currentBranch, error: null, foresterError: null };
    }),
  setUserName: (userName) => set({ userName }),
  setLanguage: (language) => set({ language }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => {
    set({ error });
    if (error) notifyError(error);
    else dismissErrorToast();
  },
  setForesterError: (foresterError) => {
    set({ foresterError });
    if (foresterError) notifyForesterError(foresterError);
    else dismissForesterToast();
  },
  setNotice: (notice) => {
    if (notice) notifyNotice(notice);
  },
  setExternalEditorPaths: (externalEditorPaths) => set({ externalEditorPaths }),
  clearRepo: () => {
    dismissPersistentToasts();
    set({
      repoPath: null,
      repoName: null,
      currentBranch: null,
      error: null,
      foresterError: null,
    });
  },
}));
