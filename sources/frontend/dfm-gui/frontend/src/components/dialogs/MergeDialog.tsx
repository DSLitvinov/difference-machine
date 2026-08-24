import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { foresterCall } from "@/lib/bridge";
import { fileKind } from "@/lib/file-kind";
import { t, type Locale } from "@/lib/i18n";
import type { BranchSummary, MergeStatus } from "@/store/app-store";
import chevronDown from "@/assets/icons/chevron-down.svg";
import filterIcon from "@/assets/icons/filter.svg";
import xIcon from "@/assets/icons/x.svg";

type BlendObject = {
  object_name?: string;
  tags?: string[];
};

type MergeDialogProps = {
  locale: Locale;
  busy?: boolean;
  author?: string;
  currentBranch: string;
  branches: BranchSummary[];
  merge: MergeStatus;
  error?: string | null;
  onClose: () => void;
  onStart: (branch: string) => void;
  onContinue: () => void;
  onAbort: () => void;
};

export function mergeHeading(current: string, incoming: string, locale: Locale = "en"): string {
  const copy = t(locale);
  const from = incoming.trim() || copy.commitPlaceholderA;
  const to = current.trim() || copy.commitPlaceholderB;
  return copy.mergeHeading(from, to);
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
  onStart,
  onContinue,
  onAbort,
}: MergeDialogProps) {
  const copy = t(locale);
  const others = branches.filter((branch) => branch.name && branch.name !== currentBranch);
  const [pickedBranch, setPickedBranch] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  const [objects, setObjects] = useState<BlendObject[]>([]);
  const [backdropArmed, setBackdropArmed] = useState(false);

  const inProgress = Boolean(merge.in_progress);
  const step = inProgress ? "view objects" : "select branch";
  const selectedBranch = pickedBranch || others[0]?.name || "";
  const incoming = inProgress ? (merge.branch ?? selectedBranch) : selectedBranch;
  const conflicts = merge.conflicts ?? [];
  const query = search.trim().toLowerCase();
  const files = useMemo(() => {
    if (!query) {
      return conflicts;
    }
    return conflicts.filter((item) => item.path.toLowerCase().includes(query));
  }, [conflicts, query]);
  const selected = files.some((item) => item.path === selectedPath) ? selectedPath : (files[0]?.path ?? "");
  const blend = selected ? fileKind(selected) === "blend" : false;
  const hasConflicts = Boolean(merge.has_conflicts);
  const alertText = error || (hasConflicts ? conflicts.map((item) => item.path).join(", ") : "");
  const showAlert = Boolean(alertText) && step === "view objects";

  useEffect(() => {
    const id = window.setTimeout(() => setBackdropArmed(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!selected || !blend) {
      setObjects([]);
      return;
    }
    const commitHash = merge.target_head || merge.to || merge.current_head || merge.from || "";
    if (!commitHash) {
      setObjects([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = (await foresterCall("object.list_by_file", {
          commit_hash: commitHash,
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
  }, [selected, blend, merge.target_head, merge.to, merge.current_head, merge.from]);

  function onCancel() {
    if (inProgress) {
      onAbort();
      return;
    }
    onClose();
  }

  const objectHeader = blend && objects.length > 0 ? copy.objectsInBlend(objects.length) : copy.objectsNotDetected;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      role="presentation"
      onClick={busy || !backdropArmed ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-dialog-title"
        className="relative flex w-[796px] flex-col gap-4 overflow-clip rounded-md border border-border bg-background p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-[11px] top-[11px] flex size-6 items-center justify-center"
          aria-label={copy.close}
          onClick={onClose}
          disabled={busy}
        >
          <FigmaIcon src={xIcon} size={16} />
        </button>
        <div className="flex w-full flex-col">
          <p id="merge-dialog-title" className="pr-6 text-[18px] font-semibold leading-7 text-foreground">
            {mergeHeading(currentBranch, incoming, locale)}
          </p>
          <p className="w-full text-[14px] leading-5 text-foreground-muted">{author || copy.author}</p>
        </div>
        {error && step === "select branch" ? <AlertBanner variant="destructive" title={copy.error} description={error} /> : null}

        {step === "select branch" ? (
          <div className="flex w-full flex-col gap-1">
            <p className="text-[14px] font-medium leading-5 text-foreground">{copy.branchName}</p>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild disabled={busy || others.length === 0}>
                <button
                  type="button"
                  className="flex min-h-9 w-full items-center gap-2 rounded-[6px] border border-border bg-background px-3 py-2.5 shadow-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-left text-[14px] leading-5 text-foreground">
                    {selectedBranch || copy.branchName}
                  </span>
                  <FigmaIcon src={chevronDown} size={20} />
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
        ) : (
          <div className="flex w-full flex-col gap-2">
            {showAlert ? <AlertBanner variant="destructive" title={copy.error} description={alertText} /> : null}
            <div className="flex w-full items-center gap-2">
              <Input
                value={search}
                placeholder={copy.typeToSearch}
                disabled={busy}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button type="button" variant="outline" size="icon" aria-label={copy.filter}>
                <FigmaIcon src={filterIcon} size={16} />
              </Button>
            </div>
            <div className="flex h-[206px] w-full overflow-clip rounded-md border border-border">
              <div className="flex h-full w-1/2 min-w-0 flex-col overflow-clip border-r border-border">
                <div className="flex h-[38px] shrink-0 items-center bg-background-muted px-2 py-1.5">
                  <p className="truncate text-[12px] leading-4 text-foreground">{copy.filesChangedCount(conflicts.length)}</p>
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
        )}

        <div className="flex w-full items-start justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          {step === "select branch" ? (
            <Button type="button" disabled={busy || !selectedBranch} onClick={() => onStart(selectedBranch)}>
              {copy.next}
            </Button>
          ) : (
            <Button type="button" disabled={busy || hasConflicts} onClick={onContinue}>
              {copy.merge}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
