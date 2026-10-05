import type { ReactNode } from "react";
import { t, type Locale } from "@/lib/i18n";
import { relativeTime } from "@/lib/relative-time";

type StageCardProps = {
  locale: Locale;
  title: string;
  author: string;
  description?: string;
  timestamp: number;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
  more?: ReactNode;
};

export function StageCard({ locale, title, author, description, timestamp, filesChanged, insertions, deletions, more }: StageCardProps) {
  const copy = t(locale);
  return (
    <div className="flex w-full flex-col gap-0.5">
      <div className="flex w-full flex-col gap-1">
        <div className="flex w-full items-center gap-1">
          <p className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-5 text-[#18181b] dark:text-foreground">{title}</p>
          {more}
        </div>
        <p className="w-full truncate text-[12px] leading-4 text-[#18181b] dark:text-foreground">{author}</p>
      </div>
      {description ? (
        <p className="line-clamp-2 h-8 overflow-hidden text-ellipsis text-[12px] leading-4 text-[#71717a] dark:text-foreground-muted">{description}</p>
      ) : null}
      {filesChanged != null ? (
        <p className="flex gap-1 whitespace-nowrap text-[12px] leading-4">
          <span className="text-[#18181b] dark:text-foreground">{copy.filesChangedCount(filesChanged)}:</span>
          {insertions != null ? <span className="text-[#166534] dark:text-[#4ade80]">+ {insertions}</span> : null}
          {deletions != null ? <span className="text-[#dc2626]">- {deletions}</span> : null}
        </p>
      ) : null}
      <p className="truncate text-[12px] leading-4 text-[#18181b] dark:text-foreground">{relativeTime(timestamp, locale)}</p>
    </div>
  );
}
