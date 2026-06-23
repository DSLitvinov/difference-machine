import { CommitCard, CommitCardSkeleton } from "@/components/sidebar/CommitCard";
import type { CommitLogEntry } from "@/wails/forester";

interface CommitListProps {
  commits: CommitLogEntry[];
  selectedHash: string | null;
  headHash: string | null;
  loading: boolean;
  capped: boolean;
  onSelect: (hash: string) => void;
}

export function CommitList({
  commits,
  selectedHash,
  headHash,
  loading,
  capped,
  onSelect,
}: CommitListProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-2">
        <CommitCardSkeleton />
        <CommitCardSkeleton />
        <CommitCardSkeleton />
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        No commits on this branch
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {commits.map((commit) => (
          <CommitCard
            key={commit.hash}
            commit={commit}
            selected={selectedHash === commit.hash}
            isHead={headHash === commit.hash}
            onSelect={() => onSelect(commit.hash)}
          />
        ))}
      </div>
      {capped ? (
        <p className="shrink-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Showing latest 100 commits
        </p>
      ) : null}
    </div>
  );
}
