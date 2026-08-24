import { useEffect, useRef, useState } from "react";
import { FirstStartView } from "@/components/views/FirstStartView";
import { AppShell } from "@/components/views/AppShell";
import { SettingsDialog } from "@/components/dialogs/SettingsDialog";
import { MergeDialog } from "@/components/dialogs/MergeDialog";
import { FileDeleteDialog, FileRenameDialog } from "@/components/dialogs/FileDialogs";
import { CreateBranchDialog, DeleteBranchDialog, RenameBranchDialog, SwitchBranchDialog } from "@/components/dialogs/BranchDialogs";
import { RestoreFileDialog } from "@/components/dialogs/RestoreFileDialog";
import {
  foresterCall,
  getSession,
  initRepository,
  openRepository,
  selectDirectory,
  setLocale as persistLocale,
  onWailsEvent,
} from "@/lib/bridge";
import type { Locale } from "@/lib/i18n";
import { dirtyPaths, isDirty } from "@/lib/status";
import { parentRel } from "@/lib/folder-query";
import { resetRevisionCache } from "@/lib/revision-cache";
import { useAppStore, type BranchSummary, type CommitSummary, type DirEntry, type FileLock, type MergeStatus, type StatusSnapshot } from "@/store/app-store";
import type { CreateCommitFields } from "@/components/atoms/CreateCommitCard";
import type { CommitCardAction } from "@/components/items/CommitCardMenu";

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
  | { kind: "delete"; name: string }
  | { kind: "switch"; target: string };

type FileDialog = { kind: "rename"; path: string } | { kind: "delete"; path: string };

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

const commitConfirmCopy: Record<Exclude<CommitCardAction, "compare">, string> = {
  "restore-version": "Restore this version",
  "revert-commit": "Revert commit",
  reset: "Reset branch to commit",
};

