import { useCommitCardStat } from "@/hooks/useCommitCardStat";
import type { CommitLogEntry } from "@/wails/forester";

interface CommitCardStatsProps {
  commit: CommitLogEntry;
  loadStats: boolean;
}

export function CommitCardStats({ commit, loadStats }: CommitCardStatsProps) {
  const { setElement, state, stat } = useCommitCardStat(commit, loadStats);

  if (state === "error") {
    return null;
  }

  return (
    <div ref={setElement} className="flex w-full items-center gap-1 text-xs">
      {state === "idle" || state === "loading" ? (
        <>
          <span className="truncate text-muted-foreground" aria-busy="true">
            — files changed
          </span>
          <span className="shrink-0 text-muted-foreground">+ –</span>
          <span className="shrink-0 text-muted-foreground">− –</span>
        </>
      ) : stat ? (
        <>
          <span className="truncate text-muted-foreground">{stat.files_changed} files changed</span>
          {stat.insertions > 0 ? (
            <span className="shrink-0 text-emerald-700">+{stat.insertions}</span>
          ) : null}
          {stat.deletions > 0 ? (
            <span className="shrink-0 text-destructive">−{stat.deletions}</span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
