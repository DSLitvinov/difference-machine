import { useEffect, useState } from "react";
import { AlertBanner } from "@/components/ui/alert";
import { mergeHeading } from "@/components/dialogs/MergeDialog";
import { t, type Locale } from "@/lib/i18n";
import type { MergeStatus, StatusSnapshot } from "@/store/app-store";

type RepoStateBannersProps = {
  locale: Locale;
  status: StatusSnapshot | null;
  merge: MergeStatus;
  hideMerge?: boolean;
  onOpenMerge: () => void;
};

export function RepoStateBanners({ locale, status, merge, hideMerge, onOpenMerge }: RepoStateBannersProps) {
  const copy = t(locale);
  const mergeOpen = Boolean(merge.in_progress) && !hideMerge;
  const detached = Boolean(status?.is_detached);
  const incoming = merge.branch ?? "";
  const current = status?.current_branch ?? "";
  const detachedHash = status?.detached_commit ?? "";
  const [dismissedMerge, setDismissedMerge] = useState(false);
  const [dismissedDetached, setDismissedDetached] = useState<string | null>(null);

  useEffect(() => {
    if (!merge.in_progress) {
      setDismissedMerge(false);
    }
  }, [merge.in_progress, merge.branch]);

  useEffect(() => {
    if (!detached) {
      setDismissedDetached(null);
    }
  }, [detached, detachedHash]);

  const showMerge = mergeOpen && !dismissedMerge;
  const showDetached = detached && dismissedDetached !== detachedHash;
  if (!showMerge && !showDetached) {
    return null;
  }

  return (
    <>
      {showMerge ? (
        <AlertBanner
          className="shadow-md"
          variant={merge.has_conflicts ? "destructive" : "warning"}
          title={mergeHeading(current, incoming, locale)}
          description={incoming}
          closeLabel={copy.close}
          onClick={onOpenMerge}
          onClose={() => setDismissedMerge(true)}
        />
      ) : null}
      {showDetached ? (
        <AlertBanner
          className="shadow-md"
          variant="warning"
          title={copy.detachedHead}
          description={detachedHash}
          closeLabel={copy.close}
          onClose={() => setDismissedDetached(detachedHash)}
        />
      ) : null}
    </>
  );
}
