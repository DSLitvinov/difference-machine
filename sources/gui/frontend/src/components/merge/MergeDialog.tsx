import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Filter, GitMerge, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fileExtension } from "@/lib/fileKinds";
import { shortHash } from "@/lib/format";
import { translate, useT, type TranslationKey } from "@/lib/i18n";
import { diffStatusBadgeClass } from "@/lib/vcsBadge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import {
  fetchBranchList,
  fetchDiffNameStatusBetween,
  fetchMergeStatus,
  fetchObjectsByFile,
  mergeContinue,
  mergeStart,
  type DiffFileEntry,
  type MergeConflictEntry,
  type MergeObjectEntry,
  type MergeStatusPayload,
} from "@/wails/forester";

function formatMergeConflictMessage(
  conflicts: MergeConflictEntry[],
  t: ReturnType<typeof useT>,
  taggedMarkCounts: Record<string, number>,
): string {
  if (conflicts.length === 0) {
    return t("merge.conflictsBlocking").trim();
  }
  const lines: string[] = [t("merge.conflictsSummary", { count: conflicts.length })];
  for (const conflict of conflicts) {
    if (conflict.kind === "binary") {
      const markCount = taggedMarkCounts[conflict.path] ?? 0;
      if (markCount > 0) {
        lines.push(
          t("merge.conflictBinaryFile", {
            path: conflict.path,
            theirs: `.DFM/merge_theirs/${conflict.path}`,
            count: markCount,
          }),
        );
      } else {
        lines.push(
          t("merge.conflictBinaryNoMarks", {
            path: conflict.path,
            theirs: `.DFM/merge_theirs/${conflict.path}`,
          }),
        );
      }
    } else {
      lines.push(t("merge.conflictTextFile", { path: conflict.path }));
    }
  }
  lines.push(t("merge.conflictsRetryHint"));
  return lines.join("\n\n");
}

function objectTagKey(tags: string[] | undefined): TranslationKey {
  if (!tags?.length) return "merge.objectChanged";
  const upper = tags.map((t) => t.toUpperCase());
  if (upper.includes("DELETE")) return "merge.objectDelete";
  if (upper.includes("RENAME")) return "merge.objectRename";
  if (upper.includes("MERGE")) return "merge.objectMerge";
  return "merge.objectChanged";
}

function isBlendPath(path: string): boolean {
  return fileExtension(path) === "blend";
}

function extensionKey(path: string): string {
  return fileExtension(path) || "(none)";
}

function extensionLabel(ext: string, t: ReturnType<typeof useT>): string {
  if (ext === "(none)") return t("merge.extensionNone");
  return `.${ext}`;
}

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "preview" | "continue";
  targetBranch: string;
  currentBranch: string;
  author: string;
  mergeStatus?: MergeStatusPayload | null;
  onCompleted: (result?: { hash?: string }) => void | Promise<void>;
  onError?: (message: string) => void;
}

