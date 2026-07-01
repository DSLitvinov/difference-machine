import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { BranchSelector } from "@/components/sidebar/BranchSelector";
import { CommitList } from "@/components/sidebar/CommitList";
import { CreateBranchDialog } from "@/components/sidebar/CreateBranchDialog";
import { DeleteBranchDialog } from "@/components/sidebar/DeleteBranchDialog";
import { DirtyBranchSwitchDialog } from "@/components/sidebar/DirtyBranchSwitchDialog";
import { EmptyRepoState } from "@/components/sidebar/ProjectSidebarPanel";
import { MergeBranchPickDialog } from "@/components/merge/MergeBranchPickDialog";
import { SidebarPanelTitleBar } from "@/components/shell/SidebarRail";
import { mergeSuccessNotice, MergeDialog } from "@/components/merge/MergeDialog";
import { MergeInProgressBanner } from "@/components/merge/MergeInProgressBanner";
import { DetachedHeadBanner } from "@/components/sidebar/DetachedHeadBanner";
import { Input } from "@/components/ui/input";
import { loadProjectData } from "@/components/preview/ProjectPreviewPanel";
import { parseCommitMessage } from "@/lib/commitMessage";
import { clearCommitStatsCache } from "@/lib/commitStatsCache";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/appStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useProjectStore } from "@/stores/projectStore";
import { isDirtyWorktree } from "@/lib/worktreeDirty";
import { fetchRepoUser } from "@/wails/bridge";
import {
  fetchBranchList,
  fetchBranchLog,
  fetchMergeStatus,
  fetchStatus,
  deleteBranch,
  mergeAbort,
  switchBranch,
  type CommitLogEntry,
  type MergeStatusPayload,
  type StatusPayload,
} from "@/wails/forester";

