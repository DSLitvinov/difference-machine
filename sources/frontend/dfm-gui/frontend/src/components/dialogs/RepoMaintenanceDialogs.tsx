import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/chrome/Icon";
import { formatDateTime } from "@/lib/format";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type DialogShellProps = {
  locale: Locale;
  title: string;
  titleId: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
};

function DialogShell({ locale, title, titleId, busy, onClose, children }: DialogShellProps) {
  const copy = t(locale);
  const [backdropArmed, setBackdropArmed] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setBackdropArmed(true), 0);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      role="presentation"
      onClick={busy || !backdropArmed ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex w-[451px] flex-col gap-4 rounded-md border border-border bg-background p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="absolute right-[11px] top-[11px] flex size-6 items-center justify-center" aria-label={copy.close} onClick={onClose} disabled={busy}>
          <Icon icon={X} size={16} />
        </button>
        <p id={titleId} className="pr-6 text-[18px] font-semibold leading-7 text-foreground">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

export type RebuildCounts = {
  commitsFound: number;
  treesFound: number;
  blobsFound: number;
  damaged: boolean;
};

type VerifyRepositoryDialogProps = {
  locale: Locale;
  result: RebuildCounts | null;
  error?: string | null;
  busy?: boolean;
  onClose: () => void;
};

export function VerifyRepositoryDialog({ locale, result, error, busy, onClose }: VerifyRepositoryDialogProps) {
  const copy = t(locale);
  return (
    <DialogShell locale={locale} title={copy.verifyRepository} titleId="verify-repository-title" busy={busy} onClose={onClose}>
      {error ? <p className="text-[13px] leading-normal text-foreground-muted">{error}</p> : null}
      {result ? (
        <div className="flex w-full flex-col gap-1 text-[13px] leading-normal text-foreground">
          <p>{copy.verifyCommits(result.commitsFound)}</p>
          <p>{copy.verifyTrees(result.treesFound)}</p>
          <p>{copy.verifyBlobs(result.blobsFound)}</p>
          {result.damaged ? <p className="text-foreground-muted">{copy.repositoryDamagedBody}</p> : null}
        </div>
      ) : null}
      <div className="flex w-full items-start justify-end gap-2">
        <Button type="button" disabled={busy} onClick={onClose}>
          {copy.close}
        </Button>
      </div>
    </DialogShell>
  );
}

export type ReflogEntry = {
  commit_hash: string;
  ref_name?: string;
  operation?: string;
  timestamp?: number;
  exists?: boolean;
};

type RecoverCommitDialogProps = {
  locale: Locale;
  entries: ReflogEntry[];
  error?: string | null;
  busy?: boolean;
  onCancel: () => void;
  onRecover: (hash: string) => void;
};

function shortHash(hash: string): string {
  return hash.length > 8 ? hash.slice(0, 8) : hash;
}

export function RecoverCommitDialog({ locale, entries, error, busy, onCancel, onRecover }: RecoverCommitDialogProps) {
  const copy = t(locale);
  const recoverable = entries.filter((entry) => entry.commit_hash && entry.exists);
  const [picked, setPicked] = useState(recoverable[0]?.commit_hash ?? "");
  const selected = recoverable.some((entry) => entry.commit_hash === picked) ? picked : (recoverable[0]?.commit_hash ?? "");
  return (
    <DialogShell locale={locale} title={copy.recoverCommit} titleId="recover-commit-title" busy={busy} onClose={onCancel}>
      {error ? <p className="text-[13px] leading-normal text-foreground-muted">{error}</p> : null}
      {recoverable.length === 0 ? (
        <p className="text-[13px] leading-normal text-foreground-muted">{copy.noReflogEntries}</p>
      ) : (
        <div className="flex max-h-[280px] w-full flex-col overflow-y-auto" role="listbox" aria-labelledby="recover-commit-title">
          {entries.map((entry, index) => {
            if (!entry.commit_hash) {
              return null;
            }
            const active = entry.commit_hash === selected;
            const disabled = !entry.exists;
            return (
              <button
                key={`${entry.commit_hash}:${entry.timestamp ?? index}:${entry.operation ?? ""}`}
                type="button"
                role="option"
                aria-selected={active}
                disabled={busy || disabled}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-sm px-3 py-2 text-left text-[13px] leading-normal",
                  active ? "bg-background-muted" : "hover:bg-background-light",
                  disabled ? "opacity-50" : "",
                )}
                onClick={() => setPicked(entry.commit_hash)}
              >
                <span className="font-medium text-foreground">
                  {shortHash(entry.commit_hash)} {entry.operation ?? ""}
                </span>
                <span className="text-foreground-muted">
                  {entry.ref_name ?? ""} {entry.timestamp ? formatDateTime(entry.timestamp) : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex w-full items-start justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          {copy.cancel}
        </Button>
        <Button type="button" disabled={busy || !selected} onClick={() => onRecover(selected)}>
          {copy.recoverCommit}
        </Button>
      </div>
    </DialogShell>
  );
}
