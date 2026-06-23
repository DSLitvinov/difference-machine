import { useState } from "react";
import { Copy, GitBranch, GitMerge, MoreVertical } from "lucide-react";

import { parseCommitMessage } from "@/lib/commitMessage";
import { formatRelativeTime } from "@/lib/relativeTime";
import { cn } from "@/lib/utils";
import type { CommitLogEntry } from "@/wails/forester";

interface CommitCardProps {
  commit: CommitLogEntry;
  selected: boolean;
  isHead: boolean;
  onSelect: () => void;
}

function commitCardStateClasses(selected: boolean, hovered: boolean): string {
  if (selected && hovered) return "border-ring bg-accent";
  if (selected) return "border-border bg-accent";
  if (hovered) return "border-ring bg-background";
  return "border-border bg-background";
}

export function CommitCard({ commit, selected, isHead, onSelect }: CommitCardProps) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { title, description } = parseCommitMessage(commit.message);
  const isMerge = (commit.parent_hashes?.length ?? 0) > 1;

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "flex w-full cursor-pointer gap-2 rounded-md border p-3 text-left transition-colors duration-150",
        commitCardStateClasses(selected, hovered),
      )}
      onClick={() => onSelect()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-1">
          {isMerge ? <GitMerge className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
          {isHead ? (
            <span title="Branch tip (HEAD)">
              <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={title}>
            {title}
          </span>
        </div>
        <p className="text-xs text-foreground">{commit.author}</p>
        {description ? (
          <p className="line-clamp-2 h-8 text-xs text-muted-foreground">Description: {description}</p>
        ) : null}
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            {formatRelativeTime(commit.timestamp)}
          </span>
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Commit actions"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-md border border-border bg-background py-1 shadow-md">
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
                setMenuOpen(false);
              }}
            >
              View in Preview
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                void copyText(commit.hash);
                setMenuOpen(false);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy hash
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                void copyText(commit.message);
                setMenuOpen(false);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy message
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CommitCardSkeleton() {
  return <div className="h-28 animate-pulse rounded-md border border-border bg-muted/40" />;
}
