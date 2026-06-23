import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { BranchSelector } from "@/components/sidebar/BranchSelector";
import { CommitList } from "@/components/sidebar/CommitList";
import { CreateBranchDialog } from "@/components/sidebar/CreateBranchDialog";
import { DirtyBranchSwitchDialog } from "@/components/sidebar/DirtyBranchSwitchDialog";
import { EmptyRepoState } from "@/components/sidebar/ProjectSidebarPanel";
import { Input } from "@/components/ui/input";
import { loadProjectData } from "@/components/preview/ProjectPreviewPanel";
import { parseCommitMessage } from "@/lib/commitMessage";
import { useAppStore } from "@/stores/appStore";
import { useHistoryStore } from "@/stores/historyStore";
import { isDirtyWorktree } from "@/lib/worktreeDirty";
import {
  fetchBranchList,
  fetchBranchLog,
  fetchStatus,
  switchBranch,
  type CommitLogEntry,
  type StatusPayload,
} from "@/wails/forester";

export function HistorySidebarPanel() {
  const repoPath = useAppStore((s) => s.repoPath);
  const currentBranch = useAppStore((s) => s.currentBranch);
  const sidebarMode = useAppStore((s) => s.sidebarMode);
  const setRepo = useAppStore((s) => s.setRepo);
  const setNotice = useAppStore((s) => s.setNotice);
  const setError = useAppStore((s) => s.setError);

  const searchQuery = useHistoryStore((s) => s.searchQuery);
  const selectedCommitHash = useHistoryStore((s) => s.selectedCommitHash);
  const pendingBranchTarget = useHistoryStore((s) => s.pendingBranchTarget);
  const setSearchQuery = useHistoryStore((s) => s.setSearchQuery);
  const selectCommit = useHistoryStore((s) => s.selectCommit);
  const setPendingBranchTarget = useHistoryStore((s) => s.setPendingBranchTarget);
  const restoreSelection = useHistoryStore((s) => s.restoreSelection);

  const [branches, setBranches] = useState<string[]>([]);
  const [commits, setCommits] = useState<CommitLogEntry[]>([]);
  const [headHash, setHeadHash] = useState<string | null>(null);
  const [logCapped, setLogCapped] = useState(false);
  const [loadingLog, setLoadingLog] = useState(false);
  const [switchingBranch, setSwitchingBranch] = useState(false);
  const [dirtyDialogOpen, setDirtyDialogOpen] = useState(false);
  const [dirtyStatus, setDirtyStatus] = useState<StatusPayload | null>(null);
  const [createBranchDialogOpen, setCreateBranchDialogOpen] = useState(false);
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
    setLoadingLog(true);
    try {
      const result = await fetchBranchLog(currentBranch);
      setCommits(result.commits ?? []);
      setLogCapped(result.capped);
      const status = await fetchStatus();
      setHeadHash(typeof status.head_commit === "string" ? status.head_commit : null);
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

  useEffect(() => {
    if (!repoPath || sidebarMode !== "history") return;
    let cancelled = false;
    const run = async () => {
      try {
        await loadBranches();
        if (!cancelled) await loadLog();
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
  }, [repoPath, sidebarMode, currentBranch, loadBranches, loadLog, setError]);

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
      setNotice(autoStash ? "Switched branch (changes stashed)" : `Switched to ${target}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSwitchingBranch(false);
      setDirtyDialogOpen(false);
      setPendingBranchTarget(null);
    }
  };

  const handleBranchSelect = async (target: string) => {
    if (!currentBranch || target === currentBranch) {
      if (target === currentBranch) {
        setNotice(`Already on branch ${target}`);
      }
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

  if (!repoPath) {
    return <EmptyRepoState />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 space-y-3 border-b border-sidebar-border px-3 py-3">
        <h2 className="text-base font-semibold">History</h2>
        <BranchSelector
          branches={branches}
          currentBranch={currentBranch ?? branches[0] ?? ""}
          disabled={switchingBranch}
          onSelect={(target) => void handleBranchSelect(target)}
          onCreateClick={() => setCreateBranchDialogOpen(true)}
        />
        <Input
          value={searchQuery}
          placeholder="Type to search..."
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-background">
        {switchingBranch ? (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Switching branch…
          </div>
        ) : null}
        <CommitList
          commits={filteredCommits}
          selectedHash={selectedCommitHash}
          headHash={headHash}
          loading={loadingLog}
          capped={logCapped}
          emptyLabel={headHash ? "No commits on this branch" : "No commits yet"}
          onSelect={(hash) => selectCommit(repoPath, hash)}
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
    </div>
  );
}
