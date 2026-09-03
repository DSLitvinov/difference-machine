import { useEffect, useRef, useState } from "react";
import { FirstStartView } from "@/components/views/FirstStartView";
import { AppShell } from "@/components/views/AppShell";
import { SettingsDialog } from "@/components/dialogs/SettingsDialog";
import { MergeDialog } from "@/components/dialogs/MergeDialog";
import { FileDeleteDialog, FileRenameDialog } from "@/components/dialogs/FileDialogs";
import { RecoverCommitDialog, VerifyRepositoryDialog, type RebuildCounts, type ReflogEntry } from "@/components/dialogs/RepoMaintenanceDialogs";
import { CreateBranchDialog, DeleteBranchDialog, RenameBranchDialog, SwitchBranchDialog } from "@/components/dialogs/BranchDialogs";
import { RestoreFileDialog } from "@/components/dialogs/RestoreFileDialog";
import {
  foresterCall,
  getSession,
  initRepository,
  openRepository,
  selectDirectory,
  cleanRepository,
  setLocale as persistLocale,
  onWailsEvent,
} from "@/lib/bridge";
import { AlertBanner, AlertStack } from "@/components/ui/alert";
import { RepoStateBanners } from "@/components/items/RepoStateBanners";
import { t, type Locale } from "@/lib/i18n";
import { dirtyPaths, isDirty } from "@/lib/status";
import { fileSelection, parentRel } from "@/lib/folder-query";
import { loadExternalEditors } from "@/lib/editors";
import { resetRevisionCache } from "@/lib/revision-cache";
import { useAppStore, type BranchSummary, type CommitSummary, type DirEntry, type FileLock, type MergeStatus, type StashSummary, type StatusSnapshot } from "@/store/app-store";
import type { CreateCommitFields } from "@/components/atoms/CreateCommitCard";
import type { CommitCardAction } from "@/components/items/CommitCardMenu";
import type { StashCardAction } from "@/components/items/StashCardMenu";

type EntriesResult = {
  entries?: DirEntry[];
  total?: number;
  has_more?: boolean;
};

type LogResult = {
  commits?: CommitSummary[];
};

type LocksResult = {
  locks?: FileLock[];
};

type BranchListResult = {
  branches?: BranchSummary[];
};

type StashListResult = {
  stashes?: StashSummary[];
};

function asMergeStatus(raw: unknown): MergeStatus {
  const value = (raw && typeof raw === "object" ? raw : {}) as MergeStatus;
  const conflicts = Array.isArray(value.conflicts)
    ? value.conflicts.filter((item) => item && typeof item.path === "string" && item.path)
    : [];
  return {
    in_progress: Boolean(value.in_progress),
    branch: value.branch,
    current_head: value.current_head,
    target_head: value.target_head,
    from: value.from,
    to: value.to,
    has_conflicts: Boolean(value.has_conflicts) || conflicts.length > 0,
    conflicts,
  };
}

type BranchDialog =
  | { kind: "create" }
  | { kind: "rename" }
  | { kind: "delete" }
  | { kind: "switch"; target: string };

type FileDialog = { kind: "rename"; path: string } | { kind: "delete"; paths: string[] };

function commitMessage(title: string, description: string): string {
  const head = title.trim();
  const body = description.trim();
  if (!head) {
    return "";
  }
  if (!body) {
    return head;
  }
  return `${head}\n\n${body}`;
}

function firstTag(raw: string): string {
  return raw.split(",")[0]?.trim() ?? "";
}

function tmpReviewRel(path: string): string {
  return `.DFM/tmp_review/${path.replace(/^\/+/, "")}`;
}

function commitTitle(message: string): string {
  const trimmed = message.trim();
  const nl = trimmed.indexOf("\n");
  return nl === -1 ? trimmed : trimmed.slice(0, nl).trim();
}

