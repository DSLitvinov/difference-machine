import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, GitBranch, Loader2 } from "lucide-react";

import { ConfirmAlertDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownSelector } from "@/components/ui/dropdown-selector";
import { DiffView } from "@/components/preview/DiffView";
import { authorDisplayName } from "@/lib/author";
import { classifyHistoryDiff } from "@/lib/fileKinds";
import { formatTimestamp, shortHash } from "@/lib/format";
import { useT } from "@/lib/i18n";
import {
  loadFileHistoryBranch,
  loadHistoryImageLayout,
  loadHistoryTextLayout,
  saveFileHistoryBranch,
  saveHistoryImageLayout,
  saveHistoryTextLayout,
  type HistoryImageLayout,
  type HistoryTextLayout,
} from "@/lib/storage";
import { diffStatusBadgeClass } from "@/lib/vcsBadge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { fetchRepoUser } from "@/wails/bridge";
import {
  base64ToObjectUrl,
  compareCleanup,
  compareExtract,
  fetchBlob,
  fetchBranchList,
  fetchDiffNameStatus,
  fetchDiffText,
  fetchFileLog,
  fetchLockList,
  fetchStatus,
  openCommitFile,
  openWorkdirPath,
  restoreFile,
  type CommitLogEntry,
  type DiffFileEntry,
  firstParentHash,
} from "@/wails/forester";

const TMP_REVIEW_PATH = ".DFM/tmp_review";

interface FileHistoryViewProps {
  filePath: string;
  onBack: () => void;
}

function commitLabel(entry: CommitLogEntry): string {
  const subject = entry.message.split("\n")[0]?.trim() || "(no message)";
  const truncated = subject.length > 40 ? `${subject.slice(0, 40)}…` : subject;
  return `${shortHash(entry.hash)} · ${truncated}`;
}

function findDiffFile(files: DiffFileEntry[], targetPath: string): DiffFileEntry | null {
  const direct = files.find((f) => f.path === targetPath);
  if (direct) return direct;
  return files.find((f) => f.old_path === targetPath) ?? null;
}

function formatFileHistoryPath(file: DiffFileEntry | null, fallbackPath: string): string {
  if (!file) return `/${fallbackPath}`;
  if (file.status === "R" && file.old_path) {
    return `/${file.old_path} → ${file.path}`;
  }
  return `/${file.path}`;
}