export function MergeDialog({
  open,
  onOpenChange,
  mode,
  targetBranch,
  currentBranch,
  author,
  mergeStatus,
  onCompleted,
  onError,
}: MergeDialogProps) {
  const t = useT();
  const [files, setFiles] = useState<DiffFileEntry[]>([]);
  const [diffFromHead, setDiffFromHead] = useState("");
  const [diffToHead, setDiffToHead] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [objects, setObjects] = useState<MergeObjectEntry[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [objectCounts, setObjectCounts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [hiddenExtensions, setHiddenExtensions] = useState<Set<string>>(new Set());
  const [liveMergeStatus, setLiveMergeStatus] = useState<MergeStatusPayload | null>(null);
  const [conflictTaggedMarkCounts, setConflictTaggedMarkCounts] = useState<Record<string, number>>({});
  const objectsRequestRef = useRef(0);
  const prevOpenRef = useRef(false);

  const effectiveMergeStatus = liveMergeStatus ?? mergeStatus;
  const mergeInProgress = Boolean(effectiveMergeStatus?.in_progress);
  const effectiveMode: "preview" | "continue" = mergeInProgress ? "continue" : mode;
  const conflicts = effectiveMergeStatus?.conflicts ?? [];
  const conflictPathSet = useMemo(() => new Set(conflicts.map((c) => c.path)), [conflicts]);

  const conflictBlocking =
    effectiveMode === "continue" &&
    Boolean(effectiveMergeStatus?.has_conflicts || conflicts.length > 0);
  const visibleError =
    mergeError ??
    (conflictBlocking
      ? formatMergeConflictMessage(conflicts, t, conflictTaggedMarkCounts)
      : null);

  useEffect(() => {
    if (!open || conflicts.length === 0) {
      setConflictTaggedMarkCounts({});
      return;
    }
    const commitHash =
      effectiveMergeStatus?.current_head ?? effectiveMergeStatus?.from ?? diffFromHead;
    if (!commitHash) {
      setConflictTaggedMarkCounts({});
      return;
    }
    let cancelled = false;
    void Promise.all(
      conflicts
        .filter((conflict) => conflict.kind === "binary")
        .map(async (conflict) => {
          const result = await fetchObjectsByFile(conflict.path, commitHash);
          const tagged = (result.objects ?? []).filter((obj) => (obj.tags?.length ?? 0) > 0);
          return [conflict.path, tagged.length] as const;
        }),
    ).then((entries) => {
      if (cancelled) return;
      setConflictTaggedMarkCounts(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [conflicts, diffFromHead, effectiveMergeStatus, open]);

  const availableExtensions = useMemo(() => {
    const extensions = new Set<string>();
    for (const file of files) {
      extensions.add(extensionKey(file.path));
    }
    return Array.from(extensions).sort((a, b) => a.localeCompare(b));
  }, [files]);

  const filteredFiles = useMemo(() => {
    const query = fileSearchQuery.trim().toLowerCase();
    return files.filter((file) => {
      const ext = extensionKey(file.path);
      if (hiddenExtensions.has(ext)) return false;
      if (!query) return true;
      return file.path.toLowerCase().includes(query);
    });
  }, [files, fileSearchQuery, hiddenExtensions]);

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      let from = "";
      let to = "";
      if (effectiveMode === "continue" && effectiveMergeStatus?.from && effectiveMergeStatus?.to) {
        from = effectiveMergeStatus.from;
        to = effectiveMergeStatus.to;
      } else {
        const branches = await fetchBranchList();
        const current = branches.find((b) => b.name === currentBranch);
        const target = branches.find((b) => b.name === targetBranch);
        from = current?.commit_hash ?? "";
        to = target?.commit_hash ?? "";
      }
      if (!from || !to) {
        setFiles([]);
        return;
      }
      const result = await fetchDiffNameStatusBetween(from, to);
      const nextFiles = result.files ?? [];
      setDiffFromHead(from);
      setDiffToHead(to);
      setFiles(nextFiles);
      setSelectedPath(nextFiles[0]?.path ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMergeError(message);
      setFiles([]);
      setSelectedPath(null);
    } finally {
      setLoadingFiles(false);
    }
  }, [currentBranch, effectiveMergeStatus, effectiveMode, targetBranch]);

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      setLiveMergeStatus(null);
      return;
    }
    const isFreshOpen = !prevOpenRef.current;
    prevOpenRef.current = true;
    if (isFreshOpen) {
      setMergeError(null);
      setFileSearchQuery("");
      setHiddenExtensions(new Set());
    }
    void fetchMergeStatus().then(setLiveMergeStatus).catch(() => setLiveMergeStatus(null));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void loadFiles();
  }, [open, loadFiles]);

  useEffect(() => {
    if (!selectedPath) return;
    if (filteredFiles.some((file) => file.path === selectedPath)) return;
    setSelectedPath(filteredFiles[0]?.path ?? null);
  }, [filteredFiles, selectedPath]);

  useEffect(() => {
    if (!open || !selectedPath) {
      setObjects([]);
      return;
    }
    if (!isBlendPath(selectedPath)) {
      setObjects([]);
      return;
    }
    const primaryHash = diffFromHead;
    const fallbackHash = effectiveMode === "continue" ? "" : diffToHead;
    if (!primaryHash && !fallbackHash) {
      setObjects([]);
      return;
    }

    const requestId = objectsRequestRef.current + 1;
    objectsRequestRef.current = requestId;
    setLoadingObjects(true);
    void (async () => {
      let list: MergeObjectEntry[] = [];
      if (primaryHash) {
        const result = await fetchObjectsByFile(selectedPath, primaryHash);
        const tagged = (result.objects ?? []).filter((obj) => (obj.tags?.length ?? 0) > 0);
        list = tagged;
      }
      if (list.length === 0 && fallbackHash && fallbackHash !== primaryHash) {
        const result = await fetchObjectsByFile(selectedPath, fallbackHash);
        const tagged = (result.objects ?? []).filter((obj) => (obj.tags?.length ?? 0) > 0);
        list = tagged;
      }
      return list;
    })()
      .then((list) => {
        if (objectsRequestRef.current !== requestId) return;
        setObjects(list);
        if (list.length > 0) {
          setObjectCounts((prev) => ({ ...prev, [selectedPath]: list.length }));
        }
      })
      .catch(() => {
        if (objectsRequestRef.current !== requestId) return;
        setObjects([]);
      })
      .finally(() => {
        if (objectsRequestRef.current === requestId) {
          setLoadingObjects(false);
        }
      });
  }, [diffFromHead, diffToHead, effectiveMode, open, selectedPath]);

  const objectsVisible =
    selectedPath !== null &&
    isBlendPath(selectedPath) &&
    !loadingObjects &&
    objects.length > 0;

  const selectedObjectCount = selectedPath ? objectCounts[selectedPath] ?? objects.length : 0;
  const typeFilterActive = hiddenExtensions.size > 0;

  const mergeDisabled =
    submitting ||
    files.length === 0 ||
    conflictBlocking;

  const toggleExtensionFilter = (ext: string, checked: boolean) => {
    setHiddenExtensions((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.delete(ext);
      } else {
        next.add(ext);
      }
      return next;
    });
  };

  const handleMerge = async () => {
    setSubmitting(true);
    setMergeError(null);
    try {
      const result =
        effectiveMode === "continue"
          ? await mergeContinue()
          : await mergeStart(targetBranch, { no_ff: true });

      if (result.in_progress) {
        const status = await fetchMergeStatus();
        setLiveMergeStatus(status);
        onError?.(
          status.has_conflicts
            ? formatMergeConflictMessage(status.conflicts ?? [], t, conflictTaggedMarkCounts)
            : "",
        );
        if (result.has_conflicts) {
          setMergeError(
            formatMergeConflictMessage(status.conflicts ?? [], t, conflictTaggedMarkCounts),
          );
        }
        return;
      }

      if (!result.success) {
        const message = t("merge.failed");
        setMergeError(message);
        onError?.(message);
        return;
      }

      onOpenChange(false);
      await onCompleted({ hash: result.hash });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMergeError(message);
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-auto max-w-[min(calc(100vw-2rem),64rem)] gap-4 p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            {t("merge.title")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t("merge.mergingBranches", { target: targetBranch, current: currentBranch })}
          </p>
          <div>
            <p className="text-sm text-muted-foreground">{t("commit.author")}</p>
            <p className="text-sm">{author || t("common.unknown")}</p>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {visibleError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>{t("merge.errorTitle")}</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap break-words">
                {visibleError}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex items-center gap-2">
            <Input
              value={fileSearchQuery}
              placeholder={t("merge.searchPlaceholder")}
              className="h-9 min-h-9 flex-1"
              onChange={(event) => setFileSearchQuery(event.target.value)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={cn("h-10 w-10 shrink-0", typeFilterActive && "border-ring bg-accent")}
                  title={t("merge.filterTypes")}
                  disabled={availableExtensions.length === 0}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[12rem]">
                <DropdownMenuLabel>{t("merge.filterTypes")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableExtensions.length === 0 ? (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">{t("merge.noFiles")}</p>
                ) : (
                  availableExtensions.map((ext) => (
                    <DropdownMenuCheckboxItem
                      key={ext}
                      checked={!hiddenExtensions.has(ext)}
                      onCheckedChange={(checked) => toggleExtensionFilter(ext, checked === true)}
                    >
                      {extensionLabel(ext, t)}
                    </DropdownMenuCheckboxItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex max-h-[70vh] overflow-hidden rounded-md border border-border">
            <div className="flex min-w-[14rem] max-w-[32rem] flex-col border-r border-border">
              <div className="flex h-[38px] shrink-0 items-center bg-accent px-2 text-xs font-medium">
                {loadingFiles
                  ? `${t("common.loading")}…`
                  : t("commit.filesChanged", { count: filteredFiles.length })}
              </div>
              <div className="overflow-y-auto">
                {filteredFiles.length === 0 && !loadingFiles ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    {files.length === 0 ? t("merge.noFiles") : t("merge.noMatchingFiles")}
                  </p>
                ) : (
                  filteredFiles.map((file) => {
                    const selected = selectedPath === file.path;
                    const blendObjects = objectCounts[file.path] ?? 0;
                    const isConflict = conflictPathSet.has(file.path);
                    return (
                      <button
                        key={file.path}
                        type="button"
                        className={cn(
                          "flex w-full items-start gap-2 border-b border-border p-3 text-left text-sm",
                          selected ? "bg-primary text-primary-foreground" : "bg-background text-foreground",
                        )}
                        title={file.path}
                        onClick={() => setSelectedPath(file.path)}
                      >
                        <span className="min-w-0 flex-1 break-words">/{file.path}</span>
                        {isConflict ? (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                              selected
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-destructive/15 text-destructive",
                            )}
                          >
                            {t("merge.conflictBadge")}
                          </span>
                        ) : null}
                        {selected && isBlendPath(file.path) && blendObjects > 0 ? (
                          <Badge variant="secondary" className="shrink-0 rounded-full">
                            {t("merge.viewObject")}
                          </Badge>
                        ) : file.status ? (
                          <span
                            className={cn(
                              "flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                              selected
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : diffStatusBadgeClass(file.status),
                            )}
                          >
                            {file.status}
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex min-w-[14rem] max-w-[32rem] flex-col">
              <div className="flex h-[38px] shrink-0 items-center bg-accent px-2 text-xs font-medium">
                {objectsVisible
                  ? selectedObjectCount === 1
                    ? t("merge.oneObjectBlend")
                    : t("merge.objectsBlend", { count: selectedObjectCount })
                  : t("merge.objectsNotDetected")}
              </div>
              <div className="overflow-y-auto">
                {loadingObjects ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("merge.loadingObjects")}
                  </div>
                ) : objectsVisible ? (
                  objects.map((obj) => (
                    <div
                      key={obj.object_name}
                      className="flex items-start justify-between gap-2 border-b border-border p-3"
                      title={obj.metadata ? JSON.stringify(obj.metadata) : obj.object_name}
                    >
                      <span className="min-w-0 flex-1 break-words text-sm">{obj.object_name}</span>
                      <Badge variant="default" className="shrink-0 rounded-full capitalize">
                        {t(objectTagKey(obj.tags))}
                      </Badge>
                    </div>
                  ))
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={mergeDisabled} onClick={() => void handleMerge()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("merge.merging")}
              </>
            ) : (
              t("merge.action")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function mergeSuccessNotice(hash: string): Promise<string> {
  const short = shortHash(hash);
  const language = useAppStore.getState().language;
  return short ? translate(language, "merge.successCommit", { hash: short }) : translate(language, "merge.completed");
}
