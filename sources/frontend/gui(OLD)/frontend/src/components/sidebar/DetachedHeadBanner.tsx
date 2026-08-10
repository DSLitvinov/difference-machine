import { GitBranch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { shortHash } from "@/lib/format";
import { useT } from "@/lib/i18n";

interface DetachedHeadBannerProps {
  branch: string;
  commitHash: string;
  returning?: boolean;
  onReturnToBranch: () => void;
}

export function DetachedHeadBanner({
  branch,
  commitHash,
  returning,
  onReturnToBranch,
}: DetachedHeadBannerProps) {
  const t = useT();
  const short = shortHash(commitHash);

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs">
      <div className="flex min-w-0 items-center gap-2 text-foreground">
        <GitBranch className="h-4 w-4 shrink-0 text-sky-600" />
        <span className="truncate">
          {t("branch.detachedAt", { hash: short })}
          {branch ? ` (${t("branch.detachedFrom", { branch })})` : ""}
        </span>
      </div>
      {branch ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 shrink-0 px-2 text-xs"
          disabled={returning}
          onClick={onReturnToBranch}
        >
          {returning ? t("common.switchingBranch") : t("branch.returnTo", { branch })}
        </Button>
      ) : null}
    </div>
  );
}
