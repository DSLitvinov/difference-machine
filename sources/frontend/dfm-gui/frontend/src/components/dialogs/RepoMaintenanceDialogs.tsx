import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
    <Dialog
      className="w-[430px]"
      title={copy.verifyRepository}
      titleId="verify-repository-title"
      closeLabel={copy.close}
      busy={busy}
      onClose={onClose}
      footer={
        <Button type="button" disabled={busy} onClick={onClose}>
          {copy.close}
        </Button>
      }
    >
      {error ? <p className="text-[13px] leading-normal text-[#dc2626]">{error}</p> : null}
      {result ? (
        <div className="flex w-full flex-col gap-1 text-[13px] leading-normal text-[#18181b] dark:text-foreground">
          <p>{copy.verifyCommits(result.commitsFound)}</p>
          <p>{copy.verifyTrees(result.treesFound)}</p>
          <p>{copy.verifyBlobs(result.blobsFound)}</p>
          {result.damaged ? <p>{copy.repositoryDamagedBody}</p> : null}
        </div>
      ) : null}
    </Dialog>
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
    <Dialog
      className="w-[520px]"
      title={copy.recoverCommit}
      titleId="recover-commit-title"
      closeLabel={copy.close}
      busy={busy}
      onClose={onCancel}
      footer={
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="button" disabled={busy || !selected} onClick={() => onRecover(selected)}>
            {copy.recoverCommit}
          </Button>
        </>
      }
    >
      {error ? <p className="text-[13px] leading-normal text-[#dc2626]">{error}</p> : null}
      {recoverable.length === 0 ? (
        <p className="text-[13px] leading-normal text-[#18181b] dark:text-foreground">{copy.noReflogEntries}</p>
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
                  "flex w-full flex-col items-start rounded-[10px] px-2.5 py-2 text-left",
                  active && "bg-[#e4e4e7] dark:bg-background-muted",
                  disabled && "opacity-50",
                )}
                onClick={() => setPicked(entry.commit_hash)}
              >
                <span className="text-sm font-medium leading-5 text-[#18181b] dark:text-foreground">
                  {shortHash(entry.commit_hash)} {entry.operation ?? ""}
                </span>
                <span className="text-[13px] leading-normal text-[#71717a] dark:text-foreground-muted">
                  {entry.ref_name ?? ""} {entry.timestamp ? formatDateTime(entry.timestamp) : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}
