import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChangedFilesList } from "@/components/preview/ChangedFilesList";
import { DiffView } from "@/components/preview/DiffView";
import { PreviewCommitHeader } from "@/components/preview/PreviewCommitHeader";
import { useResizableWidth } from "@/hooks/useResizableWidth";
import { classifyHistoryDiff } from "@/lib/fileKinds";
import {
  loadHistoryFilesPanelWidth,
  loadHistoryImageLayout,
  loadHistoryTextLayout,
  saveHistoryFilesPanelWidth,
  saveHistoryImageLayout,
  saveHistoryTextLayout,
  type HistoryImageLayout,
  type HistoryTextLayout,
} from "@/lib/storage";
import { useAppStore } from "@/stores/appStore";
import { useHistoryStore } from "@/stores/historyStore";
import {
  base64ToObjectUrl,
  fetchBlob,
  fetchBranchLog,
  fetchDiffNameStatus,
  fetchDiffStat,
  fetchDiffText,
  fetchStatus,
  firstParentHash,
  openCommitFile,
  type CommitLogEntry,
  type DiffFileEntry,
} from "@/wails/forester";

function sortFiles(files: DiffFileEntry[]): DiffFileEntry[] {
  return [...files].sort((a, b) => a.path.localeCompare(b.path));
}

