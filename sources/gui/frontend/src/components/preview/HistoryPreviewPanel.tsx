import { useEffect, useMemo, useState } from "react";

import { ChangedFilesList } from "@/components/preview/ChangedFilesList";
import { DiffView } from "@/components/preview/DiffView";
import { PreviewCommitHeader } from "@/components/preview/PreviewCommitHeader";
import { useAppStore } from "@/stores/appStore";
import { useHistoryStore } from "@/stores/historyStore";
import {
  fetchBranchLog,
  fetchDiffNameStatus,
  fetchDiffStat,
  fetchDiffText,
  fetchStatus,
  type CommitLogEntry,
  type DiffFileEntry,
} from "@/wails/forester";

function sortFiles(files: DiffFileEntry[]): DiffFileEntry[] {
  return [...files].sort((a, b) => a.path.localeCompare(b.path));
}

export function HistoryPreviewPanel() {
  const repoPath = useAppStore((s) => s.repoPath);
  const setNotice = useAppStore((s) => s.setNotice);
  const selectedCommitHash = useHistoryStore((s) => s.selectedCommitHash);
  const selectedChangedFilePath = useHistoryStore((s) => s.selectedChangedFilePath);
  const setSelectedChangedFilePath = useHistoryStore((s) => s.setSelectedChangedFilePath);

  const [commit, setCommit] = useState<CommitLogEntry | null>(null);
  const [headHash, setHeadHash] = useState<string | null>(null);
  const [files, setFiles] = useState<DiffFileEntry[]>([]);
  const [stats, setStats] = useState<{
    files_changed: number;
    insertions: number;
    deletions: number;
  } | null>(null);
  const [diffContent, setDiffContent] = useState("");
  const [isBinary, setIsBinary] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoPath || !selectedCommitHash) {
      setCommit(null);
      setFiles([]);
      setStats(null);
      setDiffContent("");
      setDiffError(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingCommit(true);
      setLoadingFiles(true);
      setStats(null);
      try {
        const branch = useAppStore.getState().currentBranch ?? "main";
        const log = await fetchBranchLog(branch);
        const found = (log.commits ?? []).find((c) => c.hash === selectedCommitHash) ?? null;
        if (cancelled) return;
        setCommit(found);
        const status = await fetchStatus();
        if (!cancelled) {
          setHeadHash(typeof status.head_commit === "string" ? status.head_commit : null);
        }
        if (!found) {
          setFiles([]);
          return;
        }
        const nameStatus = await fetchDiffNameStatus(selectedCommitHash, found);
        if (cancelled) return;
        const sorted = sortFiles(nameStatus.files ?? []);
        setFiles(sorted);
        setLoadingFiles(false);
        const stat = await fetchDiffStat(selectedCommitHash, found);
        if (!cancelled) setStats(stat);
        if (sorted.length > 0) {
          const first = sorted[0]!.path;
          const saved = useHistoryStore.getState().selectedChangedFilePath;
          const pick = saved && sorted.some((f) => f.path === saved) ? saved : first;
          setSelectedChangedFilePath(pick);
        } else {
          setSelectedChangedFilePath(null);
        }
      } catch (err) {
        if (!cancelled) {
          setDiffError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoadingCommit(false);
          setLoadingFiles(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [repoPath, selectedCommitHash, setSelectedChangedFilePath]);

  const selectedFile = useMemo(
    () => files.find((f) => f.path === selectedChangedFilePath) ?? null,
    [files, selectedChangedFilePath],
  );

  useEffect(() => {
    if (!selectedCommitHash || !commit || !selectedChangedFilePath || !selectedFile) {
      setDiffContent("");
      setDiffError(null);
      setIsBinary(false);
      return;
    }
    if (selectedFile.status === "D") {
      setDiffContent("");
      setDiffError(null);
      setIsBinary(false);
      return;
    }

    let cancelled = false;
    const loadDiff = async () => {
      setLoadingDiff(true);
      setDiffError(null);
      try {
        const result = await fetchDiffText(selectedCommitHash, commit, selectedChangedFilePath);
        if (cancelled) return;
        if (result.is_binary) {
          setIsBinary(true);
          setDiffContent("");
        } else {
          setIsBinary(false);
          setDiffContent(result.content ?? "");
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setDiffError(message === "file_too_large" ? "File too large to display" : message);
          setDiffContent("");
        }
      } finally {
        if (!cancelled) setLoadingDiff(false);
      }
    };
    void loadDiff();
    return () => {
      cancelled = true;
    };
  }, [selectedCommitHash, commit, selectedChangedFilePath, selectedFile]);

  if (!repoPath) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Open a repository to view commit history
      </div>
    );
  }

  if (!selectedCommitHash) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a commit to view changes
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PreviewCommitHeader
        commit={commit}
        isHead={headHash === selectedCommitHash}
        loading={loadingCommit}
        stats={stats}
        onCopy={() => setNotice("Copied commit hash")}
      />
      <div className="flex min-h-0 flex-1">
        <ChangedFilesList
          files={files}
          selectedPath={selectedChangedFilePath}
          loading={loadingFiles}
          onSelect={setSelectedChangedFilePath}
        />
        <div className="min-w-0 flex-1">
          <DiffView
            file={selectedFile}
            diffContent={diffContent}
            isBinary={isBinary}
            loading={loadingDiff}
            error={diffError}
          />
        </div>
      </div>
    </div>
  );
}
