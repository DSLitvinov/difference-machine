import { ChevronDown, Filter } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertBanner } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommitFileItem } from "@/components/atoms/CommitFileItem";
import { ObjectStatusBadge, objectStatusTypes } from "@/components/atoms/ObjectStatusBadge";
import { Icon } from "@/components/chrome/Icon";
import { foresterCall } from "@/lib/bridge";
import { fileKind } from "@/lib/file-kind";
import { t, type Locale } from "@/lib/i18n";
import type { NameStatusFile } from "@/lib/revision-cache";
import type { BranchSummary, MergeStatus } from "@/store/app-store";

type BlendObject = {
  object_name?: string;
  tags?: string[];
};

type MergeFileRow = {
  path: string;
};

type MergeStep = "select branch" | "view objects" | "wait";

type MergeDialogProps = {
  locale: Locale;
  busy?: boolean;
  author?: string;
  currentBranch: string;
  branches: BranchSummary[];
  merge: MergeStatus;
  error?: string | null;
  onClose: () => void;
  onClearError?: () => void;
  onStart: (branch: string) => void | Promise<void | boolean>;
  onContinue: () => void | Promise<void | boolean>;
  onAbort: () => void;
};

export function mergeHeading(current: string, incoming: string, locale: Locale = "en"): string {
  const copy = t(locale);
  const from = incoming.trim() || copy.commitPlaceholderA;
  const to = current.trim() || copy.commitPlaceholderB;
  return copy.mergeHeading(from, to);
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function MergeDialog({
  locale,
  busy,
  author,
  currentBranch,
  branches,
  merge,
  error,
  onClose,
  onClearError,
  onStart,
  onContinue,
  onAbort,
}: MergeDialogProps) {
  const copy = t(locale);
  const others = branches.filter((branch) => branch.name && branch.name !== currentBranch);
  const inProgress = Boolean(merge.in_progress);
  const [step, setStep] = useState<MergeStep>(inProgress ? "view objects" : "select branch");
  const [pickedBranch, setPickedBranch] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  const [objects, setObjects] = useState<BlendObject[]>([]);
  const [previewFiles, setPreviewFiles] = useState<MergeFileRow[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const alive = useRef(true);

  const selectedBranch = pickedBranch || others[0]?.name || "";
  const incoming = inProgress ? (merge.branch ?? selectedBranch) : selectedBranch;
  const incomingHash = useMemo(() => {
    const named = incoming ? branches.find((branch) => branch.name === incoming)?.commit_hash : "";
    return named || merge.target_head || merge.to || "";
  }, [branches, incoming, merge.target_head, merge.to]);
  const conflicts = merge.conflicts ?? [];
  const fileRows: MergeFileRow[] = inProgress ? conflicts : previewFiles;
  const query = search.trim().toLowerCase();
  const files = useMemo(() => {
    if (!query) {
      return fileRows;
    }
    return fileRows.filter((item) => item.path.toLowerCase().includes(query));
  }, [fileRows, query]);
  const selected = files.some((item) => item.path === selectedPath) ? selectedPath : (files[0]?.path ?? "");
  const blend = selected ? fileKind(selected) === "blend" : false;
  const hasConflicts = Boolean(merge.has_conflicts);
  const alertText = error || loadError || (hasConflicts ? conflicts.map((item) => item.path).join(", ") : "");
  const showAlert = Boolean(alertText) && step === "view objects" && !alertDismissed;
  const locked = Boolean(busy) || step === "wait";
  const objectCommit = inProgress ? merge.target_head || merge.to || incomingHash : incomingHash;

  useEffect(() => {
    setAlertDismissed(false);
  }, [alertText]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (step !== "view objects" || inProgress) {
      return;
    }
    if (!incomingHash) {
      setPreviewFiles([]);
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const result = (await foresterCall("diff.name_status", {
          from: "HEAD",
          to: incomingHash,
        })) as { files?: NameStatusFile[] };
        if (!cancelled) {
          setPreviewFiles((result.files ?? []).map((item) => ({ path: item.path })));
        }
      } catch (err) {
        if (!cancelled) {
          setPreviewFiles([]);
          setLoadError(err instanceof Error ? err.message : "request failed");
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, inProgress, incomingHash]);

  useEffect(() => {
    if (step !== "view objects" || !selected || !blend) {
      setObjects([]);
      return;
    }
    if (!objectCommit) {
      setObjects([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = (await foresterCall("object.list_by_file", {
          commit_hash: objectCommit,
          file_path: selected,
        })) as { objects?: BlendObject[] };
        if (!cancelled) {
          setObjects(result.objects ?? []);
        }
      } catch {
        if (!cancelled) {
          setObjects([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, selected, blend, objectCommit]);

  function onCancel() {
    if (inProgress) {
      onAbort();
      return;
    }
    onClose();
  }

  async function runMerge() {
    flushSync(() => setStep("wait"));
    await nextPaint();
    try {
      const stayOpen = inProgress ? await onContinue() : await onStart(selectedBranch);
      if (alive.current && stayOpen !== false) {
        setStep((current) => (current === "wait" ? "view objects" : current));
      }
    } catch {
      if (alive.current) {
        setStep("view objects");
      }
    }
  }

  const objectHeader = blend && objects.length > 0 ? copy.objectsInBlend(objects.length) : copy.objectsNotDetected;

  return (
    <Dialog
      className="w-[780px]"
      title={mergeHeading(currentBranch, incoming, locale)}
      titleId="merge-dialog-title"
      closeLabel={copy.close}
      busy={locked}
      onClose={onClose}
      footer={
        step !== "wait" ? (
          <>
            <Button type="button" variant="outline" disabled={locked} onClick={onCancel}>
              {copy.cancel}
            </Button>
            {step === "select branch" ? (
              <Button
                type="button"
                disabled={locked || !selectedBranch}
                onClick={() => {
                  setPreviewLoading(true);
                  setStep("view objects");
                }}
              >
                {copy.next}
              </Button>
            ) : (
              <Button type="button" disabled={locked || hasConflicts || previewLoading} onClick={() => void runMerge()}>
                {copy.merge}
              </Button>
            )}
          </>
        ) : undefined
      }
    >
        <p className="w-full text-sm font-normal leading-5 text-[#71717a] dark:text-foreground-muted">{author || copy.author}</p>
        {error && step === "select branch" && !alertDismissed ? (
          <AlertBanner
            variant="destructive"
            title={copy.error}
            description={error}
            closeLabel={copy.close}
            onClose={() => {
              setAlertDismissed(true);
              onClearError?.();
            }}
          />
        ) : null}

        {step === "select branch" ? (
          <div className="flex w-full flex-col gap-1">
            <p className="text-[14px] font-medium leading-5 text-foreground">{copy.branchName}</p>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild disabled={locked || others.length === 0}>
                <button
                  type="button"
                  className="flex h-7 w-full items-center gap-2 rounded-md border border-[#d4d4d8] bg-white px-2.5 text-sm leading-5 text-[#18181b] shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:border-border dark:bg-background dark:text-foreground"
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {selectedBranch || copy.branchName}
                  </span>
                  <Icon icon={ChevronDown} size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[748px]">
                <DropdownMenuRadioGroup value={selectedBranch} onValueChange={setPickedBranch}>
                  {others.map((branch) => (
                    <DropdownMenuRadioItem key={branch.name} value={branch.name}>
                      {branch.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}

        {step === "view objects" ? (
          <div className="flex w-full flex-col gap-2">
            {showAlert ? (
              <AlertBanner
                variant="destructive"
                title={copy.error}
                description={alertText}
                closeLabel={copy.close}
                onClose={() => {
                  setAlertDismissed(true);
                  setLoadError(null);
                  onClearError?.();
                }}
              />
            ) : null}
            <div className="flex w-full items-center gap-2">
              <Input
                value={search}
                placeholder={copy.typeToSearch}
                disabled={locked}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button type="button" variant="outline" size="icon" aria-label={copy.filter}>
                <Icon icon={Filter} size={16} />
              </Button>
            </div>
            <div className="flex h-[206px] w-full overflow-clip rounded-md border border-border">
              <div className="flex h-full w-1/2 min-w-0 flex-col overflow-clip border-r border-border">
                <div className="flex h-[38px] shrink-0 items-center bg-background-muted px-2 py-1.5">
                  <p className="truncate text-[12px] leading-4 text-foreground">{copy.filesChangedCount(fileRows.length)}</p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {files.map((item) => (
                    <CommitFileItem
                      key={item.path}
                      path={item.path}
                      selected={item.path === selected}
                      onSelect={() => setSelectedPath(item.path)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex h-full w-1/2 min-w-0 flex-col overflow-clip">
                <div className="flex h-[38px] shrink-0 items-center bg-background-muted px-2 py-1.5">
                  <p className="truncate text-[12px] leading-4 text-foreground">{objectHeader}</p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {objects.map((object, index) => {
                    const types = objectStatusTypes(object.tags);
                    return (
                      <div key={`${object.object_name ?? "object"}-${index}`} className="flex w-full items-center gap-2 px-4 py-2">
                        {types.map((type) => (
                          <ObjectStatusBadge key={type} type={type} />
                        ))}
                        <p className="min-w-0 flex-1 truncate text-[16px] leading-6 text-foreground">
                          {object.object_name || ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === "wait" ? (
          <p className="w-full text-[14px] leading-5 text-foreground-muted">{copy.mergePleaseWait}</p>
        ) : null}

    </Dialog>
  );
}
