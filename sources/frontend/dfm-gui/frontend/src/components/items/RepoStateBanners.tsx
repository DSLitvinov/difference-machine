import { AlertBanner } from "@/components/ui/alert";
import { mergeHeading } from "@/components/dialogs/MergeDialog";
import type { MergeStatus, StatusSnapshot } from "@/store/app-store";

type RepoStateBannersProps = {
  status: StatusSnapshot | null;
  merge: MergeStatus;
  onOpenMerge: () => void;
};

export function RepoStateBanners({ status, merge, onOpenMerge }: RepoStateBannersProps) {
  const mergeOpen = Boolean(merge.in_progress);
  const detached = Boolean(status?.is_detached);
  if (!mergeOpen && !detached) {
    return null;
  }
  const incoming = merge.branch ?? "";
  const current = status?.current_branch ?? "";
  const detachedHash = status?.detached_commit ?? "";
  return (
    <div className="flex w-full shrink-0 flex-col gap-2 px-4 pt-4">
      {mergeOpen ? (
        <AlertBanner
          variant={merge.has_conflicts ? "destructive" : "warning"}
          title={mergeHeading(current, incoming)}
          description={incoming}
          onClick={onOpenMerge}
        />
      ) : null}
      {detached ? (
        <AlertBanner variant="warning" title="Detached HEAD" description={detachedHash} />
      ) : null}
    </div>
  );
}