export default function App() {
  const shell = useAppStore((s) => s.shell);
  const locale = useAppStore((s) => s.locale);
  const toast = useAppStore((s) => s.toast);
  const repoPath = useAppStore((s) => s.repoPath);
  const folderPath = useAppStore((s) => s.folderPath);
  const changedOnly = useAppStore((s) => s.changedOnly);
  const status = useAppStore((s) => s.status);
  const userName = useAppStore((s) => s.userName);
  const branches = useAppStore((s) => s.branches);
  const mergeStatus = useAppStore((s) => s.mergeStatus);
  const applySession = useAppStore((s) => s.applySession);
  const setLocale = useAppStore((s) => s.setLocale);
  const setToast = useAppStore((s) => s.setToast);
  const setRepoMeta = useAppStore((s) => s.setRepoMeta);
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [branchDialog, setBranchDialog] = useState<BranchDialog | null>(null);
  const [fileDialog, setFileDialog] = useState<FileDialog | null>(null);
  const [historyConfirm, setHistoryConfirm] = useState<{
    title: string;
    detail: string;
    action: CommitCardAction;
    commit: CommitSummary;
  } | null>(null);
  const loadingMore = useRef(false);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast, setToast]);

  useEffect(() => {
    void (async () => {
      try {
        const info = await getSession();
        applySession(info);
      } catch {
        // Bindings missing in a plain Vite preview; stay on First Start.
      }
    })();
  }, [applySession]);

  useEffect(() => {
    const offSession = onWailsEvent("session:changed", (...args: unknown[]) => {
      const info = args[0] as SessionInfo | undefined;
      if (!info || typeof info !== "object") {
        return;
      }
      applySession(info);
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
    return () => {
      offSession();
      offSettings();
      offMerge();
    };
  }, [applySession]);

  useEffect(() => {
    setMergeOpen(false);
    setMergeError(null);
    setFileDialog(null);
  }, [repoPath, shell]);

  useEffect(() => {
    if (shell !== "app") {
      return;
    }
    void refreshRepoMeta();
  }, [shell, repoPath, folderPath, changedOnly]);

  useEffect(() => {
    if (shell !== "app") {
      return;
    }
    return onWailsEvent("workdir:changed", () => {
      void refreshRepoMeta();
    });
  }, [shell, repoPath]);

  async function refreshRepoMeta() {
    try {
      const [status, log, locksResult, branchList, mergeRaw] = await Promise.all([
        foresterCall("status.get") as Promise<StatusSnapshot>,
        foresterCall("log.get") as Promise<LogResult>,
        foresterCall("lock.list") as Promise<LocksResult>,
        foresterCall("branch.list") as Promise<BranchListResult>,
        foresterCall("merge.status"),
      ]);
      const commits = log.commits ?? [];
      let showChanged = useAppStore.getState().changedOnly;
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
        const path = useAppStore.getState().folderPath;
        const entriesResult = (await foresterCall("workdir.entries", { path, offset: 0, limit: 200 })) as EntriesResult;
        entries = entriesResult.entries ?? [];
        entriesHasMore = Boolean(entriesResult.has_more);
        folderEmpty = !(entriesResult.total ?? entries.length);
      }
      setRepoMeta({
        status,
        entries,
        entriesHasMore,
        commits,
        branches: branchList.branches ?? [],
        mergeStatus: asMergeStatus(mergeRaw),
        locks: locksResult.locks ?? [],
        folderEmpty,
        hasCommits: commits.length > 0,
      });
    } catch {
      setRepoMeta({
        status: null,
        folderEmpty: true,
        hasCommits: false,
        entries: [],
        entriesHasMore: false,
        commits: [],
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
    try {
      const result = (await foresterCall("workdir.entries", { path: folder, offset, limit: 200 })) as EntriesResult;
      const latest = useAppStore.getState();
      if (latest.folderPath !== folder || latest.changedOnly) {
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

  async function onApplySelection(paths: string[]) {
    if (paths.length === 0) {
      return;
    }
    try {
      await foresterCall("index.add", { files: paths });
      await refreshRepoMeta();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    }
  }

  async function onCommitAll() {
    const paths = dirtyPaths(useAppStore.getState().status);
    if (paths.length === 0) {
      return;
    }
    setBusy(true);
    try {
      await foresterCall("index.add", { files: paths });
      await refreshRepoMeta();
      useAppStore.getState().openCommitComposer();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
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
      const paths = dirtyPaths(useAppStore.getState().status);
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
        await foresterCall("compare.extract", { commit_hash: commit.hash });
        await foresterCall("workdir.open", { path: ".DFM/tmp_review" });
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
    if (action === "compare") {
      void runCommitAction(action, commit);
      return;
    }
    setHistoryConfirm({
      title: commitConfirmCopy[action],
      detail: commitTitle(commit.message ?? ""),
      action,
      commit,
    });
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

  async function onMergeStart(branch: string) {
    if (!branch || useAppStore.getState().mergeStatus.in_progress) {
      return;
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
      }
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onMergeContinue() {
    if (useAppStore.getState().mergeStatus.has_conflicts) {
      return;
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
      }
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : "request failed");
      await refreshRepoMeta();
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

  async function onAddInCommit(path: string) {
    try {
      await foresterCall("index.add", { files: [path] });
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
    const path = fileDialog?.kind === "delete" ? fileDialog.path : "";
    if (!path) {
      return;
    }
    setBusy(true);
    try {
      await foresterCall("workdir.delete", { path });
      const state = useAppStore.getState();
      state.setSelection(state.selection.filter((item) => item !== path));
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
          onApplySelection={(paths) => void onApplySelection(paths)}
          onNeedMore={() => void loadMoreEntries()}
          onCommitAll={() => void onCommitAll()}
          onCancelComposer={() => useAppStore.getState().closeCommitComposer()}
          onCreateCommit={(fields) => void onCreateCommit(fields)}
          onCompareFile={() => void onCompareFile()}
          onRestoreFile={onRestoreFile}
          onSwitchBranch={onSwitchBranch}
          onCreateBranch={() => setBranchDialog({ kind: "create" })}
          onRenameBranch={() => setBranchDialog({ kind: "rename" })}
          onDeleteBranch={(name) => setBranchDialog({ kind: "delete", name })}
          onOpenMerge={() => {
            setMergeError(null);
            setMergeOpen(true);
          }}
          onAddInCommit={(path) => void onAddInCommit(path)}
          onRenameFile={(path) => setFileDialog({ kind: "rename", path })}
          onDeleteFile={(path) => setFileDialog({ kind: "delete", path })}
          onOpenInFolder={(path) => void onOpenInFolder(path)}
          onEditIn={(path, editor) => void onEditIn(path, editor)}
          onToggleLock={(path) => void onToggleLock(path)}
          onCommitAction={onCommitAction}
          onRefresh={() => refreshRepoMeta()}
        />
      ) : (
        <FirstStartView locale={locale} busy={busy} onCreate={() => void onCreate()} onOpen={() => void onOpen()} onLocale={onLocale} />
      )}
      {settingsOpen ? (
        <SettingsDialog
          locale={locale}
          onClose={() => setSettingsOpen(false)}
          onProfileSaved={(name, email, nextLocale) => {
            useAppStore.getState().setProfile(name, email);
            setLocale(nextLocale);
          }}
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
          onStart={(branch) => void onMergeStart(branch)}
          onContinue={() => void onMergeContinue()}
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
          busy={busy}
          onCancel={() => setBranchDialog(null)}
          onDelete={() => void onDeleteBranch(branchDialog.name)}
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
      {toast ? (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border border-border bg-background px-3 py-2 text-[14px] leading-5 text-foreground shadow-sm"
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}