export function FileHistoryView({ filePath, onBack }: FileHistoryViewProps) {
  const t = useT();
  const repoPath = useAppStore((s) => s.repoPath);
  const currentBranch = useAppStore((s) => s.currentBranch);
  const setNotice = useAppStore((s) => s.setNotice);
  const setError = useAppStore((s) => s.setError);
  const setStatus = useProjectStore((s) => s.setStatus);
  const bumpPreviewGeneration = useProjectStore((s) => s.bumpPreviewGeneration);
  const fileHistoryReturnMode = useProjectStore((s) => s.fileHistoryReturnMode);

  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [commits, setCommits] = useState<CommitLogEntry[]>([]);
  const [selectedCommitHash, setSelectedCommitHash] = useState("");
  const [diffFile, setDiffFile] = useState<DiffFileEntry | null>(null);
  const [diffContent, setDiffContent] = useState("");
  const [isBinary, setIsBinary] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [loadingDiffMeta, setLoadingDiffMeta] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [textLayout, setTextLayout] = useState<HistoryTextLayout>("unified");
  const [imageLayout, setImageLayout] = useState<HistoryImageLayout>("2up");
  const [beforeImageUrl, setBeforeImageUrl] = useState<string | null>(null);
  const [afterImageUrl, setAfterImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState("");

  const compareExtractCommitRef = useRef<string | null>(null);
  const textDiffGeneration = useRef(0);
  const imageDiffGeneration = useRef(0);
  const diffMetaGeneration = useRef(0);

  const selectedCommit = useMemo(
    () => commits.find((c) => c.hash === selectedCommitHash) ?? null,
    [commits, selectedCommitHash],
  );

  const selectedKind = useMemo(() => {
    if (!diffFile) return null;
    return classifyHistoryDiff(diffFile.status, diffFile.path, isBinary);
  }, [diffFile, isBinary]);

  const isImageDiff = selectedKind === "image";
  const showCompare = selectedKind === "binary";

  const cleanupCompare = useCallback(async (commitHash: string | null) => {
    if (!commitHash) {
      compareExtractCommitRef.current = null;
      return;
    }
    await compareCleanup(commitHash);
    compareExtractCommitRef.current = null;
  }, []);

  const handleBack = useCallback(() => {
    const hash = compareExtractCommitRef.current;
    if (hash) void cleanupCompare(hash);
    onBack();
  }, [cleanupCompare, onBack]);

  useEffect(() => {
    return () => {
      const hash = compareExtractCommitRef.current;
      if (hash) void compareCleanup(hash);
    };
  }, []);

  useEffect(() => {
    if (!repoPath) return;
    setTextLayout(loadHistoryTextLayout(repoPath));
    setImageLayout(loadHistoryImageLayout(repoPath));
  }, [repoPath]);

  useEffect(() => {
    void fetchRepoUser().then((user) => setCurrentUser(user));
  }, []);

  useEffect(() => {
    if (!repoPath) return;
    let cancelled = false;
    const loadBranches = async () => {
      setLoadingBranches(true);
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
      } finally {
        if (!cancelled) setLoadingBranches(false);
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
      setSelectedCommitHash("");
      return;
    }
    let cancelled = false;
    const loadLog = async () => {
      setLoadingCommits(true);
      try {
        const result = await fetchFileLog(branch, filePath, 100);
        if (cancelled) return;
        setCommits(result.commits);
        setSelectedCommitHash(result.commits[0]?.hash ?? "");
        if (result.capped) {
          setNotice(t("history.latestFileCommits"));
        }
      } catch (err) {
        if (!cancelled) {
          setCommits([]);
          setSelectedCommitHash("");
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoadingCommits(false);
      }
    };
    void loadLog();
    return () => {
      cancelled = true;
    };
  }, [branch, filePath, setError, setNotice, t]);

  useEffect(() => {
    const hash = compareExtractCommitRef.current;
    if (hash && hash !== selectedCommitHash) {
      void cleanupCompare(hash);
    }
  }, [selectedCommitHash, cleanupCompare]);

  useEffect(() => {
    if (!selectedCommitHash || !selectedCommit) {
      setDiffFile(null);
      return;
    }

    const generation = ++diffMetaGeneration.current;
    let cancelled = false;

    const loadMeta = async () => {
      setLoadingDiffMeta(true);
      setDiffFile(null);
      try {
        const nameStatus = await fetchDiffNameStatus(selectedCommitHash, selectedCommit);
        if (cancelled || generation !== diffMetaGeneration.current) return;
        const file = findDiffFile(nameStatus.files ?? [], filePath);
        setDiffFile(file);
      } catch (err) {
        if (cancelled || generation !== diffMetaGeneration.current) return;
        setDiffError(err instanceof Error ? err.message : String(err));
        setDiffFile(null);
      } finally {
        if (!cancelled && generation === diffMetaGeneration.current) {
          setLoadingDiffMeta(false);
        }
      }
    };

    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, [selectedCommitHash, selectedCommit, filePath]);

  const loadTextDiff = useCallback(async () => {
    if (!selectedCommitHash || !selectedCommit || !diffFile) return;
    const generation = ++textDiffGeneration.current;
    const pathAtStart = diffFile.path;
    setLoadingDiff(true);
    setDiffError(null);
    try {
      const result = await fetchDiffText(selectedCommitHash, selectedCommit, diffFile.path);
      if (generation !== textDiffGeneration.current) return;
      if (result.is_binary) {
        setIsBinary(true);
        setDiffContent("");
      } else {
        setIsBinary(false);
        setDiffContent(result.content ?? "");
      }
    } catch (err) {
      if (generation !== textDiffGeneration.current) return;
      const message = err instanceof Error ? err.message : String(err);
      setDiffError(message === "file_too_large" ? t("preview.diffFileTooLarge") : message);
      setDiffContent("");
    } finally {
      if (generation === textDiffGeneration.current) setLoadingDiff(false);
    }
  }, [selectedCommitHash, selectedCommit, diffFile, t]);

  const loadImageDiff = useCallback(async () => {
    if (!selectedCommitHash || !selectedCommit || !diffFile) return;
    const generation = ++imageDiffGeneration.current;
    const pathAtStart = diffFile.path;
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
      const parent = firstParentHash(selectedCommit);
      let before: string | null = null;
      const beforePath =
        diffFile.status === "R" && diffFile.old_path ? diffFile.old_path : diffFile.path;
      if (diffFile.status !== "A" && parent) {
        const blob = await fetchBlob(parent, beforePath);
        if (generation !== imageDiffGeneration.current) return;
        before = base64ToObjectUrl(blob.content_base64, blob.mime);
      }
      const afterBlob = await fetchBlob(selectedCommitHash, diffFile.path);
      if (generation !== imageDiffGeneration.current) {
        if (before) URL.revokeObjectURL(before);
        return;
      }
      const after = base64ToObjectUrl(afterBlob.content_base64, afterBlob.mime);
      setBeforeImageUrl(before);
      setAfterImageUrl(after);
    } catch (err) {
      if (generation !== imageDiffGeneration.current) return;
      if (pathAtStart !== diffFile.path) return;
      setImageError(err instanceof Error ? err.message : String(err));
      setBeforeImageUrl(null);
      setAfterImageUrl(null);
    } finally {
      if (generation === imageDiffGeneration.current) setImageLoading(false);
    }
  }, [selectedCommitHash, selectedCommit, diffFile]);

  useEffect(() => {
    if (!diffFile || !selectedCommit || !selectedCommitHash) {
      setDiffContent("");
      setDiffError(null);
      setIsBinary(false);
      setBeforeImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setAfterImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setImageError(null);
      return;
    }

    if (diffFile.status === "D") {
      setDiffContent("");
      setDiffError(null);
      setIsBinary(false);
      return;
    }

    const extKind = classifyHistoryDiff(diffFile.status, diffFile.path, false);
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
  }, [diffFile, selectedCommit, selectedCommitHash, loadImageDiff, loadTextDiff]);

  const handleTextLayoutChange = (layout: HistoryTextLayout) => {
    setTextLayout(layout);
    if (repoPath) saveHistoryTextLayout(repoPath, layout);
  };

  const handleImageLayoutChange = (layout: HistoryImageLayout) => {
    setImageLayout(layout);
    if (repoPath) saveHistoryImageLayout(repoPath, layout);
  };

  const handleBranchChange = (value: string) => {
    setBranch(value);
    if (repoPath) saveFileHistoryBranch(repoPath, value);
    setSelectedCommitHash("");
    const hash = compareExtractCommitRef.current;
    if (hash) void cleanupCompare(hash);
  };

  const checkLockBeforeRevert = async (): Promise<boolean> => {
    const locks = await fetchLockList();
    const lock = locks.find((entry) => entry.file_path === filePath);
    if (!lock) return true;
    if (lock.user === currentUser || lock.user === authorDisplayName(currentUser)) return true;
    setError(t("history.fileLockedBy", { user: lock.user }));
    return false;
  };

  const handleRevertConfirm = async () => {
    if (!selectedCommitHash) return;
    setActing(true);
    setError(null);
    try {
      const allowed = await checkLockBeforeRevert();
      if (!allowed) return;
      await restoreFile(selectedCommitHash, [filePath]);
      const status = await fetchStatus();
      setStatus(status);
      bumpPreviewGeneration();
      setNotice(t("history.restoredFile", { path: filePath, hash: shortHash(selectedCommitHash) }));
      setRevertOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  };

  const handleCompare = async () => {
    if (!selectedCommitHash) return;
    setActing(true);
    setError(null);
    try {
      const prev = compareExtractCommitRef.current;
      if (prev && prev !== selectedCommitHash) {
        await cleanupCompare(prev);
      }
      const path = await compareExtract(selectedCommitHash);
      compareExtractCommitRef.current = selectedCommitHash;
      await openWorkdirPath(TMP_REVIEW_PATH);
      setNotice(t("commit.compareOpened", { path: path || TMP_REVIEW_PATH }));
    } catch (err) {
      compareExtractCommitRef.current = null;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  };

  const handleOpenBinary = async () => {
    if (!selectedCommitHash || !diffFile) return;
    try {
      await openCommitFile(selectedCommitHash, diffFile.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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

  const displayPath = formatFileHistoryPath(diffFile, filePath);
  const controlsDisabled = loadingBranches || loadingCommits || acting;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            title={
              fileHistoryReturnMode === "fileViewer"
                ? t("fileHistory.backToViewer")
                : t("fileHistory.back")
            }
            onClick={handleBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0 flex-1">
            <DropdownSelector
              value={branch}
              options={branchOptions}
              placeholder={t("history.selectBranch")}
              disabled={controlsDisabled || branches.length === 0}
              icon={<GitBranch className="h-4 w-4" />}
              onChange={handleBranchChange}
            />
          </div>

          <div className="min-w-0 flex-1">
            <DropdownSelector
              value={selectedCommitHash}
              options={commitOptions}
              placeholder={loadingCommits ? `${t("common.loading")}…` : t("history.noCommitsForFile")}
              disabled={controlsDisabled || commits.length === 0}
              onChange={setSelectedCommitHash}
            />
          </div>

          {showCompare ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0"
              disabled={!selectedCommitHash || controlsDisabled}
              onClick={() => void handleCompare()}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("common.compare")}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="default"
            className="h-10 shrink-0"
            disabled={!selectedCommitHash || controlsDisabled}
            onClick={() => void (async () => {
              if (!(await checkLockBeforeRevert())) return;
              setRevertOpen(true);
            })()}
          >
            {t("commit.revertAction")}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-accent px-2 py-2">
        <p className="min-w-0 flex-1 truncate text-xs" title={displayPath.replace(/^\//, "")}>
          {displayPath}
        </p>
        {diffFile ? (
          <Badge
            className={cn(
              "shrink-0 rounded-full px-3 text-xs font-semibold",
              diffStatusBadgeClass(diffFile.status),
            )}
          >
            {diffFile.status}
          </Badge>
        ) : loadingDiffMeta ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <div className="min-h-0 flex-1">
        {!selectedCommitHash || commits.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t("history.noCommitsForFile")}
          </div>
        ) : loadingDiffMeta ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t("common.loading")}…
          </div>
        ) : (
          <DiffView
            file={diffFile}
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
            hidePathInToolbar
            onTextLayoutChange={handleTextLayoutChange}
            onImageLayoutChange={handleImageLayoutChange}
            onRetryText={() => void loadTextDiff()}
            onRetryImage={() => void loadImageDiff()}
            onOpenBinary={handleOpenBinary}
          />
        )}
      </div>

      <ConfirmAlertDialog
        open={revertOpen}
        title={t("history.revertFile")}
        description={t("history.revertFileDescription", { hash: shortHash(selectedCommitHash) })}
        confirmLabel={t("commit.revertAction")}
        loading={acting}
        onConfirm={() => void handleRevertConfirm()}
        onCancel={() => setRevertOpen(false)}
      />
    </div>
  );
}
