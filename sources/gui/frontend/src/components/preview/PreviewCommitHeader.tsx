import { Copy, GitBranch, GitMerge, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { parseCommitMessage } from "@/lib/commitMessage";
import { shortHash } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { CommitLogEntry } from "@/wails/forester";

interface PreviewCommitHeaderProps {
  commit: CommitLogEntry | null;
  isHead: boolean;
  loading: boolean;
  stats: { files_changed: number; insertions: number; deletions: number } | null;
  onCopy?: () => void;
}

export function PreviewCommitHeader({
  commit,
  isHead,
  loading,
  stats,
  onCopy,
}: PreviewCommitHeaderProps) {
  const t = useT();
  if (loading || !commit) {
    return (
      <div className="space-y-2 border-b border-border bg-background px-4 py-3">
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const { title } = parseCommitMessage(commit.message);
  const isMerge = (commit.parent_hashes?.length ?? 0) > 1;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(commit.hash);
      onCopy?.();
    } catch {
      // ignore
    }
  };

  return (
    <div className="shrink-0 space-y-1 border-b border-border bg-background px-4 py-3">
      <div className="flex items-center gap-1">
        {isMerge ? <GitMerge className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
        {isHead ? (
          <span title={t("preview.branchTip")}>
            <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
          </span>
        ) : null}
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h2>
      </div>
      <p className="text-sm text-foreground">{commit.author}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{shortHash(commit.hash)}</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => void handleCopy()}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        {stats ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              {t("commit.filesChanged", { count: stats.files_changed })}
            </span>
            {stats.insertions > 0 ? (
              <span className="text-emerald-700">+{stats.insertions}</span>
            ) : null}
            {stats.deletions > 0 ? (
              <span className="text-destructive">−{stats.deletions}</span>
            ) : null}
          </div>
        ) : (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
