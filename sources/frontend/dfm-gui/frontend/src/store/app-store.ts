import { create } from "zustand";
import type { Locale } from "@/lib/i18n";
import { deriveView, type ContentContext, type DerivedView, type Shell, type SidebarTab } from "@/lib/view";

export type StatusSnapshot = {
  current_branch?: string;
  head_commit?: string;
  is_detached?: boolean;
  staged_new_files?: string[];
  staged_modified_files?: string[];
  staged_deleted_files?: string[];
  unstaged_modified_files?: string[];
  unstaged_deleted_files?: string[];
  untracked_files?: string[];
  renamed_files?: { old_path: string; path: string }[];
};

type AppState = {
  shell: Shell;
  locale: Locale;
  repoPath: string;
  userName: string;
  userEmail: string;
  folderPath: string;
  selection: string[];
  contentContext: ContentContext;
  infoCollapsed: boolean;
  changedOnly: boolean;
  sidebarTab: SidebarTab;
  commitComposer: "closed" | "open";
  folderEmpty: boolean;
  hasCommits: boolean;
  status: StatusSnapshot | null;
  toast: string | null;
  applySession: (info: SessionInfo) => void;
  setLocale: (locale: Locale) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setChangedOnly: (value: boolean) => void;
  setToast: (message: string | null) => void;
  setRepoMeta: (meta: { folderEmpty: boolean; hasCommits: boolean; status: StatusSnapshot | null }) => void;
};

export const useAppStore = create<AppState>((set) => ({
  shell: "first-start",
  locale: "en",
  repoPath: "",
  userName: "",
  userEmail: "",
  folderPath: "",
  selection: [],
  contentContext: "folder",
  infoCollapsed: false,
  changedOnly: false,
  sidebarTab: "history",
  commitComposer: "closed",
  folderEmpty: true,
  hasCommits: false,
  status: null,
  toast: null,
  applySession: (info) => {
    const locale: Locale = info.locale === "ru" ? "ru" : "en";
    set({
      shell: info.shell === "app" ? "app" : "first-start",
      locale,
      repoPath: info.repoPath || "",
      userName: info.userName || "",
      userEmail: info.userEmail || "",
      folderPath: "",
      selection: [],
      contentContext: "folder",
      commitComposer: "closed",
      sidebarTab: "history",
      toast: info.error || null,
    });
  },
  setLocale: (locale) => set({ locale }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setChangedOnly: (value) => set({ changedOnly: value }),
  setToast: (message) => set({ toast: message }),
  setRepoMeta: (meta) => set(meta),
}));

export function useDerivedView(): DerivedView {
  return useAppStore((s) =>
    deriveView({
      shell: s.shell,
      folderPath: s.folderPath,
      folderEmpty: s.folderEmpty,
      hasCommits: s.hasCommits,
      selectionCount: s.selection.length,
      contentContext: s.contentContext,
      infoCollapsed: s.infoCollapsed,
      sidebarTab: s.sidebarTab,
      commitComposer: s.commitComposer,
    }),
  );
}