export function HistorySidebarPanel() {
  const t = useT();
  const repoPath = useAppStore((s) => s.repoPath);
  const currentBranch = useAppStore((s) => s.currentBranch);
  const sidebarMode = useAppStore((s) => s.sidebarMode);
  const setRepo = useAppStore((s) => s.setRepo);
  const setNotice = useAppStore((s) => s.setNotice);
  const setError = useAppStore((s) => s.setError);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);

  const searchQuery = useHistoryStore((s) => s.searchQuery);
  const selectedCommitHash = useHistoryStore((s) => s.selectedCommitHash);
  const pendingBranchTarget = useHistoryStore((s) => s.pendingBranchTarget);
  const setSearchQuery = useHistoryStore((s) => s.setSearchQuery);
  const selectCommit = useHistoryStore((s) => s.selectCommit);
  const setPendingBranchTarget = useHistoryStore((s) => s.setPendingBranchTarget);
  const restoreSelection = useHistoryStore((s) => s.restoreSelection);

  const [branches, setBranches] = useState<string[]>([]);
  const [commits, setCommits] = useState<CommitLogEntry[]>([]);
  const [logCapped, setLogCapped] = useState(false);
  const [loadingLog, setLoadingLog] = useState(false);
  const status = useProjectStore((s) => s.status);
  const headHash = typeof status?.head_commit === "string" ? status.head_commit : null;
  const isDetached = Boolean(status?.is_detached);
  const detachedCommit =
    typeof status?.detached_commit === "string" && status.detached_commit.length > 0
      ? status.detached_commit
      : headHash;
  const [switchingBranch, setSwitchingBranch] = useState(false);
  const [dirtyDialogOpen, setDirtyDialogOpen] = useState(false);
  const [dirtyStatus, setDirtyStatus] = useState<StatusPayload | null>(null);
  const [createBranchDialogOpen, setCreateBranchDialogOpen] = useState(false);
  const [deleteBranchTarget, setDeleteBranchTarget] = useState<string | null>(null);
  const [deletingBranch, setDeletingBranch] = useState(false);
  const [mergePickOpen, setMergePickOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTargetBranch, setMergeTargetBranch] = useState("");
  const [mergeDialogMode, setMergeDialogMode] = useState<"preview" | "continue">("preview");
  const [mergeStatus, setMergeStatus] = useState<MergeStatusPayload | null>(null);
  const [author, setAuthor] = useState("");
  const [abortingMerge, setAbortingMerge] = useState(false);
  const [returningToBranch, setReturningToBranch] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 150);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const loadBranches = useCallback(async () => {
    const list = await fetchBranchList();
    setBranches(list.map((b) => b.name));
    const current = list.find((b) => b.is_current);
    if (current) {
      setRepo(repoPath, useAppStore.getState().repoName, current.name);
    }
  }, [repoPath, setRepo]);

  const loadLog = useCallback(async () => {
    if (!currentBranch) return;
    clearCommitStatsCache();
    setLoadingLog(true);
    try {
      const result = await fetchBranchLog(currentBranch);
      setCommits(result.commits ?? []);
      setLogCapped(result.capped);
      const status = await fetchStatus();
      useProjectStore.getState().setStatus(status);
      if (repoPath) {
        const hashes = (result.commits ?? []).map((c) => c.hash);
        const current = useHistoryStore.getState().selectedCommitHash;
        if (!current || !hashes.includes(current)) {
          restoreSelection(repoPath, hashes);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingLog(false);
    }
  }, [currentBranch, repoPath, restoreSelection, setError]);

  const loadMergeStatus = useCallback(async () => {
    try {
      const status = await fetchMergeStatus();
      setMergeStatus(status.in_progress ? status : null);
      return status;
    } catch {
      setMergeStatus(null);
      return null;
    }
  }, []);

  const refreshAfterMerge = useCallback(async () => {
    clearCommitStatsCache();
    await loadBranches();
    await loadLog();
    await loadProjectData();
    await loadMergeStatus();
    const status = await fetchStatus();
    const branch =
      typeof status.current_branch === "string" ? status.current_branch : currentBranch;
    if (branch) {
      setRepo(repoPath, useAppStore.getState().repoName, branch);
    }
  }, [currentBranch, loadBranches, loadLog, loadMergeStatus, repoPath, setRepo]);

  useEffect(() => {
    if (!repoPath || sidebarMode !== "history") return;
    void fetchRepoUser().then(setAuthor).catch(() => setAuthor(""));
    void loadMergeStatus();
  }, [loadMergeStatus, repoPath, sidebarMode]);
  useEffect(() => {
    if (!repoPath || sidebarMode !== "history") return;
    let cancelled = false;
    const run = async () => {
      try {
        await loadBranches();
        if (!cancelled) await loadLog();
        if (!cancelled) await loadMergeStatus();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [repoPath, sidebarMode, currentBranch, loadBranches, loadLog, loadMergeStatus, setError]);

  const handleAfterCommitAction = useCallback(async () => {
    await loadLog();
    await loadProjectData();
  }, [loadLog]);

  const filteredCommits = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return commits;
    return commits.filter((commit) => {
      const { title, description } = parseCommitMessage(commit.message);
      return (
        title.toLowerCase().includes(q) ||
        commit.author.toLowerCase().includes(q) ||
        commit.hash.startsWith(q) ||
        (description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [commits, debouncedSearch]);

  const performSwitch = async (target: string, autoStash: boolean) => {
    setSwitchingBranch(true);
    try {
      await switchBranch(target, autoStash);
      const status = await fetchStatus();
      const branch =
        typeof status.current_branch === "string" ? status.current_branch : target;
      setRepo(repoPath, useAppStore.getState().repoName, branch);
      selectCommit(repoPath, null);
      await loadBranches();
      await loadLog();
      await loadProjectData();
      setNotice(
        autoStash ? t("common.switchedBranchStashed") : t("branch.switchedTo", { branch: target }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSwitchingBranch(false);
      setDirtyDialogOpen(false);
      setPendingBranchTarget(null);
    }
  };

  const handleBranchSelect = async (target: string) => {
    if (mergeStatus?.in_progress) {
      setNotice(t("merge.finishOrAbortFirst"));
      return;
    }
    if (!currentBranch) return;
    if (target === currentBranch && !isDetached) {
      setNotice(t("common.alreadyOnBranch", { branch: target }));
      return;
    }
    try {
      const status = await fetchStatus();
      if (isDirtyWorktree(status)) {
        setDirtyStatus(status);
        setPendingBranchTarget(target);
        setDirtyDialogOpen(true);
        return;
      }
      await performSwitch(target, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const openMergeDialog = (target: string, mode: "preview" | "continue") => {
    setMergeTargetBranch(target);
    setMergeDialogMode(mode);
    setMergeDialogOpen(true);
  };

  const handleMergeIntoCurrentClick = async () => {
    if (mergeStatus?.in_progress) {
      const branch = mergeStatus.branch ?? "";
      if (branch) openMergeDialog(branch, "continue");
      return;
    }
    try {
      const status = await fetchStatus();
      if (isDirtyWorktree(status)) {
        setError(t("merge.commitOrStashFirst"));
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    setMergePickOpen(true);
  };

  const handleReturnToBranch = async () => {
    if (!currentBranch) return;
    await performSwitch(currentBranch, false);
  };

  const handleAbortMerge = async () => {
    setAbortingMerge(true);
    try {
      await mergeAbort();
      setMergeStatus(null);
      await refreshAfterMerge();
      setNotice(t("merge.aborted"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAbortingMerge(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!deleteBranchTarget) return;
    setDeletingBranch(true);
    try {
      await deleteBranch(deleteBranchTarget);
      await loadBranches();
      setNotice(t("branch.deleted", { branch: deleteBranchTarget }));
      setDeleteBranchTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingBranch(false);
    }
  };

  if (!repoPath) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-sidebar-border px-4 py-4">
          <SidebarPanelTitleBar
            title={t("common.history")}
            onCollapse={() => setSidebarCollapsed(true)}
          />
        </header>
        <EmptyRepoState />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 space-y-4 border-b border-sidebar-border px-4 py-4">
        <SidebarPanelTitleBar
          title={t("common.history")}
          onCollapse={() => setSidebarCollapsed(true)}
        />
        <BranchSelector
          branches={branches}
          currentBranch={currentBranch ?? branches[0] ?? ""}
          isDetached={isDetached}
          disabled={switchingBranch}
          mergeInProgress={Boolean(mergeStatus?.in_progress)}
          mergeBranch={mergeStatus?.branch ?? null}
          mergeDisabled={Boolean(mergeStatus?.in_progress) || isDetached}
          onSelect={(target) => void handleBranchSelect(target)}
          onCreateClick={() => setCreateBranchDialogOpen(true)}
          onMergeIntoCurrentClick={() => void handleMergeIntoCurrentClick()}
          onDeleteClick={(branch) => setDeleteBranchTarget(branch)}
        />
        <Input
          value={searchQuery}
          placeholder={t("history.searchPlaceholder")}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-background">
        {mergeStatus?.in_progress ? (
          <MergeInProgressBanner
            status={mergeStatus}
            aborting={abortingMerge}
            onReview={() => openMergeDialog(mergeStatus.branch ?? "", "continue")}
            onAbort={() => void handleAbortMerge()}
          />
        ) : isDetached && detachedCommit ? (
          <DetachedHeadBanner
            branch={currentBranch ?? ""}
            commitHash={detachedCommit}
            returning={returningToBranch || switchingBranch}
            onReturnToBranch={() => {
              setReturningToBranch(true);
              void handleReturnToBranch().finally(() => setReturningToBranch(false));
            }}
          />
        ) : null}
        {switchingBranch ? (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("common.switchingBranch")}
          </div>
        ) : null}
        <CommitList
          commits={filteredCommits}
          selectedHash={selectedCommitHash}
          headHash={headHash}
          loading={loadingLog}
          capped={logCapped}
          emptyLabel={headHash ? t("history.noCommitsOnBranch") : t("history.noCommitsYet")}
          onSelect={(hash) => selectCommit(repoPath, hash)}
          onAfterCommitAction={() => void handleAfterCommitAction()}
        />
      </div>

      <DirtyBranchSwitchDialog
        open={dirtyDialogOpen}
        targetBranch={pendingBranchTarget ?? ""}
        status={dirtyStatus}
        switching={switchingBranch}
        onCancel={() => {
          setDirtyDialogOpen(false);
          setPendingBranchTarget(null);
        }}
        onStashAndSwitch={() => {
          if (pendingBranchTarget) {
            void performSwitch(pendingBranchTarget, true);
          }
        }}
      />

      <CreateBranchDialog
        open={createBranchDialogOpen}
        onOpenChange={setCreateBranchDialogOpen}
        onCreated={loadBranches}
        onError={setError}
        onNotice={setNotice}
      />

      <DeleteBranchDialog
        open={deleteBranchTarget !== null}
        branchName={deleteBranchTarget ?? ""}
        loading={deletingBranch}
        onConfirm={() => void handleDeleteBranch()}
        onCancel={() => {
          if (!deletingBranch) setDeleteBranchTarget(null);
        }}
      />

      <MergeBranchPickDialog
        open={mergePickOpen}
        onOpenChange={setMergePickOpen}
        branches={branches}
        currentBranch={currentBranch ?? ""}
        onSelect={(branch) => openMergeDialog(branch, "preview")}
      />

      <MergeDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        mode={mergeDialogMode}
        targetBranch={mergeTargetBranch}
        currentBranch={currentBranch ?? ""}
        author={author}
        mergeStatus={mergeStatus}
        onError={() => {
          void loadMergeStatus().then((status) => {
            if (status?.in_progress) {
              setMergeDialogMode("continue");
            }
          });
        }}
        onCompleted={async (result) => {
          await refreshAfterMerge();
          if (result?.hash) {
            setNotice(await mergeSuccessNotice(result.hash));
          } else {
            setNotice(t("merge.completed"));
          }
        }}
      />
    </div>
  );
}
