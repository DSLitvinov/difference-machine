import { create } from "zustand";
import type { Locale } from "@/lib/i18n";
import type { UiTheme } from "@/assets/themed";
import { applyDocumentTheme } from "@/assets/themed";
import { resetThumbCache } from "@/lib/thumb-cache";
import { resetRevisionCache } from "@/lib/revision-cache";
import { clampGridTrack, GRID_TRACK_DEFAULT } from "@/lib/grid";
import { deriveView, type ContentContext, type DerivedView, type Shell, type SidebarTab } from "@/lib/view";

export type StatusSnapshot = {
  current_branch?: string;
  head_commit?: string;
  is_detached?: boolean;
  detached_commit?: string;
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
  created?: number;
};

export type CommitSummary = {
  hash: string;
  message?: string;
  author?: string;
  timestamp?: number;
  parent_hashes?: string[];
  tag?: string;
};

export type StashSummary = {
  hash: string;
  message?: string;
  tree_hash?: string;
  branch?: string;
  created_at?: number;
};

export type FileLock = {
  file_path: string;
  user?: string;
};

export type BranchSummary = {
  name: string;
  commit_hash?: string;
  is_current?: boolean;
};

export type MergeConflict = {
  path: string;
  kind?: string;
  base_hash?: string;
  our_hash?: string;
  their_hash?: string;
};

export type MergeStatus = {
  in_progress?: boolean;
  branch?: string;
  current_head?: string;
  target_head?: string;
  from?: string;
  to?: string;
  has_conflicts?: boolean;
  conflicts?: MergeConflict[];
};

type AppState = {
  shell: Shell;
  locale: Locale;
  theme: UiTheme;
  repoPath: string;
  userName: string;
  userEmail: string;
  folderPath: string;
  selection: string[];
  contentContext: ContentContext;
  selectedCommit: string | null;
  fileRevision: CommitSummary | null;
  infoCollapsed: boolean;
  gridTrack: number;
  changedOnly: boolean;
  sidebarTab: SidebarTab;
  commitComposer: "closed" | "open";
  commitComposerPaths: string[] | null;
  folderEmpty: boolean;
  hasCommits: boolean;
  isRepository: boolean;
  status: StatusSnapshot | null;
  entries: DirEntry[];
  entriesHasMore: boolean;
  // Bumped on every full entries write so in-flight page loads can drop stale results.
  entriesToken: number;
  commits: CommitSummary[];
  stashes: StashSummary[];
  branches: BranchSummary[];
  mergeStatus: MergeStatus;
  locks: FileLock[];
  toast: string | null;
  applySession: (info: SessionInfo) => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: UiTheme) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setChangedOnly: (value: boolean) => void;
  setFolderPath: (path: string) => void;
  setSelection: (paths: string[]) => void;
  setInfoCollapsed: (value: boolean) => void;
  setGridTrack: (value: number) => void;
  setContentContext: (context: ContentContext) => void;
  openFile: (path: string) => void;
  openCommit: (hash: string) => void;
  leaveCommit: () => void;
  openFileRevision: (commit: CommitSummary) => void;
  leaveFileRevision: () => void;
  openCommitComposer: (paths?: string[]) => void;
  closeCommitComposer: () => void;
  setToast: (message: string | null) => void;
  setProfile: (name: string, email: string) => void;
  setRepoMeta: (meta: {
    folderEmpty: boolean;
    hasCommits: boolean;
    status: StatusSnapshot | null;
    entries: DirEntry[];
    entriesHasMore: boolean;
    commits: CommitSummary[];
    stashes: StashSummary[];
    branches: BranchSummary[];
    mergeStatus: MergeStatus;
    locks: FileLock[];
  }) => void;
  appendEntries: (entries: DirEntry[], hasMore: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  shell: "first-start",
  locale: "en",
  theme: "light",
  repoPath: "",
  userName: "",
  userEmail: "",
  folderPath: "",
  selection: [],
  contentContext: "folder",
  selectedCommit: null,
  fileRevision: null,
  infoCollapsed: false,
  gridTrack: GRID_TRACK_DEFAULT,
  changedOnly: false,
  sidebarTab: "history",
  commitComposer: "closed",
  commitComposerPaths: null,
  folderEmpty: true,
  hasCommits: false,
  isRepository: false,
  status: null,
  entries: [],
  entriesHasMore: false,
  entriesToken: 0,
  commits: [],
  stashes: [],
  branches: [],
  mergeStatus: { in_progress: false, conflicts: [] },
  locks: [],
  toast: null,
  applySession: (info) => {
    resetThumbCache();
    resetRevisionCache();
    const locale: Locale = info.locale === "ru" ? "ru" : "en";
    const theme: UiTheme = info.theme === "dark" ? "dark" : "light";
    applyDocumentTheme(theme);
    set((state) => ({
      shell: info.shell === "app" ? "app" : "first-start",
      locale,
      theme,
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
      commitComposerPaths: null,
      sidebarTab: "history",
      folderEmpty: true,
      hasCommits: false,
      isRepository: Boolean(info.isRepository),
      status: null,
      entries: [],
      entriesHasMore: false,
      entriesToken: state.entriesToken + 1,
      commits: [],
      stashes: [],
      branches: [],
      mergeStatus: { in_progress: false, conflicts: [] },
      locks: [],
      toast: info.error || null,
    }));
  },
  setLocale: (locale) => set({ locale }),
  setTheme: (theme) => {
    applyDocumentTheme(theme);
    set({ theme });
  },
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
  setGridTrack: (value) => set({ gridTrack: clampGridTrack(value) }),
  setContentContext: (context) =>
    set({
      contentContext: context,
      ...(context === "folder" ? { selectedCommit: null, fileRevision: null } : { commitComposer: "closed", commitComposerPaths: null }),
    }),
  openFile: (path) =>
    set({
      selection: [path],
      contentContext: "file",
      infoCollapsed: false,
      selectedCommit: null,
      fileRevision: null,
      commitComposer: "closed",
      commitComposerPaths: null,
    }),
  openCommit: (hash) => set({ selectedCommit: hash, contentContext: "commit", commitComposer: "closed", commitComposerPaths: null, fileRevision: null }),
  leaveCommit: () => set({ selectedCommit: null, contentContext: "folder", selection: [] }),
  openFileRevision: (commit) =>
    set({ fileRevision: commit, selectedCommit: commit.hash, contentContext: "file-revision", commitComposer: "closed", commitComposerPaths: null }),
  leaveFileRevision: () => set({ fileRevision: null, selectedCommit: null, contentContext: "file" }),
  openCommitComposer: (paths) =>
    set({
      commitComposer: "open",
      commitComposerPaths: paths && paths.length > 0 ? paths : null,
      contentContext: "folder",
      selectedCommit: null,
      fileRevision: null,
      infoCollapsed: false,
      sidebarTab: "history",
    }),
  closeCommitComposer: () => set({ commitComposer: "closed", commitComposerPaths: null }),
  setToast: (message) => set({ toast: message }),
  setProfile: (name, email) => set({ userName: name, userEmail: email }),
  setRepoMeta: (meta) => set((state) => ({ ...meta, entriesToken: state.entriesToken + 1 })),
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
      isRepository: s.isRepository,
      selectionCount: s.selection.length,
      contentContext: s.contentContext,
      infoCollapsed: s.infoCollapsed,
      sidebarTab: s.sidebarTab,
      commitComposer: s.commitComposer,
      stashEmpty: s.stashes.length === 0,
    }),
  );
}
