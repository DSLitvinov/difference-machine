import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { AlertBanner } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/chrome/Icon";
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
  description: string;
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
  description,
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
  const [backdropArmed, setBackdropArmed] = useState(false);
  const complete = conflicts.length > 0 && conflicts.every((conflict) => Boolean(resolutions[conflict.id]));

  useEffect(() => {
    const id = window.setTimeout(() => setBackdropArmed(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  function choose(conflict: StashConflictFile, side: StashConflictSide) {
    if (busy) {
      return;
    }
    setResolutions((current) => ({ ...current, [conflict.id]: side }));
  }

  function versionCell(conflict: StashConflictFile, side: StashConflictSide) {
    const path = side === "left" ? conflict.leftPath : conflict.rightPath;
    const selected = resolutions[conflict.id] === side;
    return (
      <button
        type="button"
        className={cn(
          "flex min-w-0 flex-1 items-center px-4 py-2 text-left hover:bg-background-muted",
          side === "left" && "border-r border-border",
          selected && "bg-background-muted",
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
        <span className="min-w-0 flex-1 truncate text-[16px] leading-6 text-foreground">{path}</span>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      role="presentation"
      onClick={busy || !backdropArmed ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stash-conflict-dialog-title"
        aria-describedby="stash-conflict-dialog-description"
        aria-busy={busy}
        className="relative flex w-[796px] flex-col gap-4 overflow-clip rounded-md border border-border bg-background p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-[11px] top-[11px] flex size-6 items-center justify-center"
          aria-label={copy.close}
          disabled={busy}
          onClick={onCancel}
        >
          <Icon icon={X} size={16} />
        </button>

        <div className="flex w-full flex-col">
          <p id="stash-conflict-dialog-title" className="pr-6 text-[18px] font-semibold leading-7 text-foreground">
            {title}
          </p>
          <p id="stash-conflict-dialog-description" className="w-full text-[14px] leading-5 text-foreground-muted">
            {description}
          </p>
        </div>

        {error ? (
          <AlertBanner
            variant="destructive"
            title={copy.error}
            description={error}
            closeLabel={copy.close}
            onClose={onClearError}
          />
        ) : null}

        <div className="w-full overflow-clip rounded-md border border-border">
          <div className="flex h-[38px] w-full border-b border-border bg-background-muted">
            <div className="flex min-w-0 flex-1 items-center border-r border-border px-2 py-1.5">
              <p className="truncate text-[12px] leading-4 text-foreground">{leftLabel}</p>
            </div>
            <div className="flex min-w-0 flex-1 items-center px-2 py-1.5">
              <p className="truncate text-[12px] leading-4 text-foreground">{rightLabel}</p>
            </div>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {conflicts.map((conflict) => (
              <div key={conflict.id} className="flex w-full border-b border-border last:border-b-0">
                {versionCell(conflict, "left")}
                {versionCell(conflict, "right")}
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-full items-start justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="button" disabled={busy || !complete} onClick={() => onResolve(resolutions)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
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
      description={copy.resolveWorktreeStashConflicts}
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
      description={copy.resolveStashStashConflicts}
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
