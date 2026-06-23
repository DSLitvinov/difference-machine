import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, GitBranch, Loader2 } from "lucide-react";

import { ConfirmAlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownSelector } from "@/components/ui/dropdown-selector";
import { Toggle } from "@/components/ui/toggle";
import { formatTimestamp, shortHash } from "@/lib/format";
import { loadFileHistoryBranch, saveFileHistoryBranch } from "@/lib/storage";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import {
  compareCleanup,
  compareExtract,
  fetchBranchList,
  fetchFileLog,
  fetchLockList,
  fetchStatus,
  openWorkdirPath,
  restoreFile,
  type CommitLogEntry,
} from "@/wails/forester";

interface InfoHistorySectionProps {
  filePath: string;
  currentUser: string;
  onRestored: () => void;
}

const TMP_REVIEW_PATH = ".DFM/tmp_review";

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
  const [compareActive, setCompareActive] = useState(false);
  const [compareCommit, setCompareCommit] = useState<string | null>(null);
  const compareCommitRef = useRef<string | null>(null);

  const stopCompare = useCallback(async (commitHash: string | null) => {
    if (!commitHash) {
      setCompareActive(false);
      setCompareCommit(null);
      compareCommitRef.current = null;
      return;
    }
    await compareCleanup(commitHash);
    setCompareActive(false);
    setCompareCommit(null);
    compareCommitRef.current = null;
  }, []);

  useEffect(() => {
    compareCommitRef.current = compareCommit;
  }, [compareCommit]);

  useEffect(() => {
    return () => {
      const hash = compareCommitRef.current;
      if (hash) {
        void compareCleanup(hash);
      }
    };
  }, []);

  useEffect(() => {
    const hash = compareCommitRef.current;
    if (!hash) return;
    void stopCompare(hash);
  }, [filePath, stopCompare]);

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

  useEffect(() => {
    if (compareActive && compareCommit && selectedCommit !== compareCommit) {
      void stopCompare(compareCommit);
    }
  }, [selectedCommit, compareActive, compareCommit, stopCompare]);

  const handleBranchChange = (value: string) => {
    setBranch(value);
    if (repoPath) saveFileHistoryBranch(repoPath, value);
    setSelectedCommit("");
    if (compareCommitRef.current) {
      void stopCompare(compareCommitRef.current);
    }
  };

  const handleCommitChange = (value: string) => {
    setSelectedCommit(value);
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

  const handleCompareToggle = async (pressed: boolean) => {
    if (!selectedCommit) return;
    if (pressed && compareActive) return;

    setActing(true);
    setError(null);
    try {
      if (pressed) {
        if (compareCommit && compareCommit !== selectedCommit) {
          await stopCompare(compareCommit);
        }
        const path = await compareExtract(selectedCommit);
        await openWorkdirPath(TMP_REVIEW_PATH);
        setCompareActive(true);
        setCompareCommit(selectedCommit);
        setNotice(path ? `Compare opened: ${path}` : `Compare opened: ${TMP_REVIEW_PATH}`);
        return;
      }

      await stopCompare(compareCommit ?? selectedCommit);
    } catch (err) {
      setCompareActive(false);
      setCompareCommit(null);
      compareCommitRef.current = null;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  };

  const branchOptions = useMemo(
    () => branches.map((name) => ({ value: name, label: name })),
    [branches],
  );

  const commitOptions = useMemo(
    () =>
      commits.map((entry) => ({
        value: entry.hash,
        label: commitLabel(entry),
        title: `${commitLabel(entry)} · ${formatTimestamp(entry.timestamp)}`,
      })),
    [commits],
  );

  return (
    <section className="border-t border-border pt-3">
      <Button
        type="button"
        variant="ghost"
        className="mb-2 h-auto w-full justify-between px-0 py-0 text-sm font-semibold hover:bg-transparent"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span>History</span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </Button>

      {!collapsed ? (
        <div className="space-y-3">
          <DropdownSelector
            label="Branch"
            value={branch}
            options={branchOptions}
            placeholder="Select branch…"
            disabled={loading || branches.length === 0}
            icon={<GitBranch className="h-4 w-4" />}
            onChange={handleBranchChange}
          />

          <DropdownSelector
            label="Commit"
            value={selectedCommit}
            options={commitOptions}
            placeholder={loading ? "Loading…" : "No commits for this file"}
            disabled={loading || commits.length === 0}
            onChange={handleCommitChange}
          />

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
            <Toggle
              variant="outline"
              className="h-9 flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:data-[state=on]:bg-primary hover:data-[state=on]:text-primary-foreground"
              pressed={compareActive}
              disabled={!selectedCommit || acting}
              onPressedChange={(pressed) => void handleCompareToggle(pressed)}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Compare
            </Toggle>
          </div>
        </div>
      ) : null}

      <ConfirmAlertDialog
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
