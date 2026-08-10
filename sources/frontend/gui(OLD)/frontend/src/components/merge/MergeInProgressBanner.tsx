import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
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
  const t = useT();
  const branch = status.branch ?? "branch";
  const conflictHint = status.has_conflicts ? t("merge.resolveConflictsHint") : "";

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
      <div className="flex min-w-0 items-center gap-2 text-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="truncate">
          {t("merge.inProgress", { branch })}
          {conflictHint}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={onReview}>
          {t("merge.review")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          disabled={aborting}
          onClick={onAbort}
        >
          {aborting ? t("merge.aborting") : t("merge.abort")}
        </Button>
      </div>
    </div>
  );
}
