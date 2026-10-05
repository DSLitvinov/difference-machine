import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";
import type { ChangeCounts } from "@/lib/status";

type UncommittedFilesCardProps = {
  locale: Locale;
  dirty: boolean;
  counts?: ChangeCounts;
  /** Shown while `index.add` runs before the commit dialog. */
  loading?: boolean;
  onTakeSnapshot: () => void;
};

export function UncommittedFilesCard({ locale, dirty, counts, loading, onTakeSnapshot }: UncommittedFilesCardProps) {
  const copy = t(locale);
  const stats = dirty && counts && counts.append + counts.new + counts.modified + counts.deleted > 0 ? counts : null;
  return (
    <>
      <div className="flex w-full flex-col gap-2 p-4">
        <p className="min-w-0 text-[14px] font-semibold leading-5 text-[#18181b] dark:text-foreground">{copy.workedDirectory}</p>
        {loading ? (
          <p className="truncate text-[12px] leading-4 text-[#71717a] dark:text-foreground-muted">{copy.pleaseWait}</p>
        ) : stats ? (
          <p className="flex gap-1 truncate whitespace-nowrap text-[12px] leading-4">
            {stats.append > 0 ? <span className="text-[#166534] dark:text-[#4ade80]">{stats.append} {copy.append}</span> : null}
            {stats.new > 0 ? <span className="text-[#2563eb]">{stats.new} {copy.newFiles}</span> : null}
            {stats.modified > 0 ? <span className="text-[#f97316]">{stats.modified} {copy.modified}</span> : null}
            {stats.deleted > 0 ? <span className="text-[#dc2626]">{stats.deleted} {copy.deleted}</span> : null}
          </p>
        ) : (
          <p className="truncate text-[12px] leading-4 text-[#71717a] dark:text-foreground-muted">{copy.noChangedFiles}</p>
        )}
      </div>
      {stats || loading ? (
        <div className="w-full border-t border-[#e5e5e5] bg-[linear-gradient(90deg,rgba(255,255,255,0.5),rgba(255,255,255,0.5)),linear-gradient(90deg,#e4e4e7,#e4e4e7)] p-4 dark:border-border dark:bg-background-muted">
          <Button
            type="button"
            disabled={loading || !stats}
            className="w-full"
            onClick={(event) => {
              event.stopPropagation();
              if (!loading && stats) {
                onTakeSnapshot();
              }
            }}
          >
            {loading ? <Icon icon={Loader2} size={16} className="animate-spin" /> : null}
            {copy.takeSnapshot}
          </Button>
        </div>
      ) : null}
    </>
  );
}
