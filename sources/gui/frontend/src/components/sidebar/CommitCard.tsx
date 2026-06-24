import { useState } from "react";
import { Copy, GitBranch, GitMerge, MoreVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommitCardStats } from "@/components/sidebar/CommitCardStats";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parseCommitMessage } from "@/lib/commitMessage";
import { formatRelativeTime } from "@/lib/relativeTime";
import { cn } from "@/lib/utils";
import type { CommitLogEntry } from "@/wails/forester";

interface CommitCardProps {
  commit: CommitLogEntry;
  selected: boolean;
  focused?: boolean;
  isHead: boolean;
  onSelect: () => void;
}

function commitCardStateClasses(selected: boolean, hovered: boolean, focused: boolean): string {
  if (selected && hovered) return "border-ring bg-accent";
  if (selected) return "border-border bg-accent";
  if (focused) return "border-ring bg-background ring-2 ring-ring ring-offset-2";
  if (hovered) return "border-ring bg-background";
  return "border-border bg-background";
}

export function CommitCard({ commit, selected, focused = false, isHead, onSelect }: CommitCardProps) {
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
        commitCardStateClasses(selected, hovered, focused),
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
        <CommitCardStats commit={commit} />
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            {formatRelativeTime(commit.timestamp)}
          </Badge>
        </div>
      </div>

      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              aria-label="Commit actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            <DropdownMenuItem
              onClick={() => {
                onSelect();
                setMenuOpen(false);
              }}
            >
              View in Preview
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2"
              onClick={() => {
                void copyText(commit.hash);
                setMenuOpen(false);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy hash
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2"
              onClick={() => {
                void copyText(commit.message);
                setMenuOpen(false);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy message
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function CommitCardSkeleton() {
  return <div className="h-28 animate-pulse rounded-md border border-border bg-muted/40" />;
}