export function HistoryPreviewPanel() {
  const repoPath = useAppStore((s) => s.repoPath);
  const setNotice = useAppStore((s) => s.setNotice);
  const setError = useAppStore((s) => s.setError);
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
  const [textLayout, setTextLayout] = useState<HistoryTextLayout>("unified");
  const [imageLayout, setImageLayout] = useState<HistoryImageLayout>("2up");
  const [beforeImageUrl, setBeforeImageUrl] = useState<string | null>(null);
  const [afterImageUrl, setAfterImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const textDiffGeneration = useRef(0);
  const imageDiffGeneration = useRef(0);

  const savedWidth = repoPath ? loadHistoryFilesPanelWidth(repoPath) : null;
  const { width: filesPanelWidth, containerRef, startDrag, resetWidth } = useResizableWidth({
    defaultWidth: savedWidth ?? 373,
    onWidthChange: (next) => {
      if (repoPath) saveHistoryFilesPanelWidth(repoPath, next);
    },
  });

  useEffect(() => {
    if (!repoPath) return;
    setTextLayout(loadHistoryTextLayout(repoPath));
    setImageLayout(loadHistoryImageLayout(repoPath));
  }, [repoPath]);

  const handleTextLayoutChange = (layout: HistoryTextLayout) => {
    setTextLayout(layout);
    if (repoPath) saveHistoryTextLayout(repoPath, layout);
  };

  const handleImageLayoutChange = (layout: HistoryImageLayout) => {
    setImageLayout(layout);
    if (repoPath) saveHistoryImageLayout(repoPath, layout);
  };

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

  const selectedKind = useMemo(() => {
    if (!selectedFile) return null;
    return classifyHistoryDiff(selectedFile.status, selectedFile.path, isBinary);
  }, [selectedFile, isBinary]);

  const isImageDiff = selectedKind === "image";

  const loadTextDiff = useCallback(async () => {
    if (!selectedCommitHash || !commit || !selectedChangedFilePath || !selectedFile) return;
    const generation = ++textDiffGeneration.current;
    const pathAtStart = selectedChangedFilePath;
    setLoadingDiff(true);
    setDiffError(null);
    try {
      const result = await fetchDiffText(selectedCommitHash, commit, selectedChangedFilePath);
      if (generation !== textDiffGeneration.current) return;
      if (useHistoryStore.getState().selectedChangedFilePath !== pathAtStart) return;
      if (result.is_binary) {
        setIsBinary(true);
        setDiffContent("");
      } else {
        setIsBinary(false);
        setDiffContent(result.content ?? "");
      }
    } catch (err) {
      if (generation !== textDiffGeneration.current) return;
      if (useHistoryStore.getState().selectedChangedFilePath !== pathAtStart) return;
      const message = err instanceof Error ? err.message : String(err);
      setDiffError(message === "file_too_large" ? "File too large to display" : message);
      setDiffContent("");
    } finally {
      if (generation === textDiffGeneration.current) setLoadingDiff(false);
    }
  }, [selectedCommitHash, commit, selectedChangedFilePath, selectedFile]);

  const loadImageDiff = useCallback(async () => {
    if (!selectedCommitHash || !commit || !selectedFile) return;
    const generation = ++imageDiffGeneration.current;
    const pathAtStart = selectedFile.path;
    setImageLoading(true);
    setImageError(null);
    setBeforeImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAfterImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    try {
      const parent = firstParentHash(commit);
      let before: string | null = null;
      const beforePath =
        selectedFile.status === "R" && selectedFile.old_path ? selectedFile.old_path : selectedFile.path;
      if (selectedFile.status !== "A" && parent) {
        const blob = await fetchBlob(parent, beforePath);
        if (generation !== imageDiffGeneration.current) return;
        if (useHistoryStore.getState().selectedChangedFilePath !== pathAtStart) return;
        before = base64ToObjectUrl(blob.content_base64, blob.mime);
      }
      const afterBlob = await fetchBlob(selectedCommitHash, selectedFile.path);
      if (generation !== imageDiffGeneration.current) {
        if (before) URL.revokeObjectURL(before);
        return;
      }
      if (useHistoryStore.getState().selectedChangedFilePath !== pathAtStart) {
        if (before) URL.revokeObjectURL(before);
        return;
      }
      const after = base64ToObjectUrl(afterBlob.content_base64, afterBlob.mime);
      setBeforeImageUrl(before);
      setAfterImageUrl(after);
    } catch (err) {
      if (generation !== imageDiffGeneration.current) return;
      if (useHistoryStore.getState().selectedChangedFilePath !== pathAtStart) return;
      setImageError(err instanceof Error ? err.message : String(err));
      setBeforeImageUrl(null);
      setAfterImageUrl(null);
    } finally {
      if (generation === imageDiffGeneration.current) setImageLoading(false);
    }
  }, [selectedCommitHash, commit, selectedFile]);

  useEffect(() => {
    if (!selectedFile || !commit || !selectedCommitHash) {
      setDiffContent("");
      setDiffError(null);
      setIsBinary(false);
      setBeforeImageUrl(null);
      setAfterImageUrl(null);
      setImageError(null);
      return;
    }

    if (selectedFile.status === "D") {
      setDiffContent("");
      setDiffError(null);
      setIsBinary(false);
      return;
    }

    const extKind = classifyHistoryDiff(selectedFile.status, selectedFile.path, false);
    if (extKind === "image") {
      setIsBinary(false);
      setDiffContent("");
      setDiffError(null);
      void loadImageDiff();
      return;
    }

    if (extKind === "binary") {
      setIsBinary(true);
      setDiffContent("");
      setDiffError(null);
      return;
    }

    setIsBinary(false);
    void loadTextDiff();
  }, [selectedFile, commit, selectedCommitHash, loadImageDiff, loadTextDiff]);

  const handleOpenBinary = async () => {
    if (!selectedCommitHash || !selectedChangedFilePath) return;
    try {
      await openCommitFile(selectedCommitHash, selectedChangedFilePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

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
      <div ref={containerRef} className="flex min-h-0 flex-1">
        <ChangedFilesList
          files={files}
          selectedPath={selectedChangedFilePath}
          loading={loadingFiles}
          width={filesPanelWidth}
          onSelect={setSelectedChangedFilePath}
        />
        <div
          className="relative w-1 shrink-0 cursor-col-resize bg-border hover:bg-ring"
          title="Drag to resize; double-click to reset"
          onMouseDown={startDrag}
          onDoubleClick={resetWidth}
        />
        <div className="min-w-0 flex-1">
          <DiffView
            file={selectedFile}
            diffContent={diffContent}
            isBinary={isBinary}
            loading={loadingDiff && selectedKind === "text"}
            error={diffError}
            textLayout={textLayout}
            imageLayout={imageLayout}
            beforeImageUrl={beforeImageUrl}
            afterImageUrl={afterImageUrl}
            imageLoading={imageLoading && isImageDiff}
            imageError={imageError}
            onTextLayoutChange={handleTextLayoutChange}
            onImageLayoutChange={handleImageLayoutChange}
            onRetryText={() => void loadTextDiff()}
            onRetryImage={() => void loadImageDiff()}
            onOpenBinary={handleOpenBinary}
          />
        </div>
      </div>
    </div>
  );
}
