import { create } from "zustand";

export type SidebarMode = "project" | "history";

interface AppState {
  sidebarMode: SidebarMode;
  sidebarCollapsed: boolean;
  repoPath: string | null;
  repoName: string | null;
  currentBranch: string | null;
  loading: boolean;
  error: string | null;
  setSidebarMode: (mode: SidebarMode) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRepo: (repoPath: string | null, repoName: string | null, currentBranch?: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearRepo: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarMode: "project",
  sidebarCollapsed: false,
  repoPath: null,
  repoName: null,
  currentBranch: null,
  loading: false,
  error: null,
  setSidebarMode: (mode) => set({ sidebarMode: mode }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setRepo: (repoPath, repoName, currentBranch = null) =>
    set({ repoPath, repoName, currentBranch, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearRepo: () =>
    set({
      repoPath: null,
      repoName: null,
      currentBranch: null,
      error: null,
    }),
}));
