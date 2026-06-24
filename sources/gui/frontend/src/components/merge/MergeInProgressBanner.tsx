import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MergeStatusPayload } from "@/wails/forester";

interface MergeInProgressBannerProps {
  status: MergeStatusPayload;
  onReview: () => void;
  onAbort: () => void;
  aborting?: boolean;
}

export function MergeInProgressBanner({
  status,
  onReview,
  onAbort,
  aborting,
}: MergeInProgressBannerProps) {
  const branch = status.branch ?? "branch";
  const conflictHint = status.has_conflicts ? " Resolve conflicts before completing the merge." : "";

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
      <div className="flex min-w-0 items-center gap-2 text-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="truncate">
          Merge in progress ({branch}).{conflictHint}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={onReview}>
          Review merge
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          disabled={aborting}
          onClick={onAbort}
        >
          {aborting ? "Aborting…" : "Abort"}
        </Button>
      </div>
    </div>
  );
}
