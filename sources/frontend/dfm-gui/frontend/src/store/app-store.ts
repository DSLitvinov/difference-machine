import { create } from "zustand";
import type { Locale } from "@/lib/i18n";
import { resetThumbCache } from "@/lib/thumb-cache";
import { resetRevisionCache } from "@/lib/revision-cache";
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

export type DirEntry = {
  name: string;
  path: string;
  is_dir: boolean;
  item_count?: number;
  size?: number;
  modified?: number;
};

export type CommitSummary = {
  hash: string;
  message?: string;
  author?: string;
  timestamp?: number;
  parent_hashes?: string[];
  tag?: string;
};

export type FileLock = {
  file_path: string;
  user?: string;
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
  selectedCommit: string | null;
  fileRevision: CommitSummary | null;
  infoCollapsed: boolean;
  changedOnly: boolean;
  sidebarTab: SidebarTab;
  commitComposer: "closed" | "open";
  folderEmpty: boolean;
  hasCommits: boolean;
  status: StatusSnapshot | null;
  entries: DirEntry[];
  entriesHasMore: boolean;
  commits: CommitSummary[];
  locks: FileLock[];
  toast: string | null;
  applySession: (info: SessionInfo) => void;
  setLocale: (locale: Locale) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setChangedOnly: (value: boolean) => void;
  setFolderPath: (path: string) => void;
  setSelection: (paths: string[]) => void;
  setInfoCollapsed: (value: boolean) => void;
  setContentContext: (context: ContentContext) => void;
  openFile: (path: string) => void;
  openCommit: (hash: string) => void;
  leaveCommit: () => void;
  openFileRevision: (commit: CommitSummary) => void;
  leaveFileRevision: () => void;
  openCommitComposer: () => void;
  closeCommitComposer: () => void;
  setToast: (message: string | null) => void;
  setRepoMeta: (meta: {
    folderEmpty: boolean;
    hasCommits: boolean;
    status: StatusSnapshot | null;
    entries: DirEntry[];
    entriesHasMore: boolean;
    commits: CommitSummary[];
    locks: FileLock[];
  }) => void;
  appendEntries: (entries: DirEntry[], hasMore: boolean) => void;
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
  selectedCommit: null,
  fileRevision: null,
  infoCollapsed: false,
  changedOnly: false,
  sidebarTab: "history",
  commitComposer: "closed",
  folderEmpty: true,
  hasCommits: false,
  status: null,
  entries: [],
  entriesHasMore: false,
  commits: [],
  locks: [],
  toast: null,
  applySession: (info) => {
    resetThumbCache();
    resetRevisionCache();
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
      selectedCommit: null,
      fileRevision: null,
      infoCollapsed: false,
      changedOnly: false,
      commitComposer: "closed",
      sidebarTab: "history",
      folderEmpty: true,
      hasCommits: false,
      status: null,
      entries: [],
      entriesHasMore: false,
      commits: [],
      locks: [],
      toast: info.error || null,
    });
  },
  setLocale: (locale) => set({ locale }),
  setSidebarTab: (tab) =>
    set((s) => ({
      sidebarTab: tab,
      ...(tab === "stages" && s.contentContext === "commit"
        ? { selectedCommit: null, contentContext: "folder" as const }
        : {}),
    })),
  setChangedOnly: (value) => set({ changedOnly: value }),
  setFolderPath: (path) =>
    set({ folderPath: path, selection: [], contentContext: "folder", selectedCommit: null, fileRevision: null }),
  setSelection: (paths) => set({ selection: paths, ...(paths.length > 0 ? { infoCollapsed: false } : {}) }),
  setInfoCollapsed: (value) => set({ infoCollapsed: value }),
  setContentContext: (context) =>
    set({
      contentContext: context,
      ...(context === "folder" ? { selectedCommit: null, fileRevision: null } : { commitComposer: "closed" }),
    }),
  openFile: (path) =>
    set({
      selection: [path],
      contentContext: "file",
      infoCollapsed: false,
      selectedCommit: null,
      fileRevision: null,
      commitComposer: "closed",
    }),
  openCommit: (hash) => set({ selectedCommit: hash, contentContext: "commit", commitComposer: "closed", fileRevision: null }),
  leaveCommit: () => set({ selectedCommit: null, contentContext: "folder", selection: [] }),
  openFileRevision: (commit) =>
    set({ fileRevision: commit, selectedCommit: commit.hash, contentContext: "file-revision", commitComposer: "closed" }),
  leaveFileRevision: () => set({ fileRevision: null, selectedCommit: null, contentContext: "file" }),
  openCommitComposer: () =>
    set({ commitComposer: "open", contentContext: "folder", selectedCommit: null, fileRevision: null, infoCollapsed: false, sidebarTab: "history" }),
  closeCommitComposer: () => set({ commitComposer: "closed" }),
  setToast: (message) => set({ toast: message }),
  setRepoMeta: (meta) => set(meta),
  appendEntries: (entries, hasMore) =>
    set((state) => {
      const seen = new Set(state.entries.map((entry) => entry.path));
      return {
        entries: [...state.entries, ...entries.filter((entry) => !seen.has(entry.path))],
        entriesHasMore: hasMore,
      };
    }),
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