export default function App() {
  const shell = useAppStore((s) => s.shell);
  const locale = useAppStore((s) => s.locale);
  const theme = useAppStore((s) => s.theme);
  const toast = useAppStore((s) => s.toast);
  const repoPath = useAppStore((s) => s.repoPath);
  const folderPath = useAppStore((s) => s.folderPath);
  const changedOnly = useAppStore((s) => s.changedOnly);
  const viewIgnored = useAppStore((s) => s.viewIgnored);
  const status = useAppStore((s) => s.status);
  const userName = useAppStore((s) => s.userName);
  const branches = useAppStore((s) => s.branches);
  const mergeStatus = useAppStore((s) => s.mergeStatus);
  const applySession = useAppStore((s) => s.applySession);
  const setLocale = useAppStore((s) => s.setLocale);
  const setToast = useAppStore((s) => s.setToast);
  const setRepoMeta = useAppStore((s) => s.setRepoMeta);
  const [busy, setBusy] = useState(false);
  const [stagingCommit, setStagingCommit] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [branchDialog, setBranchDialog] = useState<BranchDialog | null>(null);
  const [fileDialog, setFileDialog] = useState<FileDialog | null>(null);
  const [cleanOpen, setCleanOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyResult, setVerifyResult] = useState<RebuildCounts | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverEntries, setRecoverEntries] = useState<ReflogEntry[]>([]);
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const [historyConfirm, setHistoryConfirm] = useState<{
    title: string;
    detail: string;
    action: CommitCardAction;
    commit: CommitSummary;
  } | null>(null);
  const [stashConfirm, setStashConfirm] = useState<StashSummary | null>(null);
  const loadingMore = useRef(false);
  const refreshChain = useRef<Promise<void>>(Promise.resolve());
  const refreshQueued = useRef<Promise<void> | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale === "ru" ? "ru" : "en";
  }, [locale]);

  useEffect(() => {
    void (async () => {
      try {
        const info = await getSession();
        applySession(info);
      } catch {
        // Bindings missing in a plain Vite preview; stay on First Start.
      }
    })();
    void loadExternalEditors();
  }, [applySession]);

  useEffect(() => {
    const offSession = onWailsEvent("session:changed", (...args: unknown[]) => {
      const info = args[0] as SessionInfo | undefined;
      if (!info || typeof info !== "object") {
        return;
      }
      applySession(info);
      if (info.shell !== "app") {
        setSettingsOpen(false);
      }
    });
    const offSettings = onWailsEvent("menu:settings", () => {
      setSettingsOpen(true);
    });
    const offMerge = onWailsEvent("menu:merge", () => {
      if (useAppStore.getState().shell !== "app") {
        return;
      }
      setMergeError(null);
      setMergeOpen(true);
    });
    const offBranchCreate = onWailsEvent("menu:branch-create", () => {
      if (useAppStore.getState().shell !== "app") {
        return;
      }
      setBranchDialog({ kind: "create" });
    });
    const offBranchRename = onWailsEvent("menu:branch-rename", () => {
      if (useAppStore.getState().shell !== "app") {
        return;
      }
      if (!useAppStore.getState().status?.current_branch) {
        return;
      }
      setBranchDialog({ kind: "rename" });
    });
    const offBranchDelete = onWailsEvent("menu:branch-delete", () => {
      const state = useAppStore.getState();
      if (state.shell !== "app") {
        return;
      }
      const current = state.status?.current_branch ?? "";
      const others = state.branches.filter((branch) => branch.name && branch.name !== current && !branch.is_current);
      if (others.length === 0) {
        return;
      }
      setBranchDialog({ kind: "delete" });
    });
    const offClean = onWailsEvent("menu:clean-repository", () => {
      if (useAppStore.getState().shell !== "app" || !useAppStore.getState().isRepository) {
        return;
      }
      setCleanOpen(true);
    });
    const offVerify = onWailsEvent("menu:verify-repository", () => {
      if (useAppStore.getState().shell !== "app" || !useAppStore.getState().isRepository) {
        return;
      }
      void openVerify();
    });
    const offRecover = onWailsEvent("menu:recover-commit", () => {
      if (useAppStore.getState().shell !== "app" || !useAppStore.getState().isRepository) {
        return;
      }
      void openRecover();
    });
    return () => {
      offSession();
      offSettings();
      offMerge();
      offBranchCreate();
      offBranchRename();
      offBranchDelete();
      offClean();
      offVerify();
      offRecover();
    };
  }, [applySession]);

  useEffect(() => {
    setMergeOpen(false);
    setMergeError(null);
    setFileDialog(null);
    setCleanOpen(false);
    setVerifyOpen(false);
    setVerifyResult(null);
    setVerifyError(null);
    setRecoverOpen(false);
    setRecoverEntries([]);
    setRecoverError(null);
    if (shell !== "app") {
      setSettingsOpen(false);
      setBranchDialog(null);
      setHistoryConfirm(null);
      setStashConfirm(null);
    }
  }, [repoPath, shell]);

  useEffect(() => {
    if (shell !== "app") {
      return;
    }
    void refreshRepoMeta();
  }, [shell, repoPath, folderPath, changedOnly, viewIgnored]);

  useEffect(() => {
    if (shell !== "app") {
      return;
    }
    return onWailsEvent("workdir:changed", () => {
      void refreshRepoMeta();
    });
  }, [shell, repoPath]);

  // Watcher events, navigation effects and mutations all rebuild the same snapshot.
  // Runs are serialized so a slow one cannot overwrite a newer one, and at most one
  // run is queued behind the running one, so bursts collapse into a single reload.
  function refreshRepoMeta(): Promise<void> {
    if (refreshQueued.current) {
      return refreshQueued.current;
    }
    const queued = refreshChain.current.then(() => {
      refreshQueued.current = null;
      return runRefreshRepoMeta();
    });
    refreshChain.current = queued;
    refreshQueued.current = queued;
    return queued;
  }

  async function runRefreshRepoMeta() {
    const startRepo = useAppStore.getState().repoPath;
    const startFolder = useAppStore.getState().folderPath;
    if (!useAppStore.getState().isRepository) {
      if (useAppStore.getState().repoPath !== startRepo) {
        return;
      }
      setRepoMeta({
        status: null,
        folderEmpty: true,
        hasCommits: false,
        repoDamaged: false,
        entries: [],
        entriesHasMore: false,
        commits: [],
        stashes: [],
        branches: [],
        mergeStatus: { in_progress: false, conflicts: [] },
        locks: [],
      });
      return;
    }
    try {
      const [status, log, locksResult, branchList, stashList, mergeRaw] = await Promise.all([
        foresterCall("status.get") as Promise<StatusSnapshot>,
        foresterCall("log.get") as Promise<LogResult>,
        foresterCall("lock.list") as Promise<LocksResult>,
        foresterCall("branch.list") as Promise<BranchListResult>,
        foresterCall("stash.list") as Promise<StashListResult>,
        foresterCall("merge.status"),
      ]);
      const commits = log.commits ?? [];
      const stashes = stashList.stashes ?? [];
      let showChanged = useAppStore.getState().changedOnly;
      const includeIgnored = useAppStore.getState().viewIgnored;
      if (showChanged && !isDirty(status)) {
        useAppStore.getState().setChangedOnly(false);
        showChanged = false;
      }
      let entries: DirEntry[] = [];
      let entriesHasMore = false;
      let folderEmpty = useAppStore.getState().folderEmpty;
      if (showChanged) {
        const paths = dirtyPaths(status);
        if (paths.length > 0) {
          const byPaths = (await foresterCall("workdir.entries_by_paths", { paths })) as { entries?: DirEntry[] };
          entries = byPaths.entries ?? [];
        }
      } else {
        const entriesResult = (await foresterCall("workdir.entries", {
          path: startFolder,
          offset: 0,
          limit: 200,
          include_ignored: includeIgnored,
        })) as EntriesResult;
        entries = entriesResult.entries ?? [];
        entriesHasMore = Boolean(entriesResult.has_more);
        folderEmpty = !(entriesResult.total ?? entries.length);
      }
      const latest = useAppStore.getState();
      if (latest.repoPath !== startRepo || latest.folderPath !== startFolder || latest.changedOnly !== showChanged || latest.viewIgnored !== includeIgnored) {
        return;
      }
      setRepoMeta({
        status,
        entries,
        entriesHasMore,
        commits,
        stashes,
        branches: branchList.branches ?? [],
        mergeStatus: asMergeStatus(mergeRaw),
        locks: locksResult.locks ?? [],
        folderEmpty,
        hasCommits: commits.length > 0,
        repoDamaged: Boolean(status.damaged),
      });
    } catch (err) {
      if (useAppStore.getState().repoPath !== startRepo) {
        return;
      }
      const msg = err instanceof Error ? err.message : "";
      const broken = /object not found|commit not found|invalid object|failed to parse commit|is not a (tree|commit)/i.test(msg);
      setRepoMeta({
        status: null,
        folderEmpty: true,
        hasCommits: false,
        repoDamaged: broken && useAppStore.getState().isRepository,
        entries: [],
        entriesHasMore: false,
        commits: [],
        stashes: [],
        branches: [],
        mergeStatus: { in_progress: false, conflicts: [] },
        locks: [],
      });
    }
  }

  async function loadMoreEntries() {
    const state = useAppStore.getState();
    if (loadingMore.current || state.changedOnly || !state.entriesHasMore) {
      return;
    }
    loadingMore.current = true;
    const folder = state.folderPath;
    const offset = state.entries.length;
    const token = state.entriesToken;
    const includeIgnored = state.viewIgnored;
    try {
      const result = (await foresterCall("workdir.entries", {
        path: folder,
        offset,
        limit: 200,
        include_ignored: includeIgnored,
      })) as EntriesResult;
      const latest = useAppStore.getState();
      if (latest.entriesToken !== token || latest.folderPath !== folder || latest.changedOnly || latest.viewIgnored !== includeIgnored) {
        return;
      }
      useAppStore.getState().appendEntries(result.entries ?? [], Boolean(result.has_more));
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      loadingMore.current = false;
    }
  }

  async function pickFolder(): Promise<string | null> {
    try {
      const path = await selectDirectory();
      return path || null;
    } catch {
      return null;
    }
  }

  async function onCreate() {
    const path = await pickFolder();
    if (!path) {
      return;
    }
    setBusy(true);
    try {
      const info = await initRepository(path);
      applySession(info);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateRepository() {
    if (!repoPath) {
      return;
    }
    setBusy(true);
    try {
      const info = await initRepository(repoPath);
      if (info.error) {
        setToast(info.error);
        return;
      }
      applySession(info);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCleanRepository() {
    setBusy(true);
    try {
      const info = await cleanRepository();
      if (info.error) {
        setToast(info.error);
        return;
      }
      setCleanOpen(false);
      applySession(info);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function openVerify() {
    setVerifyOpen(true);
    setVerifyResult(null);
    setVerifyError(null);
    setBusy(true);
    try {
      const raw = (await foresterCall("repo.rebuild", {})) as {
        commits_found?: number;
        trees_found?: number;
        blobs_found?: number;
        damaged?: boolean;
      };
      setVerifyResult({
        commitsFound: raw.commits_found ?? 0,
        treesFound: raw.trees_found ?? 0,
        blobsFound: raw.blobs_found ?? 0,
        damaged: Boolean(raw.damaged),
      });
      await refreshRepoMeta();
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function openRecover() {
    setRecoverOpen(true);
    setRecoverError(null);
    setBusy(true);
    try {
      const raw = (await foresterCall("reflog.get", { limit: 100 })) as { entries?: ReflogEntry[] };
      setRecoverEntries(raw.entries ?? []);
    } catch (err) {
      setRecoverEntries([]);
      setRecoverError(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRecoverCommit(hash: string) {
    setBusy(true);
    try {
      await foresterCall("reflog.restore", { commit_hash: hash });
      setRecoverOpen(false);
      await refreshRepoMeta();
    } catch (err) {
      setRecoverError(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onOpen() {
    const path = await pickFolder();
    if (!path) {
      return;
    }
    setBusy(true);
    try {
      const info = await openRepository(path);
      applySession(info);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateCommitFromSelection(paths: string[]) {
    const files = fileSelection(paths, useAppStore.getState().entries);
    if (files.length === 0) {
      return;
    }
    setBusy(true);
    setStagingCommit(true);
    try {
      await foresterCall("index.add", { files });
      await refreshRepoMeta();
      useAppStore.getState().openCommitComposer(files);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setStagingCommit(false);
      setBusy(false);
    }
  }

  async function onCommitAll() {
    const paths = dirtyPaths(useAppStore.getState().status);
    if (paths.length === 0) {
      return;
    }
    setBusy(true);
    setStagingCommit(true);
    try {
      await foresterCall("index.add", { files: paths });
      await refreshRepoMeta();
      useAppStore.getState().openCommitAllComposer();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setStagingCommit(false);
      setBusy(false);
    }
  }

  async function onCreateCommit(fields: CreateCommitFields) {
    const message = commitMessage(fields.message, fields.description);
    if (!message) {
      return;
    }
    const tag = firstTag(fields.tag);
    const author = useAppStore.getState().userName.trim();
    setBusy(true);
    try {
      const scoped = useAppStore.getState().commitComposerPaths;
      const paths = scoped ?? dirtyPaths(useAppStore.getState().status);
      if (paths.length > 0) {
        await foresterCall("index.add", { files: paths });
      }
      const args: Record<string, unknown> = { message };
      if (author) {
        args.author = author;
      }
      if (tag) {
        args.tag = tag;
      }
      await foresterCall("commit.create", args);
      useAppStore.getState().closeCommitComposer();
      await refreshRepoMeta();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCompareFile() {
    const state = useAppStore.getState();
    const path = state.selection[0];
    const commit = state.fileRevision;
    if (!path || !commit) {
      return;
    }
    setBusy(true);
    try {
      await foresterCall("compare.extract", { commit_hash: commit.hash });
      await foresterCall("workdir.open", { path: tmpReviewRel(path) });
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRestoreFile(): Promise<boolean> {
    const state = useAppStore.getState();
    const path = state.selection[0];
    const commit = state.fileRevision;
    if (!path || !commit) {
      return false;
    }
    setBusy(true);
    try {
      await foresterCall("restore.file", { commit_hash: commit.hash, paths: [path] });
      await refreshRepoMeta();
      return true;
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function runCommitAction(action: CommitCardAction, commit: CommitSummary): Promise<boolean> {
    setBusy(true);
    try {
      if (action === "compare") {
        await foresterCall("compare.extract", { commit_hash: commit.hash, open: true });
        return true;
      }
      if (action === "cleanup-tmp") {
        await foresterCall("compare.extract", { commit_hash: commit.hash, cleanup: true });
        return true;
      }
      if (action === "restore-version") {
        await foresterCall("restore.version", { commit_hash: commit.hash });
        await refreshRepoMeta();
        return true;
      }
      if (action === "revert-commit") {
        await foresterCall("commit.revert", { commit_hash: commit.hash });
        await refreshRepoMeta();
        return true;
      }
      await foresterCall("commit.reset", { commit_hash: commit.hash, mode: "mixed" });
      afterBranchChange();
      await refreshRepoMeta();
      return true;
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function onCommitAction(action: CommitCardAction, commit: CommitSummary) {
    if (action === "compare" || action === "cleanup-tmp") {
      void runCommitAction(action, commit);
      return;
    }
    const copy = t(locale);
    const titles = {
      "restore-version": copy.restoreThisVersion,
      "revert-commit": copy.revertCommit,
      reset: copy.resetBranchToCommit,
    } as const;
    setHistoryConfirm({
      title: titles[action],
      detail: commitTitle(commit.message ?? ""),
      action,
      commit,
    });
  }

  async function runStashAction(action: StashCardAction, stash: StashSummary): Promise<boolean> {
    setBusy(true);
    try {
      if (action === "apply") {
        await foresterCall("stash.apply", { hash: stash.hash });
      } else {
        await foresterCall("stash.drop", { hash: stash.hash });
      }
      await refreshRepoMeta();
      return true;
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function onStashAction(action: StashCardAction, stash: StashSummary) {
    if (action === "apply") {
      void runStashAction(action, stash);
      return;
    }
    setStashConfirm(stash);
  }

  function afterBranchChange() {
    resetRevisionCache();
    const state = useAppStore.getState();
    if (state.contentContext === "commit") {
      state.leaveCommit();
    } else if (state.contentContext === "file-revision") {
      state.leaveFileRevision();
    }
  }

  async function switchBranch(target: string, autoStash: boolean) {
    setBusy(true);
    let switched = false;
    try {
      await foresterCall("repo.switch", { target, auto_stash: autoStash });
      afterBranchChange();
      setBranchDialog(null);
      switched = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "request failed";
      if (!autoStash && /uncommitted|stash/i.test(message)) {
        setBranchDialog({ kind: "switch", target });
        return;
      }
      setToast(message);
    } finally {
      setBusy(false);
    }
    if (switched) {
      await refreshRepoMeta();
    }
  }

  function onSwitchBranch(name: string) {
    const state = useAppStore.getState();
    if (state.mergeStatus.in_progress) {
      return;
    }
    if (!name || name === state.status?.current_branch) {
      return;
    }
    if (isDirty(state.status)) {
      setBranchDialog({ kind: "switch", target: name });
      return;
    }
    void switchBranch(name, false);
  }

  async function onCreateBranch(name: string) {
    setBusy(true);
    try {
      await foresterCall("branch.create", { name });
      setBranchDialog(null);
      await refreshRepoMeta();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRenameBranch(newName: string) {
    const oldName = useAppStore.getState().status?.current_branch;
    if (!oldName) {
      return;
    }
    setBusy(true);
    try {
      await foresterCall("branch.rename", { old_name: oldName, new_name: newName });
      setBranchDialog(null);
      await refreshRepoMeta();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteBranch(name: string) {
    setBusy(true);
    try {
      await foresterCall("branch.delete", { name });
      setBranchDialog(null);
      await refreshRepoMeta();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onMergeStart(branch: string): Promise<boolean> {
    if (!branch || useAppStore.getState().mergeStatus.in_progress) {
      return true;
    }
    setBusy(true);
    setMergeError(null);
    try {
      const result = asMergeStatus(await foresterCall("merge.start", { branch }));
      afterBranchChange();
      await refreshRepoMeta();
      const latest = asMergeStatus(useAppStore.getState().mergeStatus);
      if (!result.in_progress && !latest.in_progress) {
        setMergeOpen(false);
        return false;
      }
      return true;
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : "request failed");
      await refreshRepoMeta();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function onMergeContinue(): Promise<boolean> {
    if (useAppStore.getState().mergeStatus.has_conflicts) {
      return true;
    }
    setBusy(true);
    setMergeError(null);
    try {
      const result = asMergeStatus(await foresterCall("merge.continue"));
      afterBranchChange();
      await refreshRepoMeta();
      const latest = asMergeStatus(useAppStore.getState().mergeStatus);
      if (!result.in_progress && !latest.in_progress) {
        setMergeOpen(false);
        return false;
      }
      return true;
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : "request failed");
      await refreshRepoMeta();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function onMergeAbort() {
    setBusy(true);
    setMergeError(null);
    try {
      await foresterCall("merge.abort");
      afterBranchChange();
      setMergeOpen(false);
      await refreshRepoMeta();
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAddInCommit(files: string[]) {
    if (files.length === 0) {
      return;
    }
    try {
      await foresterCall("index.add", { files });
      await refreshRepoMeta();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    }
  }

  async function onUnstage(files: string[]) {
    if (files.length === 0) {
      return;
    }
    try {
      await foresterCall("index.drop", { files });
      await refreshRepoMeta();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    }
  }

  async function onRenameFile(newName: string) {
    const path = fileDialog?.kind === "rename" ? fileDialog.path : "";
    if (!path) {
      return;
    }
    setBusy(true);
    try {
      const result = (await foresterCall("workdir.rename", { path, new_name: newName })) as { new_path?: string };
      const next = result.new_path ?? path;
      const state = useAppStore.getState();
      state.setSelection(state.selection.map((item) => (item === path ? next : item)));
      setFileDialog(null);
      await refreshRepoMeta();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteFile() {
    const paths = fileDialog?.kind === "delete" ? fileDialog.paths : [];
    if (paths.length === 0) {
      return;
    }
    setBusy(true);
    try {
      for (const path of paths) {
        await foresterCall("workdir.delete", { path });
      }
      const gone = new Set(paths);
      const state = useAppStore.getState();
      state.setSelection(state.selection.filter((item) => !gone.has(item)));
      if (state.contentContext === "file" || state.contentContext === "file-revision") {
        state.setContentContext("folder");
      }
      setFileDialog(null);
      await refreshRepoMeta();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onOpenInFolder(path: string) {
    try {
      await foresterCall("workdir.open", { path: parentRel(path) });
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    }
  }

  async function onEditIn(path: string, editor: string) {
    try {
      await foresterCall("workdir.open", { path, editor });
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    }
  }

  async function onToggleLock(path: string) {
    const state = useAppStore.getState();
    const lock = state.locks.find((item) => item.file_path === path);
    const user = state.userName;
    try {
      if (lock) {
        await foresterCall("lock.release", { file_path: path, user: lock.user || user });
      } else {
        await foresterCall("lock.acquire", { file_path: path, user, lock_type: 0, expire_hours: 0 });
      }
      await refreshRepoMeta();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    }
  }

  async function onIgnore(paths: string[]) {
    if (paths.length === 0) {
      return;
    }
    try {
      await foresterCall("workdir.ignore", { paths });
      const state = useAppStore.getState();
      if (!state.viewIgnored) {
        const gone = new Set(paths);
        const next = state.selection.filter((item) => !gone.has(item));
        state.setSelection(next);
        if (next.length === 0 && (state.contentContext === "file" || state.contentContext === "file-revision")) {
          state.setContentContext("folder");
        }
      }
      await refreshRepoMeta();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    }
  }

  async function onUnignore(paths: string[]) {
    if (paths.length === 0) {
      return;
    }
    try {
      await foresterCall("workdir.unignore", { paths });
      await refreshRepoMeta();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    }
  }

  async function onLocale(next: Locale) {
    setLocale(next);
    try {
      await persistLocale(next);
    } catch {
      // Local toggle still applies if cfg write fails.
    }
  }

  return (
    <>
      {shell === "app" ? (
        <AppShell
          busy={busy}
          onSettings={() => setSettingsOpen(true)}
          onCreateRepository={() => void onCreateRepository()}
          onCreateCommitFromSelection={(paths) => void onCreateCommitFromSelection(paths)}
          onNeedMore={() => void loadMoreEntries()}
          onCommitAll={() => void onCommitAll()}
          stagingCommit={stagingCommit}
          onCancelComposer={() => useAppStore.getState().closeCommitComposer()}
          onCreateCommit={(fields) => void onCreateCommit(fields)}
          onCompareFile={() => void onCompareFile()}
          onRestoreFile={onRestoreFile}
          onSwitchBranch={onSwitchBranch}
          onCreateBranch={() => setBranchDialog({ kind: "create" })}
          onRenameBranch={() => setBranchDialog({ kind: "rename" })}
          onDeleteBranch={() => setBranchDialog({ kind: "delete" })}
          onOpenMerge={() => {
            setMergeError(null);
            setMergeOpen(true);
          }}
          onAddInCommit={(paths) => void onAddInCommit(paths)}
          onUnstage={(paths) => void onUnstage(paths)}
          onRenameFile={(path) => setFileDialog({ kind: "rename", path })}
          onDeleteFile={(paths) => setFileDialog({ kind: "delete", paths })}
          onOpenInFolder={(path) => void onOpenInFolder(path)}
          onEditIn={(path, editor) => void onEditIn(path, editor)}
          onToggleLock={(path) => void onToggleLock(path)}
          onIgnore={(paths) => void onIgnore(paths)}
          onUnignore={(paths) => void onUnignore(paths)}
          onCommitAction={onCommitAction}
          onStashAction={onStashAction}
          onRefresh={() => refreshRepoMeta()}
          onVerify={() => void openVerify()}
        />
      ) : (
        <FirstStartView locale={locale} busy={busy} onCreate={() => void onCreate()} onOpen={() => void onOpen()} onLocale={onLocale} />
      )}
      {settingsOpen ? (
        <SettingsDialog
          locale={locale}
          theme={theme}
          onClose={() => setSettingsOpen(false)}
          onLocale={onLocale}
          onThemeSaved={(next) => useAppStore.getState().setTheme(next)}
          onProfileSaved={(name, email, nextLocale) => {
            useAppStore.getState().setProfile(name, email);
            setLocale(nextLocale);
          }}
          onIgnoreSaved={() => void refreshRepoMeta()}
          onError={(message) => setToast(message)}
        />
      ) : null}
      {mergeOpen && shell === "app" ? (
        <MergeDialog
          locale={locale}
          busy={busy}
          author={userName}
          currentBranch={status?.current_branch ?? ""}
          branches={branches}
          merge={mergeStatus}
          error={mergeError}
          onClose={() => setMergeOpen(false)}
          onClearError={() => setMergeError(null)}
          onStart={onMergeStart}
          onContinue={onMergeContinue}
          onAbort={() => void onMergeAbort()}
        />
      ) : null}
      {branchDialog?.kind === "switch" ? (
        <SwitchBranchDialog
          locale={locale}
          target={branchDialog.target}
          status={status}
          busy={busy}
          onCancel={() => setBranchDialog(null)}
          onConfirm={() => void switchBranch(branchDialog.target, true)}
        />
      ) : null}
      {branchDialog?.kind === "create" ? (
        <CreateBranchDialog
          locale={locale}
          busy={busy}
          onCancel={() => setBranchDialog(null)}
          onCreate={(name) => void onCreateBranch(name)}
        />
      ) : null}
      {branchDialog?.kind === "rename" ? (
        <RenameBranchDialog
          locale={locale}
          oldName={status?.current_branch ?? ""}
          busy={busy}
          onCancel={() => setBranchDialog(null)}
          onRename={(name) => void onRenameBranch(name)}
        />
      ) : null}
      {branchDialog?.kind === "delete" ? (
        <DeleteBranchDialog
          locale={locale}
          branches={branches}
          currentBranch={status?.current_branch ?? ""}
          busy={busy}
          onCancel={() => setBranchDialog(null)}
          onDelete={(name) => void onDeleteBranch(name)}
        />
      ) : null}
      {fileDialog?.kind === "rename" ? (
        <FileRenameDialog
          locale={locale}
          path={fileDialog.path}
          busy={busy}
          onCancel={() => setFileDialog(null)}
          onRename={(name) => void onRenameFile(name)}
        />
      ) : null}
      {fileDialog?.kind === "delete" ? (
        <FileDeleteDialog
          locale={locale}
          busy={busy}
          onCancel={() => setFileDialog(null)}
          onDelete={() => void onDeleteFile()}
        />
      ) : null}
      {cleanOpen ? (
        <FileDeleteDialog
          locale={locale}
          title={t(locale).cleanRepositoryTitle}
          body={t(locale).cleanRepositoryBody}
          confirmLabel={t(locale).cleanRepository}
          busy={busy}
          onCancel={() => setCleanOpen(false)}
          onDelete={() => void onCleanRepository()}
        />
      ) : null}
      {verifyOpen ? (
        <VerifyRepositoryDialog
          locale={locale}
          result={verifyResult}
          error={verifyError}
          busy={busy}
          onClose={() => {
            setVerifyOpen(false);
            setVerifyResult(null);
            setVerifyError(null);
          }}
        />
      ) : null}
      {recoverOpen ? (
        <RecoverCommitDialog
          locale={locale}
          entries={recoverEntries}
          error={recoverError}
          busy={busy}
          onCancel={() => {
            setRecoverOpen(false);
            setRecoverEntries([]);
            setRecoverError(null);
          }}
          onRecover={(hash) => void onRecoverCommit(hash)}
        />
      ) : null}
      {historyConfirm ? (
        <RestoreFileDialog
          locale={locale}
          title={historyConfirm.title}
          fileName={historyConfirm.detail}
          confirmLabel={historyConfirm.title}
          busy={busy}
          onCancel={() => setHistoryConfirm(null)}
          onConfirm={() => {
            void (async () => {
              if (await runCommitAction(historyConfirm.action, historyConfirm.commit)) {
                setHistoryConfirm(null);
              }
            })();
          }}
        />
      ) : null}
      {stashConfirm ? (
        <RestoreFileDialog
          locale={locale}
          title={t(locale).delete}
          fileName={stashConfirm.message || t(locale).stages}
          confirmLabel={t(locale).delete}
          busy={busy}
          onCancel={() => setStashConfirm(null)}
          onConfirm={() => {
            void (async () => {
              if (await runStashAction("drop", stashConfirm)) {
                setStashConfirm(null);
              }
            })();
          }}
        />
      ) : null}
      {toast || shell === "app" ? (
        <AlertStack>
          {shell === "app" ? (
            <RepoStateBanners
              locale={locale}
              status={status}
              merge={mergeStatus}
              hideMerge={mergeOpen}
              onOpenMerge={() => {
                setMergeError(null);
                setMergeOpen(true);
              }}
            />
          ) : null}
          {toast ? (
            <AlertBanner
              className="shadow-md"
              variant="destructive"
              title={t(locale).error}
              description={toast}
              closeLabel={t(locale).close}
              onClose={() => setToast(null)}
            />
          ) : null}
        </AlertStack>
      ) : null}
    </>
  );
}
