import { useState } from "react";
import { AlertBanner } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type StashConflictSide = "left" | "right";

export type StashConflictFile = {
  id: string;
  leftPath: string;
  rightPath: string;
};

type ConflictDialogProps = {
  locale: Locale;
  conflicts: StashConflictFile[];
  leftLabel: string;
  rightLabel: string;
  title: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onClearError?: () => void;
  onOpenFile: (conflict: StashConflictFile, side: StashConflictSide) => void;
  onResolve: (resolutions: Record<string, StashConflictSide>) => void;
};

function StashConflictDialog({
  locale,
  conflicts,
  leftLabel,
  rightLabel,
  title,
  confirmLabel,
  busy,
  error,
  onCancel,
  onClearError,
  onOpenFile,
  onResolve,
}: ConflictDialogProps) {
  const copy = t(locale);
  const [resolutions, setResolutions] = useState<Record<string, StashConflictSide>>({});
  const complete = conflicts.length > 0 && conflicts.every((conflict) => Boolean(resolutions[conflict.id]));

  function choose(conflict: StashConflictFile, side: StashConflictSide) {
    if (busy) {
      return;
    }
    setResolutions((current) => ({ ...current, [conflict.id]: side }));
  }

  function versionList(side: StashConflictSide) {
    return (
      <div className={cn("flex min-w-0 flex-1 flex-col", side === "left" && "border-r border-[#e4e4e7] dark:border-border")}>
        <div className="flex h-[38px] items-center border-b border-[#e4e4e7] bg-[#fafafa] px-2 dark:border-border dark:bg-background-muted">
          <p className="truncate text-[12px] font-normal leading-4 text-[#18181b] dark:text-foreground">
            {side === "left" ? leftLabel : rightLabel}
          </p>
        </div>
        <div className="flex max-h-[320px] flex-col overflow-y-auto p-2">
          {conflicts.map((conflict) => {
            const path = side === "left" ? conflict.leftPath : conflict.rightPath;
            const selected = resolutions[conflict.id] === side;
            return (
              <button
                key={`${conflict.id}:${side}`}
                type="button"
                className={cn(
                  "flex w-full items-center rounded-[10px] px-2.5 py-2 text-left text-sm font-medium leading-5 text-[#18181b] dark:text-foreground",
                  selected && "bg-[#e4e4e7] dark:bg-background-muted",
                )}
                aria-pressed={selected}
                disabled={busy}
                onClick={() => choose(conflict, side)}
                onDoubleClick={() => onOpenFile(conflict, side)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    choose(conflict, side);
                    onOpenFile(conflict, side);
                  }
                }}
              >
                <span className="min-w-0 flex-1 truncate">{path}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Dialog
      className="w-[780px]"
      title={title}
      titleId="stash-conflict-dialog-title"
      closeLabel={copy.close}
      busy={busy}
      onClose={onCancel}
      footer={
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="button" disabled={busy || !complete} onClick={() => onResolve(resolutions)}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {error ? (
        <AlertBanner
          variant="destructive"
          title={copy.error}
          description={error}
          closeLabel={copy.close}
          onClose={onClearError}
        />
      ) : null}
      <div className="flex w-full overflow-clip rounded-md border border-[#e4e4e7] dark:border-border">
        {versionList("left")}
        {versionList("right")}
      </div>
    </Dialog>
  );
}

type WorktreeStashConflictDialogProps = {
  locale: Locale;
  conflicts: StashConflictFile[];
  stashLabel?: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onClearError?: () => void;
  onOpenFile: (conflict: StashConflictFile, side: StashConflictSide) => void;
  onResolve: (resolutions: Record<string, StashConflictSide>) => void;
};

export function WorktreeStashConflictDialog({
  locale,
  conflicts,
  stashLabel,
  busy,
  error,
  onCancel,
  onClearError,
  onOpenFile,
  onResolve,
}: WorktreeStashConflictDialogProps) {
  const copy = t(locale);
  return (
    <StashConflictDialog
      locale={locale}
      conflicts={conflicts}
      leftLabel={copy.currentFiles}
      rightLabel={stashLabel || copy.stages}
      title={copy.resolveStashConflicts}
      confirmLabel={copy.restore}
      busy={busy}
      error={error}
      onCancel={onCancel}
      onClearError={onClearError}
      onOpenFile={onOpenFile}
      onResolve={onResolve}
    />
  );
}

type StashStashConflictDialogProps = {
  locale: Locale;
  conflicts: StashConflictFile[];
  leftStashLabel?: string;
  rightStashLabel?: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onClearError?: () => void;
  onOpenFile: (conflict: StashConflictFile, side: StashConflictSide) => void;
  onResolve: (resolutions: Record<string, StashConflictSide>) => void;
};

export function StashStashConflictDialog({
  locale,
  conflicts,
  leftStashLabel,
  rightStashLabel,
  busy,
  error,
  onCancel,
  onClearError,
  onOpenFile,
  onResolve,
}: StashStashConflictDialogProps) {
  const copy = t(locale);
  return (
    <StashConflictDialog
      locale={locale}
      conflicts={conflicts}
      leftLabel={leftStashLabel || copy.stages}
      rightLabel={rightStashLabel || copy.stages}
      title={copy.resolveStashConflicts}
      confirmLabel={copy.combine}
      busy={busy}
      error={error}
      onCancel={onCancel}
      onClearError={onClearError}
      onOpenFile={onOpenFile}
      onResolve={onResolve}
    />
  );
}
