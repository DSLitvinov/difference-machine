import { useCallback, useEffect, useRef, useState } from "react";
import { GitMerge, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fileExtension } from "@/lib/fileKinds";
import { shortHash } from "@/lib/format";
import { translate, useT, type TranslationKey } from "@/lib/i18n";
import { diffStatusBadgeClass } from "@/lib/vcsBadge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import {
  fetchBranchList,
  fetchDiffNameStatusBetween,
  fetchObjectsByFile,
  mergeContinue,
  mergeStart,
  type DiffFileEntry,
  type MergeObjectEntry,
  type MergeStatusPayload,
} from "@/wails/forester";

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
  const [diffToHead, setDiffToHead] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [objects, setObjects] = useState<MergeObjectEntry[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [objectCounts, setObjectCounts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const objectsRequestRef = useRef(0);

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      let from = "";
      let to = "";
      if (mode === "continue" && mergeStatus?.from && mergeStatus?.to) {
        from = mergeStatus.from;
        to = mergeStatus.to;
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
      setDiffToHead(to);
      setFiles(nextFiles);
      setSelectedPath(nextFiles[0]?.path ?? null);
    } finally {
      setLoadingFiles(false);
    }
  }, [currentBranch, mergeStatus, mode, targetBranch]);

  useEffect(() => {
    if (!open) return;
    void loadFiles();
  }, [open, loadFiles]);

  useEffect(() => {
    if (!open || !selectedPath) {
      setObjects([]);
      return;
    }
    if (!isBlendPath(selectedPath)) {
      setObjects([]);
      return;
    }
    const commitHash =
      mode === "continue" && mergeStatus?.target_head
        ? mergeStatus.target_head
        : diffToHead;
    if (!commitHash) {
      setObjects([]);
      return;
    }

    const requestId = objectsRequestRef.current + 1;
    objectsRequestRef.current = requestId;
    setLoadingObjects(true);
    void fetchObjectsByFile(selectedPath, commitHash)
      .then((result) => {
        if (objectsRequestRef.current !== requestId) return;
        const list = result.objects ?? [];
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
  }, [diffToHead, mergeStatus?.target_head, mode, open, selectedPath]);

  const objectsVisible =
    selectedPath !== null &&
    isBlendPath(selectedPath) &&
    !loadingObjects &&
    objects.length > 0;

  const selectedObjectCount = selectedPath ? objectCounts[selectedPath] ?? objects.length : 0;

  const mergeDisabled =
    submitting ||
    files.length === 0 ||
    (mode === "continue" && Boolean(mergeStatus?.has_conflicts));

  const handleMerge = async () => {
    setSubmitting(true);
    try {
      const result =
        mode === "continue"
          ? await mergeContinue()
          : await mergeStart(targetBranch, { no_ff: true });
      onOpenChange(false);
      await onCompleted({ hash: result.hash });
    } catch (err) {
      onError?.(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-4 p-6">
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

        <div className="flex min-h-[280px] max-h-[420px] overflow-hidden rounded-md border border-border">
          <div className="flex min-w-0 flex-1 flex-col border-r border-border">
            <div className="flex h-[38px] shrink-0 items-center bg-accent px-2 text-xs font-medium">
              {loadingFiles ? `${t("common.loading")}…` : t("commit.filesChanged", { count: files.length })}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {files.length === 0 && !loadingFiles ? (
                <p className="p-4 text-sm text-muted-foreground">{t("merge.noFiles")}</p>
              ) : (
                files.map((file) => {
                  const selected = selectedPath === file.path;
                  const blendObjects = objectCounts[file.path] ?? 0;
                  return (
                    <button
                      key={file.path}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 border-b border-border p-4 text-left text-base",
                        selected ? "bg-primary text-primary-foreground" : "bg-background text-foreground",
                      )}
                      title={file.path}
                      onClick={() => setSelectedPath(file.path)}
                    >
                      <span className="min-w-0 flex-1 truncate">/{file.path}</span>
                      {selected && isBlendPath(file.path) && blendObjects > 0 ? (
                        <Badge variant="secondary" className="shrink-0 rounded-full">
                          {t("merge.viewObject")}
                        </Badge>
                      ) : file.status ? (
                        <span
                          className={cn(
                            "flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                            selected ? "bg-primary-foreground/20 text-primary-foreground" : diffStatusBadgeClass(file.status),
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

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-[38px] shrink-0 items-center bg-accent px-2 text-xs font-medium">
              {objectsVisible
                ? selectedObjectCount === 1
                  ? t("merge.oneObjectBlend")
                  : t("merge.objectsBlend", { count: selectedObjectCount })
                : t("merge.objectsNotDetected")}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingObjects ? (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("merge.loadingObjects")}
                </div>
              ) : objectsVisible ? (
                objects.map((obj) => (
                  <div
                    key={obj.object_name}
                    className="flex items-center justify-between gap-2 border-b border-border p-4"
                    title={obj.metadata ? JSON.stringify(obj.metadata) : obj.object_name}
                  >
                    <span className="truncate text-base">{obj.object_name}</span>
                    <Badge variant="default" className="shrink-0 rounded-full capitalize">
                      {t(objectTagKey(obj.tags))}
                    </Badge>
                  </div>
                ))
              ) : null}
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
