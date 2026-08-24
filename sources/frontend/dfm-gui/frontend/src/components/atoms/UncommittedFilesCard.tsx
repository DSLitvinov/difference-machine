import { t, type Locale } from "@/lib/i18n";
import type { ChangeCounts } from "@/lib/status";
import { cn } from "@/lib/utils";

type UncommittedFilesCardProps = {
  locale: Locale;
  dirty: boolean;
  counts?: ChangeCounts;
  onCommitAll: () => void;
};

export function UncommittedFilesCard({
  locale,
  dirty,
  counts,
  onCommitAll,
}: UncommittedFilesCardProps) {
  const copy = t(locale);
  const stats = dirty && counts && counts.append + counts.new + counts.modified + counts.deleted > 0 ? counts : null;
  return (
    <div className="flex w-full flex-col gap-2">
      <p className={cn("min-w-0 text-[14px] font-semibold leading-5", dirty ? "text-foreground" : "text-foreground-muted")}>
        {copy.uncommittedFiles}
      </p>
      {stats ? (
        <p className="flex gap-1 truncate text-[12px] leading-4">
          {stats.append > 0 ? <span className="text-[#047857]">{stats.append} {copy.append}</span> : null}
          {stats.new > 0 ? <span className="text-[#2563eb]">{stats.new} {copy.newFiles}</span> : null}
          {stats.modified > 0 ? <span className="text-[#f97316]">{stats.modified} {copy.modified}</span> : null}
          {stats.deleted > 0 ? <span className="text-[#ef4444]">{stats.deleted} {copy.deleted}</span> : null}
        </p>
      ) : (
        <p className="truncate text-[12px] leading-4 text-foreground-muted">{copy.noChangedFiles}</p>
      )}
      <button
        type="button"
        disabled={!dirty}
        className={cn(
          "flex h-10 w-full items-center justify-center rounded-md border border-border text-[14px] font-medium leading-5 text-foreground",
          dirty ? "bg-background shadow-sm" : "opacity-50",
        )}
        onClick={(event) => {
          event.stopPropagation();
          if (dirty) {
            onCommitAll();
          }
        }}
      >
        {copy.commitAllFiles}
      </button>
    </div>
  );
}
