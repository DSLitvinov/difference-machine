import { useState } from "react";
import { GitBranch, GitMerge } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CommitCardMenu } from "@/components/sidebar/CommitCardMenu";
import { CommitCardStats } from "@/components/sidebar/CommitCardStats";
import { parseCommitMessage } from "@/lib/commitMessage";
import { formatRelativeTime } from "@/lib/relativeTime";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CommitLogEntry } from "@/wails/forester";

interface CommitCardProps {
  commit: CommitLogEntry;
  selected: boolean;
  focused?: boolean;
  isHead: boolean;
  onSelect: () => void;
  onAfterAction?: () => void | Promise<void>;
}

function commitCardStateClasses(selected: boolean, hovered: boolean, focused: boolean): string {
  if (selected && hovered) return "border-ring bg-accent";
  if (selected) return "border-border bg-accent";
  if (focused) return "border-ring bg-background ring-2 ring-ring ring-offset-2";
  if (hovered) return "border-ring bg-background";
  return "border-border bg-background";
}

export function CommitCard({
  commit,
  selected,
  focused = false,
  isHead,
  onSelect,
  onAfterAction,
}: CommitCardProps) {
  const t = useT();
  const [hovered, setHovered] = useState(false);
  const { title, description } = parseCommitMessage(commit.message);
  const isMerge = (commit.parent_hashes?.length ?? 0) > 1;

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
            <span title={t("preview.branchTip")}>
              <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={title}>
            {title}
          </span>
        </div>
        <p className="text-xs text-foreground">{commit.author}</p>
        {description ? (
          <p className="line-clamp-2 h-8 text-xs text-muted-foreground">
            {t("commit.description")}: {description}
          </p>
        ) : null}
        <CommitCardStats commit={commit} />
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            {formatRelativeTime(commit.timestamp)}
          </Badge>
        </div>
      </div>

      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <CommitCardMenu
          commit={commit}
          isHead={isHead}
          onSelect={onSelect}
          onAfterAction={onAfterAction}
        />
      </div>
    </div>
  );
}

export function CommitCardSkeleton() {
  return <div className="h-28 animate-pulse rounded-md border border-border bg-muted/40" />;
}
