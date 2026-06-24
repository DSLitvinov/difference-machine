import { useEffect, useRef, useState } from "react";

import { CommitCard, CommitCardSkeleton } from "@/components/sidebar/CommitCard";
import type { CommitLogEntry } from "@/wails/forester";

interface CommitListProps {
  commits: CommitLogEntry[];
  selectedHash: string | null;
  headHash: string | null;
  loading: boolean;
  capped: boolean;
  emptyLabel?: string;
  onSelect: (hash: string) => void;
  onAfterCommitAction?: () => void | Promise<void>;
}

export function CommitList({
  commits,
  selectedHash,
  headHash,
  loading,
  capped,
  emptyLabel = "No commits on this branch",
  onSelect,
  onAfterCommitAction,
}: CommitListProps) {
  const [focusIndex, setFocusIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedHash) {
      const index = commits.findIndex((c) => c.hash === selectedHash);
      if (index >= 0) setFocusIndex(index);
    }
  }, [commits, selectedHash]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (commits.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusIndex((i) => Math.min(commits.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusIndex((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const commit = commits[focusIndex];
      if (commit) onSelect(commit.hash);
    }
  };

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
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 outline-none"
        tabIndex={0}
        role="listbox"
        aria-activedescendant={commits[focusIndex] ? `commit-${commits[focusIndex]!.hash}` : undefined}
        onKeyDown={handleKeyDown}
      >
        {commits.map((commit, index) => (
          <div key={commit.hash} id={`commit-${commit.hash}`} role="option" aria-selected={selectedHash === commit.hash}>
            <CommitCard
              commit={commit}
              selected={selectedHash === commit.hash}
              focused={focusIndex === index}
              isHead={headHash === commit.hash}
              onSelect={() => onSelect(commit.hash)}
              onAfterAction={onAfterCommitAction}
            />
          </div>
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
