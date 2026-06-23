import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatTimestamp, shortHash } from "@/lib/format";
import { loadFileHistoryBranch, saveFileHistoryBranch } from "@/lib/storage";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import {
  compareExtract,
  fetchBranchList,
  fetchFileLog,
  fetchLockList,
  fetchStatus,
  restoreFile,
  type CommitLogEntry,
} from "@/wails/forester";

interface InfoHistorySectionProps {
  filePath: string;
  currentUser: string;
  onRestored: () => void;
}

function commitLabel(entry: CommitLogEntry): string {
  const subject = entry.message.split("\n")[0]?.trim() || "(no message)";
  const truncated = subject.length > 40 ? `${subject.slice(0, 40)}…` : subject;
  return `${shortHash(entry.hash)} · ${truncated}`;
}

export function InfoHistorySection({ filePath, currentUser, onRestored }: InfoHistorySectionProps) {
  const repoPath = useAppStore((s) => s.repoPath);
  const currentBranch = useAppStore((s) => s.currentBranch);
  const setNotice = useAppStore((s) => s.setNotice);
  const setError = useAppStore((s) => s.setError);
  const setStatus = useProjectStore((s) => s.setStatus);

  const [collapsed, setCollapsed] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [commits, setCommits] = useState<CommitLogEntry[]>([]);
  const [selectedCommit, setSelectedCommit] = useState("");
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);

  useEffect(() => {
    if (!repoPath) return;
    let cancelled = false;
    const loadBranches = async () => {
      try {
        const list = await fetchBranchList();
        if (cancelled) return;
        const names = list.map((b) => b.name);
        setBranches(names);
        const saved = loadFileHistoryBranch(repoPath);
        const initial =
          saved && names.includes(saved)
            ? saved
            : currentBranch && names.includes(currentBranch)
              ? currentBranch
              : names[0] ?? "";
        setBranch(initial);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };
    void loadBranches();
    return () => {
      cancelled = true;
    };
  }, [repoPath, currentBranch, setError]);

  useEffect(() => {
    if (!branch || !filePath) {
      setCommits([]);
      setSelectedCommit("");
      return;
    }
    let cancelled = false;
    const loadLog = async () => {
      setLoading(true);
      try {
        const result = await fetchFileLog(branch, filePath, 100);
        if (cancelled) return;
        setCommits(result.commits);
        setSelectedCommit(result.commits[0]?.hash ?? "");
        if (result.capped) {
          setNotice("Showing latest 100 commits for this file");
        }
      } catch (err) {
        if (!cancelled) {
          setCommits([]);
          setSelectedCommit("");
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadLog();
    return () => {
      cancelled = true;
    };
  }, [branch, filePath, setError, setNotice]);

  const handleBranchChange = (value: string) => {
    setBranch(value);
    if (repoPath) saveFileHistoryBranch(repoPath, value);
    setSelectedCommit("");
  };

  const checkLockBeforeRevert = async (): Promise<boolean> => {
    const locks = await fetchLockList();
    const lock = locks.find((entry) => entry.file_path === filePath);
    if (!lock) return true;
    if (lock.user === currentUser || !currentUser) return true;
    setError(`File is locked by ${lock.user}`);
    return false;
  };

  const handleRevertConfirm = async () => {
    if (!selectedCommit) return;
    setActing(true);
    setError(null);
    try {
      const allowed = await checkLockBeforeRevert();
      if (!allowed) return;
      await restoreFile(selectedCommit, [filePath]);
      const status = await fetchStatus();
      setStatus(status);
      setNotice(`Restored ${filePath} from commit ${shortHash(selectedCommit)}`);
      setRevertOpen(false);
      onRestored();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  };

  const handleCompare = async () => {
    if (!selectedCommit) return;
    setActing(true);
    setError(null);
    try {
      const path = await compareExtract(selectedCommit);
      setNotice(path ? `Extracted to ${path}` : "Extracted to .DFM/tmp_review");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  };

  return (
    <section className="border-t border-border pt-3">
      <button
        type="button"
        className="mb-2 flex w-full items-center justify-between text-sm font-semibold"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span>History</span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {!collapsed ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="history-branch">
              Branch
            </label>
            <select
              id="history-branch"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={branch}
              onChange={(e) => handleBranchChange(e.target.value)}
              disabled={loading || branches.length === 0}
            >
              {branches.length === 0 ? (
                <option value="">No branches</option>
              ) : (
                branches.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="history-commit">
              Commit
            </label>
            <select
              id="history-commit"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedCommit}
              onChange={(e) => setSelectedCommit(e.target.value)}
              disabled={loading || commits.length === 0}
            >
              {commits.length === 0 ? (
                <option value="">
                  {loading ? "Loading…" : "No commits for this file"}
                </option>
              ) : (
                commits.map((entry) => (
                  <option key={entry.hash} value={entry.hash}>
                    {commitLabel(entry)} · {formatTimestamp(entry.timestamp)}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={!selectedCommit || acting}
              onClick={() => void (async () => {
                if (!(await checkLockBeforeRevert())) return;
                setRevertOpen(true);
              })()}
            >
              Revert
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={!selectedCommit || acting}
              onClick={() => void handleCompare()}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Compare
            </Button>
          </div>
        </div>
      ) : null}

      <AlertDialog
        open={revertOpen}
        title="Revert file"
        description={`Overwrite file in working directory with version from commit ${shortHash(selectedCommit)}?`}
        confirmLabel="Revert"
        loading={acting}
        onConfirm={() => void handleRevertConfirm()}
        onCancel={() => setRevertOpen(false)}
      />
    </section>
  );
}
